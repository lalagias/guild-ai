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
import { FirecrawlTools } from "@guildai-services/dkountanis~firecrawl";
import { z } from "zod";

import description from "./description.md";
import system_prompt from "./system-prompt.md";


const inputSchema = z.object({
  type: z.literal("text"),
  text: z
    .string()
    .describe(
      "An alert payload (JSON), service name with time window, or free-text incident description"
    ),
});
type Input = z.infer<typeof inputSchema>;

const outputSchema = z.object({
  type: z.literal("text"),
  text: z
    .string()
    .describe(
      "Structured incident brief with evidence, hypotheses, and recommended next steps"
    ),
});
type Output = z.infer<typeof outputSchema>;

const tools = {
  ...pick(gitHubTools, [
    "github_pulls_list",
    "github_search_issues_and_pull_requests",
  ]),
  ...pick(FirecrawlTools, [
    "firecrawl_scrape_and_extract_from_url",
  ]),
  ...pick(userInterfaceTools, ["ui_notify"]),
};
type Tools = typeof tools;

interface AlertPayload {
  alarmName: string;
  service: string;
  environment: string;
  metricName: string;
  threshold: number;
  observedValue: number;
  startedAt: string;
  region?: string;
  accountId?: string;
  namespace?: string;
  runbookUrl?: string;
  repo?: string;
  dimensions?: Record<string, string>;
  logSamples?: any[];
  deployments?: any[];
}

function parseAlert(text: string): AlertPayload {
  try {
    let raw = text.trim();
    // Handle double-encoded JSON (e.g. when the text field itself contains a JSON string)
    let parsed = JSON.parse(raw);
    if (typeof parsed === "string") {
      parsed = JSON.parse(parsed);
    }
    return {
      alarmName: parsed.alarmName || "unknown-alarm",
      service: parsed.service || "unknown",
      environment: parsed.environment || "production",
      metricName: parsed.metricName || "unknown",
      threshold: parsed.threshold || 0,
      observedValue: parsed.observedValue || 0,
      startedAt: parsed.startedAt || new Date().toISOString(),
      region: parsed.region,
      accountId: parsed.accountId,
      namespace: parsed.namespace,
      runbookUrl: parsed.runbookUrl,
      repo: parsed.repo,
      dimensions: parsed.dimensions,
      logSamples: parsed.logSamples,
      deployments: parsed.deployments,
    };
  } catch (_e) {
    return {
      alarmName: "manual-investigation",
      service: text.split(/\s+/).slice(0, 2).join("-"),
      environment: "production",
      metricName: "unknown",
      threshold: 0,
      observedValue: 0,
      startedAt: new Date().toISOString(),
    };
  }
}

function computeWindow(startedAt: string): { start: string; end: string } {
  const alertTime = new Date(startedAt).getTime();
  const windowStart = new Date(alertTime - 30 * 60 * 1000).toISOString();
  const windowEnd = new Date(Math.min(alertTime + 15 * 60 * 1000, alertTime + 2 * 60 * 60 * 1000)).toISOString();
  return { start: windowStart, end: windowEnd };
}

async function run(input: Input, task: Task<Tools>): Promise<Output> {
  const runtimeTools = (task as any).tools as any;
  const alert = parseAlert(input.text);
  const window = computeWindow(alert.startedAt);

  await runtimeTools.ui_notify(
    progressLogNotifyEvent("Starting incident investigation for " + alert.service + " (" + alert.alarmName + ")...")
  );

  const parts: string[] = [];
  parts.push("## Incident Brief");
  parts.push("");
  parts.push("- **Alarm**: " + alert.alarmName);
  parts.push("- **Affected service**: " + alert.service);
  parts.push("- **Environment**: " + alert.environment);
  parts.push("- **Metric**: " + alert.metricName + " (threshold: " + alert.threshold + ", observed: " + alert.observedValue + ")");
  parts.push("- **Time window**: " + window.start + " → " + window.end);
  if (alert.region) parts.push("- **Region**: " + alert.region);
  parts.push("");

  // CloudWatch tools not yet accessible from this workspace.
  // When Bryce wires guildai~aws-cloudwatch credentials, add the import back
  // and re-enable live log queries. For now: manual-input mode only.

  parts.push("## Evidence");
  parts.push("");

  await runtimeTools.ui_notify(
    progressLogNotifyEvent("Analyzing provided evidence (CloudWatch live queries pending credential access)...")
  );

  if (alert.logSamples && alert.logSamples.length > 0) {
    parts.push("**Provided log samples** (" + alert.logSamples.length + " entries):");
    parts.push("");
    for (const log of alert.logSamples.slice(0, 10)) {
      parts.push("- [" + (log.timestamp || "?") + "] " + (log.level || "?") + ": " + (log.message || JSON.stringify(log).slice(0, 150)));
    }
    parts.push("");
  } else {
    parts.push("**No log data provided.** Include `logSamples` in the alert payload or connect CloudWatch credentials for live queries.");
    parts.push("");
  }

  // Step 3: Suggested log queries
  parts.push("## Suggested Log Queries");
  parts.push("");
  parts.push("Paste these into the CloudWatch Logs Insights console:");
  parts.push("");
  parts.push("**Error pattern query**:");
  parts.push("```");
  parts.push("fields @timestamp, @message, @logStream");
  parts.push("| filter @timestamp >= '" + window.start + "'");
  parts.push("| filter @timestamp <= '" + window.end + "'");
  parts.push("| filter @message like /ERROR|Exception|timeout|5xx|failed/i");
  parts.push("| sort @timestamp desc");
  parts.push("| limit 100");
  parts.push("```");
  parts.push("");
  parts.push("**Request path aggregation**:");
  parts.push("```");
  parts.push("fields @timestamp, @message");
  parts.push("| parse @message /(?<method>GET|POST|PUT|PATCH|DELETE) (?<path>\\/[^ ]+)/");
  parts.push("| filter @timestamp >= '" + window.start + "'");
  parts.push("| filter @timestamp <= '" + window.end + "'");
  parts.push("| stats count(*) as errors by method, path");
  parts.push("| sort errors desc");
  parts.push("| limit 20");
  parts.push("```");
  parts.push("");

  // Step 4: Recent change correlation
  parts.push("## Recent Change Correlation");
  parts.push("");

  if (alert.deployments && alert.deployments.length > 0) {
    parts.push("**Provided deployments**:");
    parts.push("");
    for (const dep of alert.deployments) {
      parts.push("- " + (dep.repo || "?") + " @ " + (dep.sha || "?").slice(0, 7) +
        " by " + (dep.author || "?") + " at " + (dep.deployedAt || "?") +
        (dep.pr ? " — [PR](" + dep.pr + ")" : ""));
    }
    parts.push("");
  }

  if (alert.repo) {
    await runtimeTools.ui_notify(
      progressLogNotifyEvent("Checking recent PRs in " + alert.repo + "...")
    );

    try {
      const prs = await runtimeTools.github_search_issues_and_pull_requests({
        q: "is:pr is:merged repo:" + alert.repo + " merged:>=" + window.start.split("T")[0],
        per_page: 10,
        sort: "updated",
        order: "desc",
      });
      const prItems = prs.items || [];
      if (prItems.length > 0) {
        parts.push("**Recent merged PRs in " + alert.repo + "**:");
        parts.push("");
        for (const pr of prItems.slice(0, 5)) {
          const prAuthor = pr.user && pr.user.login ? pr.user.login : "?";
          parts.push("- #" + pr.number + ": " + pr.title + " (merged by " + prAuthor + ")");
        }
        parts.push("");
      } else {
        parts.push("No recently merged PRs found in " + alert.repo + " during the investigation window.");
        parts.push("");
      }
    } catch (_e) {
      parts.push("Could not query GitHub for recent PRs.");
      parts.push("");
    }
  } else {
    parts.push("No target repository specified. Cannot correlate with recent PRs.");
    parts.push("");
  }

  // Step 5: Runbook enrichment via Firecrawl
  if (alert.runbookUrl) {
    await runtimeTools.ui_notify(
      progressLogNotifyEvent("Fetching runbook from " + alert.runbookUrl + "...")
    );

    try {
      const runbook = await runtimeTools.firecrawl_scrape_and_extract_from_url({
        url: alert.runbookUrl,
        formats: ["markdown"],
        onlyMainContent: true,
        parsers: [],
      });
      if (runbook.data && runbook.data.markdown) {
        parts.push("## Runbook Reference");
        parts.push("");
        parts.push(runbook.data.markdown.slice(0, 2000));
        parts.push("");
      }
    } catch (_e) {
      parts.push("## Runbook Reference");
      parts.push("");
      parts.push("Could not fetch runbook from " + alert.runbookUrl + ".");
      parts.push("");
    }
  }

  // Step 6: Hypotheses (generated from evidence)
  parts.push("## Hypotheses");
  parts.push("");

  const hypotheses: string[] = [];

  if (alert.deployments && alert.deployments.length > 0) {
    const recentDep = alert.deployments[0];
    hypotheses.push("1. **Recent deployment caused the issue** (medium confidence) — " +
      (recentDep.repo || "unknown repo") + " deployed at " + (recentDep.deployedAt || "?") +
      ", within the alert window. " + (recentDep.pr ? "See PR: " + recentDep.pr : ""));
  }

  if (alert.logSamples && alert.logSamples.length > 20) {
    hypotheses.push((hypotheses.length + 1) + ". **Upstream service degradation** (medium confidence) — " +
      "High volume of timeout/connection errors suggests an upstream dependency may be failing.");
  }

  if (alert.metricName && alert.metricName.includes("5XX")) {
    hypotheses.push((hypotheses.length + 1) + ". **Application error spike** (medium confidence) — " +
      "5XX metric breach typically indicates unhandled exceptions or resource exhaustion in the application layer.");
  }

  if (hypotheses.length === 0) {
    hypotheses.push("1. **Insufficient evidence for hypothesis ranking.** More log data or deployment history needed.");
  }

  for (const h of hypotheses) parts.push(h);
  parts.push("");

  // Step 7: Recommended next steps
  parts.push("## Recommended Next Steps");
  parts.push("");
  parts.push("1. Run the suggested log queries in the CloudWatch console for the affected log group(s).");
  if (alert.deployments && alert.deployments.length > 0) {
    parts.push("2. Review the most recent deployment for regressions.");
  }
  parts.push((alert.deployments ? "3" : "2") + ". Check downstream service health dashboards.");
  parts.push((alert.deployments ? "4" : "3") + ". If a code fix is identified, use the handoff prompt below to dispatch a coding agent.");
  parts.push("");

  // Step 8: Missing data
  parts.push("## Missing Data");
  parts.push("");
  const missing: string[] = [];
  missing.push("- CloudWatch live log queries (credentials not yet connected — ask Bryce to wire guildai~aws-cloudwatch)");
  if (!alert.repo) missing.push("- Target GitHub repository for PR correlation");
  if (!alert.deployments || alert.deployments.length === 0) missing.push("- Recent deployment history");
  if (!alert.logSamples || alert.logSamples.length === 0) missing.push("- Log samples (include logSamples in the alert payload)");
  if (missing.length === 0) missing.push("- No critical data gaps identified");
  for (const m of missing) parts.push(m);
  parts.push("");

  // Step 9: Handoff prompt
  parts.push("## Handoff Prompt");
  parts.push("");
  parts.push("_Copy this to a Cursor or coding agent to investigate a fix:_");
  parts.push("");
  parts.push("```");
  parts.push("You are investigating a production alert.");
  parts.push("");
  parts.push("Alert: " + alert.alarmName + " on " + alert.service + " (" + alert.environment + ")");
  parts.push("Metric: " + alert.metricName + " breached threshold " + alert.threshold + " (observed: " + alert.observedValue + ")");
  parts.push("Time: " + window.start + " to " + window.end);
  if (alert.repo) parts.push("Repository: " + alert.repo);
  parts.push("");
  parts.push("Produce:");
  parts.push("1. Most likely hypotheses with confidence.");
  parts.push("2. Evidence supporting or weakening each hypothesis.");
  parts.push("3. If a code fix is likely, a scoped implementation plan.");
  parts.push("```");
  parts.push("");

  const fullBrief = parts.join("\n");

  await runtimeTools.ui_notify(
    textPromptNotifyEvent({ type: "text", text: fullBrief })
  );

  return { type: "text", text: fullBrief };
}

export default agent({
  identifier: "rca-incident-brief",
  description,
  inputSchema,
  outputSchema,
  tools,
  run,
});
