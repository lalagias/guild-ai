"use agent";

import {
  type Task,
  agent,
  errorNotifyEvent,
  pick,
  progressLogNotifyEvent,
  textPromptNotifyEvent,
  userInterfaceTools,
} from "@guildai/agents-sdk";
import { OpenrouterTools } from "@guildai-services/dkountanis~openrouter";
import { z } from "zod";

import description from "./description.md";

declare const Date: { now(): number };

type Preference = "cheapest" | "fastest" | "best-quality" | "balanced";

type TaskType =
  | "code"
  | "reasoning"
  | "creative"
  | "summarization"
  | "translation"
  | "analysis"
  | "general";

interface ModelTier {
  frontier: string[];
  mid: string[];
  budget: string[];
}

const MODEL_TIERS: ModelTier = {
  frontier: [
    "anthropic/claude-sonnet-4",
    "openai/gpt-4.1",
    "google/gemini-2.5-pro-preview",
  ],
  mid: [
    "anthropic/claude-3.5-haiku",
    "openai/gpt-4.1-mini",
    "google/gemini-2.0-flash-001",
  ],
  budget: [
    "meta-llama/llama-4-maverick",
    "mistralai/mistral-small-3.1-24b-instruct",
    "deepseek/deepseek-chat-v3-0324",
  ],
};

const TASK_MODEL_MAP: Record<TaskType, string[]> = {
  code: [
    "anthropic/claude-sonnet-4",
    "openai/gpt-4.1",
    "deepseek/deepseek-chat-v3-0324",
  ],
  reasoning: [
    "openai/gpt-4.1",
    "anthropic/claude-sonnet-4",
    "google/gemini-2.5-pro-preview",
  ],
  creative: [
    "anthropic/claude-sonnet-4",
    "google/gemini-2.5-pro-preview",
    "openai/gpt-4.1",
  ],
  summarization: [
    "openai/gpt-4.1-mini",
    "anthropic/claude-3.5-haiku",
    "google/gemini-2.0-flash-001",
  ],
  translation: [
    "openai/gpt-4.1-mini",
    "google/gemini-2.0-flash-001",
    "anthropic/claude-3.5-haiku",
  ],
  analysis: [
    "openai/gpt-4.1",
    "anthropic/claude-sonnet-4",
    "google/gemini-2.5-pro-preview",
  ],
  general: [
    "openai/gpt-4.1-mini",
    "anthropic/claude-3.5-haiku",
    "google/gemini-2.0-flash-001",
  ],
};

const inputSchema = z.object({
  type: z.literal("text"),
  text: z
    .string()
    .describe(
      "A prompt to route to the optimal model. Optionally prefix with 'preference: cheapest|fastest|best-quality|balanced |' to set routing preference."
    ),
});
type Input = z.infer<typeof inputSchema>;

const outputSchema = z.object({
  type: z.literal("text"),
  text: z
    .string()
    .describe(
      "The completion result plus routing metadata: model chosen, task type, cost, and rationale."
    ),
});
type Output = z.infer<typeof outputSchema>;

const tools = {
  ...pick(OpenrouterTools, [
    "openrouter_send_chat_completion_request",
    "openrouter_get_models",
  ]),
  ...pick(userInterfaceTools, ["ui_notify"]),
};
type Tools = typeof tools;

interface ParsedInput {
  prompt: string;
  preference: Preference;
}

function parseInput(text: string): ParsedInput {
  let prompt = text;
  let preference: Preference = "balanced";

  const prefMatch = prompt.match(
    /^preference:\s*(cheapest|fastest|best-quality|balanced)\s*\|\s*/i
  );
  if (prefMatch) {
    preference = prefMatch[1].toLowerCase() as Preference;
    prompt = prompt.slice(prefMatch[0].length).trim();
  }

  return { prompt, preference };
}

function classifyTask(text: string): TaskType {
  const lower = text.toLowerCase();

  if (
    lower.match(
      /\b(code|function|class|implement|refactor|debug|fix bug|write a .*(script|program|module)|typescript|python|javascript|golang|rust|java|sql|api|endpoint|regex|algorithm)\b/
    )
  ) {
    return "code";
  }

  if (
    lower.match(
      /\b(summarize|summary|tldr|tl;dr|condense|brief|key points|main points|overview of)\b/
    )
  ) {
    return "summarization";
  }

  if (
    lower.match(
      /\b(translate|translation|in spanish|in french|in german|in japanese|in chinese|in portuguese|in italian|in korean|to english)\b/
    )
  ) {
    return "translation";
  }

  if (
    lower.match(
      /\b(write a (story|poem|essay|blog|article|creative)|creative writing|brainstorm|imagine|fiction|narrative)\b/
    )
  ) {
    return "creative";
  }

  if (
    lower.match(
      /\b(reason|explain why|prove|logic|step by step|think through|derive|mathematical|theorem|calculate|solve)\b/
    )
  ) {
    return "reasoning";
  }

  if (
    lower.match(
      /\b(analyze|analysis|compare|evaluate|assess|review|audit|investigate|examine|diagnose)\b/
    )
  ) {
    return "analysis";
  }

  return "general";
}

function selectModel(
  taskType: TaskType,
  preference: Preference,
  availableModels: Set<string>
): { model: string; rationale: string; alternatives: string[] } {
  let candidates: string[];

  switch (preference) {
    case "cheapest":
      candidates = [
        ...MODEL_TIERS.budget,
        ...MODEL_TIERS.mid,
        ...MODEL_TIERS.frontier,
      ];
      break;
    case "fastest":
      candidates = [
        ...MODEL_TIERS.mid,
        ...MODEL_TIERS.budget,
        ...MODEL_TIERS.frontier,
      ];
      break;
    case "best-quality":
      candidates = TASK_MODEL_MAP[taskType];
      break;
    case "balanced":
    default: {
      const taskBest = TASK_MODEL_MAP[taskType];
      const midModels = MODEL_TIERS.mid;
      candidates = [...midModels, ...taskBest, ...MODEL_TIERS.budget];
      break;
    }
  }

  // Deduplicate while preserving order
  const seen = new Set<string>();
  const deduped: string[] = [];
  for (const c of candidates) {
    if (!seen.has(c)) {
      seen.add(c);
      deduped.push(c);
    }
  }

  // Pick the first model that is available on OpenRouter
  let selected = deduped[0];
  for (const c of deduped) {
    if (availableModels.size === 0 || availableModels.has(c)) {
      selected = c;
      break;
    }
  }

  const tierLabel = MODEL_TIERS.frontier.includes(selected)
    ? "frontier"
    : MODEL_TIERS.mid.includes(selected)
      ? "mid-tier"
      : "budget";

  const rationale =
    "Task type: " +
    taskType +
    ". Preference: " +
    preference +
    ". Selected " +
    tierLabel +
    " model " +
    selected +
    ".";

  const alternatives = deduped.filter((m) => m !== selected).slice(0, 3);

  return { model: selected, rationale, alternatives };
}

async function run(input: Input, task: Task<Tools>): Promise<Output> {
  const runtimeTools = (task as any).tools as any;
  const parsed = parseInput(input.text);

  await runtimeTools.ui_notify(
    progressLogNotifyEvent(
      "Classifying task and selecting model (preference: " +
        parsed.preference +
        ")..."
    )
  );

  const taskType = classifyTask(parsed.prompt);

  // Fetch available models to validate our selection
  const availableModels = new Set<string>();
  try {
    const modelsResult = await runtimeTools.openrouter_get_models({});
    const data = modelsResult.data || modelsResult || [];
    if (Array.isArray(data)) {
      for (const m of data) {
        if (m.id) availableModels.add(m.id);
      }
    }
  } catch (_e) {
    // Fall back to hardcoded tiers if model list fetch fails
  }

  const selection = selectModel(taskType, parsed.preference, availableModels);

  await runtimeTools.ui_notify(
    progressLogNotifyEvent(
      "Task: " +
        taskType +
        " -> Model: " +
        selection.model +
        ". Running completion..."
    )
  );

  let completionText = "";
  let promptTokens = 0;
  let completionTokens = 0;
  let cost: number | null = null;
  let latency: number | null = null;

  try {
    const startMs = Date.now();
    const completion = await runtimeTools.openrouter_send_chat_completion_request({
      model: selection.model,
      messages: [{ role: "user", content: parsed.prompt }],
      stream: false,
    });
    latency = Date.now() - startMs;

    const choice = completion.choices?.[0];
    completionText = choice?.message?.content || "(no output)";
    const usage = completion.usage || {};
    promptTokens = usage.prompt_tokens || 0;
    completionTokens = usage.completion_tokens || 0;
    cost = usage.cost ?? null;
  } catch (e: any) {
    await runtimeTools.ui_notify(
      errorNotifyEvent(
        "Completion failed on " +
          selection.model +
          ": " +
          (e.message || "unknown")
      )
    );
    return {
      type: "text",
      text:
        "## Routing Failed\n\n" +
        "Model: " +
        selection.model +
        "\n" +
        "Error: " +
        (e.message || "unknown") +
        "\n\n" +
        "Alternatives to try: " +
        selection.alternatives.join(", "),
    };
  }

  const parts: string[] = [];
  parts.push("## Completion Result");
  parts.push("");
  parts.push(completionText);
  parts.push("");
  parts.push("---");
  parts.push("");
  parts.push("## Routing Metadata");
  parts.push("");
  parts.push("| Field | Value |");
  parts.push("| --- | --- |");
  parts.push("| **Model** | " + selection.model + " |");
  parts.push("| **Task type** | " + taskType + " |");
  parts.push("| **Preference** | " + parsed.preference + " |");
  parts.push(
    "| **Tokens** | " + promptTokens + " in / " + completionTokens + " out |"
  );
  parts.push(
    "| **Cost** | " + (cost != null ? "$" + cost.toFixed(6) : "n/a") + " |"
  );
  parts.push(
    "| **Latency** | " +
      (latency != null ? latency + "ms" : "n/a") +
      " |"
  );
  parts.push(
    "| **Alternatives** | " + selection.alternatives.join(", ") + " |"
  );
  parts.push("");
  parts.push("**Rationale**: " + selection.rationale);

  const summary = parts.join("\n");

  await runtimeTools.ui_notify(
    textPromptNotifyEvent({ type: "text", text: summary })
  );

  return { type: "text", text: summary };
}

export default agent({
  identifier: "prompt-router",
  description,
  inputSchema,
  outputSchema,
  tools,
  run,
});
