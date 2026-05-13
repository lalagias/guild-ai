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
import { CursorCloudAgentsTools } from "@guildai-services/dkountanis~cursor-cloud-agents";
import { z } from "zod";

import description from "./description.md";

declare function setTimeout(callback: (...args: any[]) => void, ms: number): unknown;

const inputSchema = z.object({
  type: z.literal("text"),
  text: z
    .string()
    .describe(
      "A GitHub repository URL and task description."
    ),
});
type Input = z.infer<typeof inputSchema>;

const outputSchema = z.object({
  type: z.literal("text"),
  text: z
    .string()
    .describe(
      "Result of the Cursor cloud agent run including status, branch/PR info, and dashboard URL."
    ),
});
type Output = z.infer<typeof outputSchema>;

const tools = {
  ...CursorCloudAgentsTools,
  ...pick(userInterfaceTools, ["ui_notify"]),
};
type Tools = typeof tools;

function extractRepo(text: string): string {
  const urlMatch = text.match(
    /https?:\/\/github\.com\/[a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+/
  );
  if (!urlMatch) {
    throw new Error(
      "Could not find a GitHub repository URL in the input."
    );
  }
  return urlMatch[0].replace(/\.git$/, "");
}

function extractTask(text: string, repo: string): string {
  const cleaned = text.replace(repo, "").trim();
  if (cleaned.length === 0) {
    return "Analyze and improve this repository.";
  }
  return cleaned;
}

async function run(input: Input, task: Task<Tools>): Promise<Output> {
  const runtimeTools = (task as any).tools as any;
  const repo = extractRepo(input.text);
  const taskDesc = extractTask(input.text, repo);

  const prompt =
    "You are a coding agent dispatched by Guild.ai.\n\n" +
    "Repository: " + repo + "\n" +
    "Task: " + taskDesc + "\n\n" +
    "Instructions:\n" +
    "1. Read and understand the relevant parts of the codebase.\n" +
    "2. Implement the requested changes carefully.\n" +
    "3. Run any available tests or linters to verify your changes.\n" +
    "4. Keep changes minimal and focused.\n" +
    "5. Write clear commit messages.\n";

  await runtimeTools.ui_notify(
    progressLogNotifyEvent("Dispatching Cursor cloud agent for " + repo + "...")
  );

  const createResult = await runtimeTools.cursor_cloud_agents_create_agent({
    prompt: { text: prompt },
    model: { id: "composer-2" },
    repos: [{ url: repo, startingRef: "main" }],
    autoCreatePR: true,
  });

  const agentId = createResult.agent.id;
  const runId = createResult.run.id;
  const agentUrl = createResult.agent.url;

  const creationMessage =
    "**Cursor cloud agent dispatched**\n\n" +
    "- Task: " + taskDesc + "\n" +
    "- Repository: " + repo + "\n" +
    "- Model: composer-2\n" +
    "- Agent ID: `" + agentId + "`\n" +
    "- Run ID: `" + runId + "`\n" +
    "- Dashboard: " + agentUrl + "\n\n" +
    "_Polling for status. This usually takes 5-15 minutes._";

  await runtimeTools.ui_notify(
    textPromptNotifyEvent({ type: "text", text: creationMessage })
  );

  const parts: string[] = [];
  parts.push("## Cursor Cloud Agent Result");
  parts.push("");
  parts.push("- **Agent ID**: " + agentId);
  parts.push("- **Run ID**: " + runId);
  parts.push("- **Repository**: " + repo);
  parts.push("- **Model**: composer-2");
  parts.push("- **Dashboard**: " + agentUrl);
  parts.push("");

  let status = createResult.run.status;
  let lastReportedStatus = status;
  let pollingFailed = false;

  await runtimeTools.ui_notify(
    progressLogNotifyEvent("Cursor agent status: " + status + " (provisioning VM)...")
  );

  try {
    let attempts = 0;
    const pollIntervalMs = 15000;
    const maxAttempts = 80;

    while (
      (status === "CREATING" || status === "RUNNING") &&
      attempts < maxAttempts
    ) {
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
      attempts = attempts + 1;

      const runResult = await runtimeTools.cursor_cloud_agents_get_run({
        id: agentId,
        runId: runId,
      });
      status = runResult.status;

      if (status !== lastReportedStatus) {
        await runtimeTools.ui_notify(
          progressLogNotifyEvent("Cursor agent status: " + status)
        );
        lastReportedStatus = status;
      } else if (attempts % 4 === 0) {
        const elapsedMin = Math.floor((attempts * pollIntervalMs) / 60000);
        await runtimeTools.ui_notify(
          progressLogNotifyEvent(
            "Cursor agent still " + status.toLowerCase() + " (" + elapsedMin + " min elapsed)..."
          )
        );
      }
    }

    parts.push("- **Final Status**: " + status);

    if (attempts >= maxAttempts) {
      parts.push("- **Note**: Polling timed out after 20 minutes. The agent may still be running.");
      await runtimeTools.ui_notify(
        textPromptNotifyEvent({
          type: "text",
          text: "Polling timed out after 20 minutes. The Cursor agent may still be running. Check: " + agentUrl,
        })
      );
    } else {
      const finalMessage =
        status === "FINISHED"
          ? "Cursor agent finished successfully. View result: " + agentUrl
          : "Cursor agent ended with status `" + status + "`. View details: " + agentUrl;
      await runtimeTools.ui_notify(
        textPromptNotifyEvent({ type: "text", text: finalMessage })
      );
    }

    try {
      const agentInfo = await runtimeTools.cursor_cloud_agents_get_agent({
        id: agentId,
      });
      if (agentInfo.branchName) {
        parts.push("- **Branch**: " + agentInfo.branchName);
      }
    } catch (_e) {
      parts.push("- **Note**: Could not fetch final agent details.");
    }
  } catch (_pollError) {
    pollingFailed = true;
    parts.push("- **Status**: " + status + " (polling interrupted)");
    parts.push("");
    parts.push("### Polling failed -- agent is still running");
    parts.push("");
    parts.push("The Cursor cloud agent was created successfully but status polling");
    parts.push("encountered an error. The agent continues to work in its cloud VM.");

    await runtimeTools.ui_notify(
      errorNotifyEvent(
        "Polling interrupted. Cursor agent is still running. Check: " + agentUrl
      )
    );
  }

  parts.push("");
  parts.push("### " + (pollingFailed ? "Check progress" : "View details"));
  parts.push("");
  parts.push("Watch the agent: " + agentUrl);

  if (pollingFailed) {
    parts.push("");
    parts.push("To check status manually, call `cursor_cloud_agents_get_run`");
    parts.push("with agent ID `" + agentId + "` and run ID `" + runId + "`.");
  }

  return { type: "text", text: parts.join("\n") };
}

export default agent({
  identifier: "cursor-cloud-coder",
  description,
  inputSchema,
  outputSchema,
  tools,
  run,
});
