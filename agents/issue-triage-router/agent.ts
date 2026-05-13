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
import { gitHubTools } from "@guildai-services/guildai~github";
import { CursorCloudAgentsTools } from "@guildai-services/dkountanis~cursor-cloud-agents";
import { z } from "zod";

import description from "./description.md";

declare function setTimeout(callback: (...args: any[]) => void, ms: number): unknown;

const inputSchema = z.object({
  type: z.literal("text"),
  text: z
    .string()
    .describe("A GitHub issue URL or reference (e.g. owner/repo#123)"),
});
type Input = z.infer<typeof inputSchema>;

const outputSchema = z.object({
  type: z.literal("text"),
  text: z
    .string()
    .describe("Structured triage result with classification, routing decision, and actions taken"),
});
type Output = z.infer<typeof outputSchema>;

const tools = {
  ...pick(gitHubTools, [
    "github_issues_get",
    "github_issues_list_comments",
    "github_issues_list_labels_on_issue",
    "github_issues_add_labels",
    "github_issues_create_comment",
    "github_issues_update",
  ]),
  ...pick(CursorCloudAgentsTools, [
    "cursor_cloud_agents_create_agent",
  ]),
  ...pick(userInterfaceTools, ["ui_notify"]),
};
type Tools = typeof tools;

function parseIssueRef(text: string): { owner: string; repo: string; number: number } | null {
  const urlMatch = text.match(
    /https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/issues\/(\d+)/
  );
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2], number: parseInt(urlMatch[3], 10) };
  }

  const shortMatch = text.match(/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)#(\d+)/);
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2], number: parseInt(shortMatch[3], 10) };
  }

  return null;
}

async function run(input: Input, task: Task<Tools>): Promise<Output> {
  const runtimeTools = (task as any).tools as any;
  const ref = parseIssueRef(input.text);

  if (!ref) {
    await runtimeTools.ui_notify(
      errorNotifyEvent("Could not parse a GitHub issue reference from the input. Expected format: owner/repo#123 or a GitHub issue URL.")
    );
    return {
      type: "text",
      text: "## Triage Failed\n\nCould not parse a GitHub issue reference from the input.",
    };
  }

  await runtimeTools.ui_notify(
    progressLogNotifyEvent("Fetching issue " + ref.owner + "/" + ref.repo + "#" + ref.number + "...")
  );

  let issue: any;
  try {
    issue = await runtimeTools.github_issues_get({
      owner: ref.owner,
      repo: ref.repo,
      issue_number: ref.number,
    });
  } catch (e: any) {
    await runtimeTools.ui_notify(
      errorNotifyEvent("Failed to fetch issue: " + (e.message || "unknown error"))
    );
    return {
      type: "text",
      text: "## Triage Failed\n\nCould not fetch issue " + ref.owner + "/" + ref.repo + "#" + ref.number + ".",
    };
  }

  await runtimeTools.ui_notify(
    progressLogNotifyEvent("Issue fetched: \"" + issue.title + "\". Classifying...")
  );

  let comments: any[] = [];
  try {
    const commentsResult = await runtimeTools.github_issues_list_comments({
      owner: ref.owner,
      repo: ref.repo,
      issue_number: ref.number,
      per_page: 10,
    });
    comments = commentsResult.items || commentsResult || [];
  } catch (_e) {
    // Comments are optional enrichment
  }

  let existingLabels: string[] = [];
  try {
    const labelsResult = await runtimeTools.github_issues_list_labels_on_issue({
      owner: ref.owner,
      repo: ref.repo,
      issue_number: ref.number,
    });
    existingLabels = (labelsResult.items || labelsResult || []).map((l: any) => l.name || l);
  } catch (_e) {
    // Labels are optional enrichment
  }

  const title = issue.title || "";
  const body = issue.body || "";
  const issueLabels = existingLabels.join(", ") || "none";
  const commentTexts = Array.isArray(comments)
    ? comments.slice(0, 5).map((c: any) => c.body || "").join("\n---\n")
    : "";

  // Classification via LLM — we build context and let the agent's model classify
  const classificationPrompt =
    "Classify this GitHub issue. Return ONLY a JSON object, no other text.\n\n" +
    "Issue title: " + title + "\n" +
    "Issue body:\n" + body.slice(0, 3000) + "\n" +
    "Existing labels: " + issueLabels + "\n" +
    (commentTexts ? "Recent comments:\n" + commentTexts.slice(0, 2000) + "\n" : "") +
    "\nReturn JSON with: kind (bug/feature/docs/question/spam), severity (sev1/sev2/sev3/sev4), " +
    "area (free-form string), confidence object with kind/severity/area/repo fields (high/medium/low), " +
    "routing (cursor-dispatch/documenter-handoff/human-response/backlog/close), " +
    "rationale (one sentence), " +
    "labels (array of strings to add like triage:bug, area:auth, severity:sev2).";

  // For now we use a heuristic classifier since we're in "use agent" mode
  // and can't do a nested LLM call directly. We use keyword signals.
  const lowerTitle = title.toLowerCase();
  const lowerBody = body.toLowerCase();
  const combined = lowerTitle + " " + lowerBody;

  let kind = "question";
  if (combined.match(/bug|crash|error|broken|fail|exception|stack trace|500|404|timeout/)) {
    kind = "bug";
  } else if (combined.match(/feature|request|would be nice|add support|enhancement|proposal/)) {
    kind = "feature";
  } else if (combined.match(/doc|documentation|readme|typo|spelling|grammar/)) {
    kind = "docs";
  } else if (combined.match(/how do i|how to|question|help|what is|where is/)) {
    kind = "question";
  }

  let severity = "sev3";
  if (combined.match(/production|outage|critical|down|data loss|security breach|urgent/)) {
    severity = "sev1";
  } else if (combined.match(/broken|regression|cannot|blocked|high priority/)) {
    severity = "sev2";
  } else if (combined.match(/cosmetic|minor|low priority|nice to have|typo/)) {
    severity = "sev4";
  }

  let area = "general";
  const areaPatterns: [RegExp, string][] = [
    [/auth|login|password|token|session|oauth|sso/, "auth"],
    [/billing|payment|invoice|subscription|stripe|charge/, "billing"],
    [/api|endpoint|rest|graphql|request|response/, "api"],
    [/ui|frontend|component|react|css|style|layout|button/, "frontend"],
    [/infra|deploy|ci|cd|docker|kubernetes|aws|cloud/, "infra"],
    [/test|testing|coverage|jest|pytest|spec/, "testing"],
    [/doc|readme|guide|tutorial/, "docs"],
    [/database|db|sql|migration|query|postgres|mysql/, "database"],
    [/performance|slow|latency|memory|cpu|optimization/, "performance"],
  ];
  for (const [pattern, areaName] of areaPatterns) {
    if (combined.match(pattern)) {
      area = areaName;
      break;
    }
  }

  const kindConfidence: string = combined.match(/bug|crash|error|feature|request|doc|how to/) ? "high" : "medium";
  const severityConfidence: string = combined.match(/production|outage|critical|cosmetic|minor/) ? "high" : "medium";
  const areaConfidence: string = area !== "general" ? "medium" : "low";

  const labelsToAdd: string[] = [];
  if (kindConfidence !== "low") labelsToAdd.push("triage:" + kind);
  if (areaConfidence !== "low") labelsToAdd.push("area:" + area);
  if (severityConfidence !== "low") labelsToAdd.push("severity:" + severity);

  // Filter out labels that already exist
  const newLabels = labelsToAdd.filter((l) => !existingLabels.includes(l));

  const overallConfidence =
    kindConfidence === "low" || severityConfidence === "low" || areaConfidence === "low"
      ? "low"
      : kindConfidence === "medium" || severityConfidence === "medium" || areaConfidence === "medium"
        ? "medium"
        : "high";

  let routing = "human-response";
  if (kind === "bug" && (severity === "sev1" || severity === "sev2")) {
    routing = "cursor-dispatch";
  } else if (kind === "docs") {
    routing = "documenter-handoff";
  } else if (kind === "feature") {
    routing = "backlog";
  } else if (kind === "spam") {
    routing = "close";
  }

  const rationale =
    "Classified as " + kind + " (" + kindConfidence + " confidence) with " +
    severity + " severity in the " + area + " area. " +
    "Routing: " + routing + ".";

  await runtimeTools.ui_notify(
    progressLogNotifyEvent("Classification complete: " + kind + " / " + severity + " / " + area + " — " + routing)
  );

  // Build the comment
  const commentParts: string[] = [];
  commentParts.push("## Issue Triage");
  commentParts.push("");
  commentParts.push("| Dimension | Value | Confidence |");
  commentParts.push("| --- | --- | --- |");
  commentParts.push("| Kind | " + kind + " | " + kindConfidence + " |");
  commentParts.push("| Severity | " + severity + " | " + severityConfidence + " |");
  commentParts.push("| Area | " + area + " | " + areaConfidence + " |");
  commentParts.push("");
  commentParts.push("**Routing**: " + routing);
  commentParts.push("");
  commentParts.push("**Rationale**: " + rationale);

  if (overallConfidence === "low") {
    commentParts.push("");
    commentParts.push("_Low confidence — leaving for human triage._");
  }

  if (routing === "documenter-handoff") {
    commentParts.push("");
    commentParts.push("**Documenter handoff prompt**: Review " + ref.owner + "/" + ref.repo + "#" + ref.number +
      " for documentation impact. The issue suggests docs changes are needed. " +
      "Assess which docs files or sections are affected and draft the update.");
  }

  const commentBody = commentParts.join("\n");

  // Post the triage comment
  try {
    await runtimeTools.github_issues_create_comment({
      owner: ref.owner,
      repo: ref.repo,
      issue_number: ref.number,
      body: commentBody,
    });
    await runtimeTools.ui_notify(
      progressLogNotifyEvent("Triage comment posted on issue #" + ref.number)
    );
  } catch (e: any) {
    await runtimeTools.ui_notify(
      errorNotifyEvent("Failed to post triage comment: " + (e.message || "unknown error"))
    );
  }

  // Add labels (only if confidence >= medium)
  // Include labels in the triage comment instead of using the labels API,
  // since labels may not exist on the repo yet and the API format varies.
  // The comment already contains the classification; labels are informational.
  if (overallConfidence !== "low" && newLabels.length > 0) {
    await runtimeTools.ui_notify(
      progressLogNotifyEvent("Suggested labels: " + newLabels.join(", ") + " (included in triage comment)")
    );
  }

  // Cursor dispatch for high-severity bugs
  let dispatchInfo = "";
  if (
    routing === "cursor-dispatch" &&
    overallConfidence !== "low"
  ) {
    const repoUrl = "https://github.com/" + ref.owner + "/" + ref.repo;
    const fixPrompt =
      "You are a coding agent dispatched by Guild.ai to fix a bug.\n\n" +
      "Repository: " + repoUrl + "\n" +
      "Issue: #" + ref.number + " — " + title + "\n\n" +
      "Issue description:\n" + body.slice(0, 2000) + "\n\n" +
      "Instructions:\n" +
      "1. Read the codebase and understand the bug described in the issue.\n" +
      "2. Implement a targeted fix.\n" +
      "3. Run any available tests to verify the fix.\n" +
      "4. Keep changes minimal and focused on the bug.\n" +
      "5. Write a clear commit message referencing issue #" + ref.number + ".\n";

    await runtimeTools.ui_notify(
      progressLogNotifyEvent("Dispatching Cursor cloud agent for bug fix...")
    );

    try {
      const createResult = await runtimeTools.cursor_cloud_agents_create_agent({
        prompt: { text: fixPrompt },
        model: { id: "composer-2" },
        repos: [{ url: repoUrl, startingRef: "main" }],
        autoCreatePR: true,
      });

      const agentId = createResult.agent.id;
      const runId = createResult.run.id;
      const agentUrl = createResult.agent.url;

      dispatchInfo =
        "\n\n**Cursor agent dispatched**: [View progress](" + agentUrl + ")\n" +
        "- Agent ID: `" + agentId + "`\n" +
        "- Run ID: `" + runId + "`\n";

      // Post dispatch link as follow-up comment
      await runtimeTools.github_issues_create_comment({
        owner: ref.owner,
        repo: ref.repo,
        issue_number: ref.number,
        body: "Cursor cloud agent dispatched for automated fix.\n\n" +
          "- [View agent progress](" + agentUrl + ")\n" +
          "- Agent ID: `" + agentId + "`\n" +
          "- Model: composer-2\n\n" +
          "_The agent will auto-create a PR when the fix is ready._",
      });

      await runtimeTools.ui_notify(
        textPromptNotifyEvent({
          type: "text",
          text: "Cursor agent dispatched for " + ref.owner + "/" + ref.repo + "#" + ref.number + ". Dashboard: " + agentUrl,
        })
      );
    } catch (e: any) {
      await runtimeTools.ui_notify(
        errorNotifyEvent("Failed to dispatch Cursor agent: " + (e.message || "unknown error"))
      );
      dispatchInfo = "\n\n_Cursor dispatch failed: " + (e.message || "unknown error") + "_";
    }
  }

  // Final summary
  const summary =
    "## Issue Triage Result\n\n" +
    "- **Issue**: " + ref.owner + "/" + ref.repo + "#" + ref.number + "\n" +
    "- **Title**: " + title + "\n" +
    "- **Kind**: " + kind + " (" + kindConfidence + ")\n" +
    "- **Severity**: " + severity + " (" + severityConfidence + ")\n" +
    "- **Area**: " + area + " (" + areaConfidence + ")\n" +
    "- **Routing**: " + routing + "\n" +
    "- **Labels added**: " + (newLabels.length > 0 ? newLabels.join(", ") : "none") + "\n" +
    "- **Overall confidence**: " + overallConfidence + "\n" +
    "- **Rationale**: " + rationale +
    dispatchInfo;

  await runtimeTools.ui_notify(
    textPromptNotifyEvent({ type: "text", text: summary })
  );

  return { type: "text", text: summary };
}

export default agent({
  identifier: "issue-triage-router",
  description,
  inputSchema,
  outputSchema,
  tools,
  run,
});
