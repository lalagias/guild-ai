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
import { OpenaiApiTools } from "@guildai-services/dkountanis~openai-api";
import { z } from "zod";

import description from "./description.md";

declare function setTimeout(callback: (...args: any[]) => void, ms: number): unknown;

const inputSchema = z.object({
  type: z.literal("text"),
  text: z
    .string()
    .describe(
      "A research query or topic to investigate using web search."
    ),
});
type Input = z.infer<typeof inputSchema>;

const outputSchema = z.object({
  type: z.literal("text"),
  text: z
    .string()
    .describe(
      "Research findings with citations and sources from web search."
    ),
});
type Output = z.infer<typeof outputSchema>;

const tools = {
  ...OpenaiApiTools,
  ...pick(userInterfaceTools, ["ui_notify"]),
};
type Tools = typeof tools;

async function run(input: Input, task: Task<Tools>): Promise<Output> {
  const runtimeTools = (task as any).tools as any;
  const query = input.text.trim();

  if (!query) {
    throw new Error("Research query cannot be empty.");
  }

  const systemPrompt =
    "You are a research assistant. Search the web thoroughly and provide a well-organized summary " +
    "with citations. Include URLs for all sources. Be comprehensive but concise.";

  await runtimeTools.ui_notify(
    progressLogNotifyEvent("Starting web research for: " + query.substring(0, 50) + "...")
  );

  const createResult = await runtimeTools.openai_api_openai_responses_create({
    model: "gpt-4o",
    input: query,
    instructions: systemPrompt,
    tools: [
      {
        type: "web_search",
        search_context_size: "high",
      },
    ],
  });

  const responseId = createResult.id;
  let status = createResult.status;

  const creationMessage =
    "**OpenAI web research started**\n\n" +
    "- Query: " + query + "\n" +
    "- Response ID: `" + responseId + "`\n" +
    "- Model: gpt-4o\n\n" +
    "_Polling for completion..._";

  await runtimeTools.ui_notify(
    textPromptNotifyEvent({ type: "text", text: creationMessage })
  );

  const parts: string[] = [];
  parts.push("## Web Research Results");
  parts.push("");
  parts.push("- **Query**: " + query);
  parts.push("- **Response ID**: " + responseId);
  parts.push("- **Model**: gpt-4o");
  parts.push("");

  let pollingFailed = false;
  let finalOutput = "";

  function extractOutput(output: any[]): string {
    for (const item of output) {
      if (item.type === "message" && item.content) {
        for (const content of item.content) {
          if (content.type === "output_text" && content.text) {
            return content.text;
          }
        }
      }
    }
    return "";
  }

  try {
    let attempts = 0;
    const pollIntervalMs = 3000;
    const maxAttempts = 60;

    if (status === "completed" && createResult.output) {
      finalOutput = extractOutput(createResult.output);
    }

    while (
      status === "in_progress" &&
      attempts < maxAttempts
    ) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      attempts = attempts + 1;

      const getResult = await runtimeTools.openai_api_openai_responses_get({
        response_id: responseId,
      });
      status = getResult.status;

      if (attempts % 5 === 0) {
        const elapsedSec = Math.floor((attempts * pollIntervalMs) / 1000);
        await runtimeTools.ui_notify(
          progressLogNotifyEvent(
            "Research in progress (" + elapsedSec + "s elapsed)..."
          )
        );
      }

      if (status === "completed" && getResult.output) {
        finalOutput = extractOutput(getResult.output);
      }
    }

    parts.push("- **Status**: " + status);

    if (attempts >= maxAttempts) {
      parts.push("- **Note**: Polling timed out after 3 minutes.");
      await runtimeTools.ui_notify(
        textPromptNotifyEvent({
          type: "text",
          text: "Research timed out. Response ID: " + responseId,
        })
      );
    } else if (status === "completed") {
      await runtimeTools.ui_notify(
        textPromptNotifyEvent({
          type: "text",
          text: "Research completed successfully.",
        })
      );
    } else {
      await runtimeTools.ui_notify(
        textPromptNotifyEvent({
          type: "text",
          text: "Research ended with status: " + status,
        })
      );
    }
  } catch (_pollError) {
    pollingFailed = true;
    parts.push("- **Status**: " + status + " (polling interrupted)");
    parts.push("");
    parts.push("### Polling failed");
    parts.push("");
    parts.push("The research request was created but status polling encountered an error.");

    await runtimeTools.ui_notify(
      errorNotifyEvent(
        "Polling interrupted. Response ID: " + responseId
      )
    );
  }

  parts.push("");

  if (finalOutput) {
    parts.push("### Research Findings");
    parts.push("");
    parts.push(finalOutput);
  } else if (!pollingFailed && status === "completed") {
    parts.push("### Note");
    parts.push("");
    parts.push("Research completed but no text output was extracted. Response ID: " + responseId);
  }

  const finalText = parts.join("\n");

  await runtimeTools.ui_notify(
    textPromptNotifyEvent({ type: "text", text: finalText })
  );

  return { type: "text", text: finalText };
}

export default agent({
  identifier: "openai-web-researcher",
  description,
  inputSchema,
  outputSchema,
  tools,
  run,
});
