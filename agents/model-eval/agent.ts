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

const DEFAULT_MODELS = [
  "openai/gpt-4.1",
  "anthropic/claude-sonnet-4",
  "google/gemini-2.5-pro-preview",
  "meta-llama/llama-4-maverick",
  "mistralai/mistral-medium-3",
];

const inputSchema = z.object({
  type: z.literal("text"),
  text: z
    .string()
    .describe(
      "A prompt to evaluate across models. Optionally prefix with 'models: model1, model2 |' to specify models, and/or suffix with '| criteria: ...' to add evaluation criteria."
    ),
});
type Input = z.infer<typeof inputSchema>;

const outputSchema = z.object({
  type: z.literal("text"),
  text: z
    .string()
    .describe(
      "Structured comparison of model outputs with cost, token usage, and recommendation."
    ),
});
type Output = z.infer<typeof outputSchema>;

declare const Date: { now(): number };

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
  models: string[];
  criteria: string | null;
}

function parseInput(text: string): ParsedInput {
  let prompt = text;
  let models: string[] = [];
  let criteria: string | null = null;

  const criteriaMatch = prompt.match(/\|\s*criteria:\s*(.+)$/i);
  if (criteriaMatch) {
    criteria = criteriaMatch[1].trim();
    prompt = prompt.slice(0, criteriaMatch.index).trim();
  }

  const modelsMatch = prompt.match(/^models:\s*(.+?)\s*\|\s*/i);
  if (modelsMatch) {
    models = modelsMatch[1]
      .split(",")
      .map((m) => m.trim())
      .filter((m) => m.length > 0);
    prompt = prompt.slice(modelsMatch[0].length).trim();
  }

  if (models.length === 0) {
    models = [...DEFAULT_MODELS];
  }

  return { prompt, models, criteria };
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

interface ModelResult {
  model: string;
  output: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number | null;
  latency: number | null;
  error: string | null;
}

async function run(input: Input, task: Task<Tools>): Promise<Output> {
  const runtimeTools = (task as any).tools as any;
  const parsed = parseInput(input.text);

  await runtimeTools.ui_notify(
    progressLogNotifyEvent(
      "Evaluating " +
        parsed.models.length +
        " models: " +
        parsed.models.join(", ")
    )
  );

  const results: ModelResult[] = [];

  for (const model of parsed.models) {
    await runtimeTools.ui_notify(
      progressLogNotifyEvent("Running completion on " + model + "...")
    );

    try {
      const startMs = Date.now();
      const completion = await runtimeTools.openrouter_send_chat_completion_request({
        model: model,
        messages: [{ role: "user", content: parsed.prompt }],
        stream: false,
        max_tokens: 1024,
      });
      const elapsedMs = Date.now() - startMs;

      const choice = completion.choices?.[0];
      const output = choice?.message?.content || "(no output)";
      const usage = completion.usage || {};

      const cost: number | null = usage.cost ?? null;

      results.push({
        model,
        output,
        promptTokens: usage.prompt_tokens || 0,
        completionTokens: usage.completion_tokens || 0,
        totalTokens: usage.total_tokens || 0,
        cost,
        latency: elapsedMs,
        error: null,
      });
    } catch (e: any) {
      results.push({
        model,
        output: "",
        promptTokens: 0,
        completionTokens: 0,
        totalTokens: 0,
        cost: null,
        latency: null,
        error: e.message || "Unknown error",
      });

      await runtimeTools.ui_notify(
        errorNotifyEvent("Failed on " + model + ": " + (e.message || "unknown"))
      );
    }
  }

  await runtimeTools.ui_notify(
    progressLogNotifyEvent("All completions finished. Building comparison...")
  );

  const parts: string[] = [];
  parts.push("## Model Evaluation Results");
  parts.push("");
  parts.push("**Prompt**: " + truncate(parsed.prompt, 200));
  if (parsed.criteria) {
    parts.push("**Criteria**: " + parsed.criteria);
  }
  parts.push("");

  // Comparison table
  parts.push("### Comparison");
  parts.push("");
  parts.push(
    "| Model | Tokens (in/out) | Cost | Latency | Status |"
  );
  parts.push("| --- | --- | --- | --- | --- |");

  for (const r of results) {
    if (r.error) {
      parts.push(
        "| " + r.model + " | - | - | - | Error: " + truncate(r.error, 60) + " |"
      );
    } else {
      const tokens = r.promptTokens + "/" + r.completionTokens;
      const costStr = r.cost != null ? "$" + r.cost.toFixed(6) : "n/a";
      const latStr = r.latency != null ? r.latency + "ms" : "n/a";
      parts.push(
        "| " + r.model + " | " + tokens + " | " + costStr + " | " + latStr + " | OK |"
      );
    }
  }

  // Individual outputs
  parts.push("");
  parts.push("### Outputs");

  for (const r of results) {
    parts.push("");
    parts.push("#### " + r.model);
    if (r.error) {
      parts.push("_Error: " + r.error + "_");
    } else {
      parts.push("");
      parts.push(truncate(r.output, 1500));
    }
  }

  // Recommendation
  const successful = results.filter((r) => !r.error);
  if (successful.length > 0) {
    parts.push("");
    parts.push("### Recommendation");
    parts.push("");

    const cheapest = successful.reduce((a, b) => {
      if (a.cost == null) return b;
      if (b.cost == null) return a;
      return a.cost < b.cost ? a : b;
    });

    const fastest = successful.reduce((a, b) => {
      if (a.latency == null) return b;
      if (b.latency == null) return a;
      return a.latency < b.latency ? a : b;
    });

    const longestOutput = successful.reduce((a, b) =>
      a.output.length > b.output.length ? a : b
    );

    parts.push("- **Cheapest**: " + cheapest.model +
      (cheapest.cost != null ? " ($" + cheapest.cost.toFixed(6) + ")" : ""));
    parts.push("- **Fastest**: " + fastest.model +
      (fastest.latency != null ? " (" + fastest.latency + "ms)" : ""));
    parts.push("- **Most detailed output**: " + longestOutput.model +
      " (" + longestOutput.output.length + " chars)");
  }

  const summary = parts.join("\n");

  await runtimeTools.ui_notify(
    textPromptNotifyEvent({ type: "text", text: summary })
  );

  return { type: "text", text: summary };
}

export default agent({
  identifier: "model-eval",
  description,
  inputSchema,
  outputSchema,
  tools,
  run,
});
