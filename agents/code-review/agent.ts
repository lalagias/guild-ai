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
import { z } from "zod";

import description from "./description.md";

const inputSchema = z.object({
  type: z.literal("text"),
  text: z
    .string()
    .describe(
      "A GitHub PR URL (e.g. https://github.com/owner/repo/pull/42) or short reference (owner/repo#42)"
    ),
});
type Input = z.infer<typeof inputSchema>;

const outputSchema = z.object({
  type: z.literal("text"),
  text: z
    .string()
    .describe(
      "Structured review with findings by severity, or a clean-PR confirmation if nothing material was found."
    ),
});
type Output = z.infer<typeof outputSchema>;

const tools = {
  ...pick(gitHubTools, [
    "github_pulls_get",
    "github_pulls_list_files",
    "github_issues_create_comment",
  ]),
  ...pick(userInterfaceTools, ["ui_notify"]),
};
type Tools = typeof tools;

type Severity = "critical" | "high" | "medium" | "low";

interface Finding {
  severity: Severity;
  category: string;
  file: string;
  line: string;
  description: string;
  snippet: string;
}

function parsePrRef(
  text: string
): { owner: string; repo: string; number: number } | null {
  const urlMatch = text.match(
    /https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)\/pull\/(\d+)/
  );
  if (urlMatch) {
    return {
      owner: urlMatch[1],
      repo: urlMatch[2],
      number: parseInt(urlMatch[3], 10),
    };
  }

  const shortMatch = text.match(/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)#(\d+)/);
  if (shortMatch) {
    return {
      owner: shortMatch[1],
      repo: shortMatch[2],
      number: parseInt(shortMatch[3], 10),
    };
  }

  return null;
}

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

interface PatternRule {
  pattern: RegExp;
  severity: Severity;
  category: string;
  description: string;
}

const SECURITY_PATTERNS: PatternRule[] = [
  {
    pattern:
      /(?:password|secret|api_key|apikey|token|private_key)\s*[:=]\s*["'][^"']{4,}/i,
    severity: "critical",
    category: "Security",
    description: "Possible hardcoded secret or credential",
  },
  {
    pattern:
      /(?:eval|Function)\s*\(\s*(?:req\.|request\.|params\.|query\.|body\.)/,
    severity: "critical",
    category: "Security",
    description: "Code injection via eval/Function with user input",
  },
  {
    pattern: /innerHTML\s*=\s*(?!['"]<).*(?:req|request|params|query|input|data)/,
    severity: "high",
    category: "Security",
    description: "Potential XSS via innerHTML with dynamic content",
  },
  {
    pattern:
      /(?:query|execute|exec)\s*\(\s*[`"'].*\$\{|(?:query|execute|exec)\s*\(\s*.*\+\s*(?:req|request|params|query)/,
    severity: "critical",
    category: "Security",
    description: "Potential SQL injection via string concatenation",
  },
  {
    pattern: /cors\s*\(\s*\{[^}]*origin\s*:\s*(?:true|\*|['"]?\*['"]?)/,
    severity: "high",
    category: "Security",
    description: "Overly permissive CORS configuration",
  },
  {
    pattern: /crypto\.createHash\s*\(\s*['"](?:md5|sha1)['"]\s*\)/,
    severity: "medium",
    category: "Security",
    description: "Weak hash algorithm (MD5/SHA1)",
  },
  {
    pattern: /disable.*(?:ssl|tls|cert)|rejectUnauthorized\s*:\s*false/i,
    severity: "high",
    category: "Security",
    description: "TLS/SSL verification disabled",
  },
];

const LOGIC_PATTERNS: PatternRule[] = [
  {
    pattern: /catch\s*\([^)]*\)\s*\{\s*\}/,
    severity: "medium",
    category: "Logic",
    description: "Empty catch block swallows errors silently",
  },
  {
    pattern: /===?\s*null(?!\s*[|&])|===?\s*undefined(?!\s*[|&])/,
    severity: "low",
    category: "Logic",
    description:
      "Null/undefined check without handling the opposite — verify both cases covered",
  },
  {
    pattern: /\.length\s*-\s*1\s*[><=]/,
    severity: "low",
    category: "Logic",
    description:
      "Array boundary arithmetic — verify off-by-one is handled correctly",
  },
  {
    pattern: /TODO|FIXME|HACK|XXX|TEMP/,
    severity: "low",
    category: "Logic",
    description: "Unresolved TODO/FIXME marker shipped in PR",
  },
  {
    pattern: /console\.log\s*\(|debugger\b/,
    severity: "low",
    category: "Logic",
    description: "Debug statement left in code",
  },
];

const PERFORMANCE_PATTERNS: PatternRule[] = [
  {
    pattern: /await\s+.*\bfor\s*\(|for\s*\(.*await\b/,
    severity: "medium",
    category: "Performance",
    description:
      "Sequential await inside loop — consider Promise.all for parallelism",
  },
  {
    pattern: /\.find\s*\(.*\bfor\s*\(|for\s*\(.*\.find\s*\(/,
    severity: "medium",
    category: "Performance",
    description: "Nested find-in-loop — potential N+1 pattern",
  },
  {
    pattern: /SELECT\s+\*\s+FROM/i,
    severity: "medium",
    category: "Performance",
    description: "SELECT * query — specify columns to reduce payload",
  },
  {
    pattern: /(?:readFileSync|writeFileSync|execSync)\b/,
    severity: "medium",
    category: "Performance",
    description: "Synchronous I/O may block the event loop",
  },
];

const API_PATTERNS: PatternRule[] = [
  {
    pattern: /(?:export\s+(?:default\s+)?(?:function|class|const|interface))\s+\w+/,
    severity: "low",
    category: "API Contract",
    description:
      "Public export modified — verify consumers are updated if signature changed",
  },
];

const ALL_PATTERNS = [
  ...SECURITY_PATTERNS,
  ...LOGIC_PATTERNS,
  ...PERFORMANCE_PATTERNS,
  ...API_PATTERNS,
];

function extractLineNumber(patch: string, matchIndex: number): string {
  const beforeMatch = patch.slice(0, matchIndex);
  const hunkHeaders = [...beforeMatch.matchAll(/@@ -\d+(?:,\d+)? \+(\d+)/g)];
  if (hunkHeaders.length === 0) return "?";

  const lastHunk = hunkHeaders[hunkHeaders.length - 1];
  const startLine = parseInt(lastHunk[1], 10);
  const afterHunk = beforeMatch.slice(
    (lastHunk.index ?? 0) + lastHunk[0].length
  );
  const addedLines = (afterHunk.match(/\n\+/g) || []).length;
  const contextLines = (afterHunk.match(/\n /g) || []).length;
  return String(startLine + addedLines + contextLines);
}

function analyzeFile(filename: string, patch: string): Finding[] {
  if (!patch) return [];

  const findings: Finding[] = [];
  const addedLines = patch
    .split("\n")
    .filter((l) => l.startsWith("+") && !l.startsWith("+++"));
  const addedContent = addedLines.join("\n");

  for (const rule of ALL_PATTERNS) {
    const match = addedContent.match(rule.pattern);
    if (match) {
      const lineInPatch = extractLineNumber(patch, patch.indexOf(match[0]));
      const snippetLine =
        addedLines.find((l) => rule.pattern.test(l)) || match[0];
      findings.push({
        severity: rule.severity,
        category: rule.category,
        file: filename,
        line: lineInPatch,
        description: rule.description,
        snippet: snippetLine.replace(/^\+/, "").trim().slice(0, 120),
      });
    }
  }

  return findings;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

async function run(input: Input, task: Task<Tools>): Promise<Output> {
  const runtimeTools = (task as any).tools as any;
  const ref = parsePrRef(input.text);

  if (!ref) {
    await runtimeTools.ui_notify(
      errorNotifyEvent(
        "Could not parse a GitHub PR reference. Expected: owner/repo#42 or a GitHub pull request URL."
      )
    );
    return {
      type: "text",
      text: "## Review Failed\n\nCould not parse a GitHub PR reference from the input.",
    };
  }

  await runtimeTools.ui_notify(
    progressLogNotifyEvent(
      "Fetching PR " + ref.owner + "/" + ref.repo + "#" + ref.number + "..."
    )
  );

  let pr: any;
  try {
    pr = await runtimeTools.github_pulls_get({
      owner: ref.owner,
      repo: ref.repo,
      pull_number: ref.number,
    });
  } catch (e: any) {
    await runtimeTools.ui_notify(
      errorNotifyEvent(
        "Failed to fetch PR: " + (e.message || "unknown error")
      )
    );
    return {
      type: "text",
      text:
        "## Review Failed\n\nCould not fetch PR " +
        ref.owner +
        "/" +
        ref.repo +
        "#" +
        ref.number +
        ".",
    };
  }

  await runtimeTools.ui_notify(
    progressLogNotifyEvent(
      'PR fetched: "' +
        (pr.title || "") +
        '" (' +
        (pr.changed_files || "?") +
        " files). Fetching diff..."
    )
  );

  let files: any[] = [];
  try {
    const filesResult = await runtimeTools.github_pulls_list_files({
      owner: ref.owner,
      repo: ref.repo,
      pull_number: ref.number,
      per_page: 100,
    });
    files = filesResult.items || filesResult || [];
  } catch (e: any) {
    await runtimeTools.ui_notify(
      errorNotifyEvent(
        "Failed to fetch PR files: " + (e.message || "unknown error")
      )
    );
    return {
      type: "text",
      text: "## Review Failed\n\nCould not fetch file diffs for the PR.",
    };
  }

  await runtimeTools.ui_notify(
    progressLogNotifyEvent(
      "Analyzing " + files.length + " changed files for issues..."
    )
  );

  const allFindings: Finding[] = [];

  for (const file of files) {
    const filename = file.filename || file.name || "";
    const patch = file.patch || "";

    if (
      filename.match(
        /\.(lock|min\.js|min\.css|map|png|jpg|gif|svg|ico|woff|ttf|eot)$/
      )
    ) {
      continue;
    }

    const fileFindings = analyzeFile(filename, patch);
    for (const f of fileFindings) {
      allFindings.push(f);
    }
  }

  allFindings.sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
  );

  const materialFindings = allFindings.filter(
    (f) => f.severity !== "low"
  );

  if (materialFindings.length === 0) {
    const cleanSummary =
      "## Code Review: Clean\n\n" +
      "**PR**: " +
      ref.owner +
      "/" +
      ref.repo +
      "#" +
      ref.number +
      "\n" +
      "**Title**: " +
      (pr.title || "") +
      "\n" +
      "**Files analyzed**: " +
      files.length +
      "\n\n" +
      "No medium-or-higher severity findings detected. " +
      (allFindings.length > 0
        ? allFindings.length +
          " low-severity note(s) found but suppressed (signal gate)."
        : "No issues found at any severity level.") +
      "\n\n_Review stayed silent on the PR (anti-noise posture)._";

    await runtimeTools.ui_notify(
      textPromptNotifyEvent({ type: "text", text: cleanSummary })
    );
    return { type: "text", text: cleanSummary };
  }

  await runtimeTools.ui_notify(
    progressLogNotifyEvent(
      materialFindings.length +
        " material finding(s) detected. Posting review comment..."
    )
  );

  const parts: string[] = [];
  parts.push("## Code Review Findings");
  parts.push("");
  parts.push(
    "| Severity | Category | File | Line | Description |"
  );
  parts.push("| --- | --- | --- | --- | --- |");

  for (const f of allFindings) {
    if (f.severity === "low") continue;
    parts.push(
      "| **" +
        f.severity.toUpperCase() +
        "** | " +
        f.category +
        " | `" +
        f.file +
        "` | L" +
        f.line +
        " | " +
        f.description +
        " |"
    );
  }

  const critCount = materialFindings.filter(
    (f) => f.severity === "critical"
  ).length;
  const highCount = materialFindings.filter(
    (f) => f.severity === "high"
  ).length;
  const medCount = materialFindings.filter(
    (f) => f.severity === "medium"
  ).length;

  parts.push("");
  parts.push("### Summary");
  parts.push("");
  parts.push(
    "- **Critical**: " +
      critCount +
      " | **High**: " +
      highCount +
      " | **Medium**: " +
      medCount
  );

  if (allFindings.length > materialFindings.length) {
    parts.push(
      "- " +
        (allFindings.length - materialFindings.length) +
        " low-severity note(s) suppressed"
    );
  }

  if (materialFindings.length > 0) {
    parts.push("");
    parts.push("### Highlighted Snippets");
    for (const f of materialFindings.slice(0, 5)) {
      parts.push("");
      parts.push(
        "**" +
          f.severity.toUpperCase() +
          "** — " +
          f.category +
          " in `" +
          f.file +
          "` (L" +
          f.line +
          ")"
      );
      parts.push("```");
      parts.push(truncate(f.snippet, 120));
      parts.push("```");
      parts.push(f.description);
    }
  }

  const reviewBody = parts.join("\n");

  try {
    await runtimeTools.github_issues_create_comment({
      owner: ref.owner,
      repo: ref.repo,
      issue_number: ref.number,
      body: reviewBody,
    });
    await runtimeTools.ui_notify(
      progressLogNotifyEvent(
        "Review comment posted on PR #" + ref.number
      )
    );
  } catch (e: any) {
    await runtimeTools.ui_notify(
      errorNotifyEvent(
        "Failed to post review comment: " +
          (e.message || "unknown error")
      )
    );
  }

  const fullSummary =
    "## Code Review Result\n\n" +
    "- **PR**: " +
    ref.owner +
    "/" +
    ref.repo +
    "#" +
    ref.number +
    "\n" +
    "- **Title**: " +
    (pr.title || "") +
    "\n" +
    "- **Files analyzed**: " +
    files.length +
    "\n" +
    "- **Critical**: " +
    critCount +
    "\n" +
    "- **High**: " +
    highCount +
    "\n" +
    "- **Medium**: " +
    medCount +
    "\n" +
    "- **Low (suppressed)**: " +
    (allFindings.length - materialFindings.length) +
    "\n\n" +
    "Review comment posted on the PR.";

  await runtimeTools.ui_notify(
    textPromptNotifyEvent({ type: "text", text: fullSummary })
  );

  return { type: "text", text: fullSummary };
}

export default agent({
  identifier: "code-review",
  description,
  inputSchema,
  outputSchema,
  tools,
  run,
});
