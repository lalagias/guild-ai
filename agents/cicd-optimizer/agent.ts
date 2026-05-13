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

declare function atob(data: string): string;
declare class TextDecoder {
  constructor(label?: string);
  decode(input?: ArrayBufferView): string;
}

const inputSchema = z.object({
  type: z.literal("text"),
  text: z
    .string()
    .describe(
      "A GitHub repo URL (e.g. https://github.com/owner/repo) or short reference (owner/repo)"
    ),
});
type Input = z.infer<typeof inputSchema>;

const outputSchema = z.object({
  type: z.literal("text"),
  text: z
    .string()
    .describe(
      "Structured CI/CD optimization report with per-workflow findings and YAML fix suggestions."
    ),
});
type Output = z.infer<typeof outputSchema>;

const tools = {
  ...pick(gitHubTools, [
    "github_repos_get_content",
  ]),
  ...pick(userInterfaceTools, ["ui_notify"]),
};
type Tools = typeof tools;

type Severity = "critical" | "high" | "medium" | "low";

interface Finding {
  severity: Severity;
  category: string;
  workflow: string;
  description: string;
  suggestion: string;
}

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function parseRepoRef(
  text: string
): { owner: string; repo: string } | null {
  const urlMatch = text.match(
    /https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/
  );
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2] };
  }

  const shortMatch = text.match(
    /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/
  );
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2] };
  }

  return null;
}

function decodeContent(content: string): string {
  try {
    const cleaned = content.replace(/\s/g, "");
    const binary = atob(cleaned);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder().decode(bytes);
  } catch {
    return content;
  }
}

interface PatternCheck {
  test: (content: string) => boolean;
  severity: Severity;
  category: string;
  description: string;
  suggestion: string;
}

const CACHING_CHECKS: PatternCheck[] = [
  {
    test: (c) =>
      /npm\s+(ci|install)/.test(c) &&
      !c.includes("actions/cache") &&
      !c.includes("actions/setup-node") &&
      !c.includes("cache:"),
    severity: "high",
    category: "Caching",
    description: "npm install without caching configured",
    suggestion:
      "Add cache to setup-node:\n```yaml\n- uses: actions/setup-node@v4\n  with:\n    node-version: '20'\n    cache: 'npm'\n```",
  },
  {
    test: (c) =>
      /pip\s+install/.test(c) &&
      !c.includes("actions/cache") &&
      !c.includes("actions/setup-python") &&
      !c.includes("cache:"),
    severity: "high",
    category: "Caching",
    description: "pip install without caching configured",
    suggestion:
      "Add cache to setup-python:\n```yaml\n- uses: actions/setup-python@v5\n  with:\n    python-version: '3.12'\n    cache: 'pip'\n```",
  },
  {
    test: (c) => /docker\s+build/.test(c) && !c.includes("cache-from"),
    severity: "medium",
    category: "Caching",
    description: "Docker build without layer caching",
    suggestion:
      "Use BuildKit cache mounts:\n```yaml\n- uses: docker/build-push-action@v5\n  with:\n    cache-from: type=gha\n    cache-to: type=gha,mode=max\n```",
  },
];

const TRIGGER_CHECKS: PatternCheck[] = [
  {
    test: (c) => {
      const onPush = /on:\s*\n\s+push:\s*\n/.test(c);
      const hasPaths = /paths(?:-ignore)?:/.test(c);
      const hasBranches = /branches:/.test(c);
      return onPush && !hasPaths && !hasBranches;
    },
    severity: "medium",
    category: "Triggers",
    description:
      "Push trigger without branch or path filters — runs on every push to every branch",
    suggestion:
      "Scope the trigger:\n```yaml\non:\n  push:\n    branches: [main]\n    paths:\n      - 'src/**'\n      - 'package.json'\n```",
  },
  {
    test: (c) =>
      c.includes("pull_request_target") &&
      c.includes("actions/checkout") &&
      /ref:\s*.*pull_request/.test(c),
    severity: "critical",
    category: "Security",
    description:
      "pull_request_target with PR head checkout — allows arbitrary code execution from forks",
    suggestion:
      "Use pull_request instead of pull_request_target, or avoid checking out PR code:\n```yaml\non:\n  pull_request:\n    branches: [main]\n```",
  },
];

const TIMEOUT_CHECKS: PatternCheck[] = [
  {
    test: (c) => {
      const hasJobs = /jobs:/.test(c);
      const hasTimeout = /timeout-minutes:/.test(c);
      return hasJobs && !hasTimeout;
    },
    severity: "medium",
    category: "Timeouts",
    description:
      "No timeout-minutes set — jobs can run indefinitely and burn credits",
    suggestion:
      "Add timeout to each job:\n```yaml\njobs:\n  build:\n    timeout-minutes: 15\n```",
  },
];

const PARALLELIZATION_CHECKS: PatternCheck[] = [
  {
    test: (c) => {
      const needsMatches = c.match(/needs:\s*\[?[a-zA-Z_-]+/g) || [];
      return needsMatches.length >= 3;
    },
    severity: "medium",
    category: "Parallelization",
    description:
      "Long dependency chain (3+ sequential needs) — some jobs may run in parallel",
    suggestion:
      "Review job dependencies. Jobs that don't share artifacts can run concurrently by removing unnecessary `needs` links.",
  },
];

const MATRIX_CHECKS: PatternCheck[] = [
  {
    test: (c) => {
      const duplicateSteps =
        (c.match(/node-version:\s*['"]?\d+/g) || []).length >= 2;
      const hasMatrix = /strategy:\s*\n\s+matrix:/.test(c);
      return duplicateSteps && !hasMatrix;
    },
    severity: "low",
    category: "Matrix",
    description:
      "Multiple hardcoded version references without a matrix strategy",
    suggestion:
      "Use a matrix to test across versions:\n```yaml\nstrategy:\n  matrix:\n    node-version: [18, 20, 22]\n```",
  },
];

const REDUNDANCY_CHECKS: PatternCheck[] = [
  {
    test: (c) => (c.match(/actions\/checkout/g) || []).length >= 3,
    severity: "low",
    category: "Redundancy",
    description:
      "Checkout action used 3+ times — consider restructuring jobs or using artifacts",
    suggestion:
      "If jobs share built artifacts, use upload-artifact/download-artifact instead of re-checking out and rebuilding.",
  },
];

const SECRET_CHECKS: PatternCheck[] = [
  {
    test: (c) =>
      /env:\s*\n(?:\s+\w+:\s*\$\{\{\s*secrets\.\w+\s*\}\}\s*\n){3,}/.test(c),
    severity: "medium",
    category: "Security",
    description:
      "Many secrets injected as environment variables at once — consider scoping per step",
    suggestion:
      "Move secret env vars to individual steps that need them rather than job-level env blocks.",
  },
];

const ALL_CHECKS: PatternCheck[] = [
  ...CACHING_CHECKS,
  ...TRIGGER_CHECKS,
  ...TIMEOUT_CHECKS,
  ...PARALLELIZATION_CHECKS,
  ...MATRIX_CHECKS,
  ...REDUNDANCY_CHECKS,
  ...SECRET_CHECKS,
];

function analyzeWorkflow(
  filename: string,
  content: string
): Finding[] {
  const findings: Finding[] = [];

  for (const check of ALL_CHECKS) {
    if (check.test(content)) {
      findings.push({
        severity: check.severity,
        category: check.category,
        workflow: filename,
        description: check.description,
        suggestion: check.suggestion,
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
  const ref = parseRepoRef(input.text.trim());

  if (!ref) {
    await runtimeTools.ui_notify(
      errorNotifyEvent(
        "Could not parse a GitHub repo reference. Expected: owner/repo or a GitHub repo URL."
      )
    );
    return {
      type: "text",
      text: "## Analysis Failed\n\nCould not parse a GitHub repo reference from the input.",
    };
  }

  await runtimeTools.ui_notify(
    progressLogNotifyEvent(
      "Scanning workflows for " + ref.owner + "/" + ref.repo + "..."
    )
  );

  let dirListing: any;
  try {
    dirListing = await runtimeTools.github_repos_get_content({
      owner: ref.owner,
      repo: ref.repo,
      path: ".github/workflows",
    });
  } catch (e: any) {
    await runtimeTools.ui_notify(
      errorNotifyEvent(
        "Could not read .github/workflows: " +
          (e.message || "unknown error") +
          ". The repo may not use GitHub Actions."
      )
    );
    return {
      type: "text",
      text:
        "## Analysis Failed\n\nCould not read `.github/workflows/` in " +
        ref.owner +
        "/" +
        ref.repo +
        ". The repository may not use GitHub Actions.",
    };
  }

  const entries: any[] = Array.isArray(dirListing)
    ? dirListing
    : dirListing.items || dirListing.entries || [];

  const yamlFiles = entries.filter(
    (e: any) =>
      (e.name || e.path || "").match(/\.(yml|yaml)$/) && e.type === "file"
  );

  if (yamlFiles.length === 0) {
    return {
      type: "text",
      text:
        "## Analysis Complete\n\nNo YAML workflow files found in `.github/workflows/` for " +
        ref.owner +
        "/" +
        ref.repo +
        ".",
    };
  }

  await runtimeTools.ui_notify(
    progressLogNotifyEvent(
      "Found " + yamlFiles.length + " workflow file(s). Analyzing..."
    )
  );

  const allFindings: Finding[] = [];

  for (const yf of yamlFiles) {
    const filePath = yf.path || ".github/workflows/" + yf.name;
    const fileName = yf.name || filePath.split("/").pop() || filePath;

    try {
      const fileResult = await runtimeTools.github_repos_get_content({
        owner: ref.owner,
        repo: ref.repo,
        path: filePath,
      });

      let content = "";
      if (fileResult.content) {
        content = decodeContent(fileResult.content);
      } else if (typeof fileResult === "string") {
        content = fileResult;
      }

      if (!content) continue;

      const findings = analyzeWorkflow(fileName, content);
      for (const f of findings) {
        allFindings.push(f);
      }
    } catch (e: any) {
      await runtimeTools.ui_notify(
        progressLogNotifyEvent(
          "Skipped " + fileName + ": " + (e.message || "read error")
        )
      );
    }
  }

  allFindings.sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
  );

  const parts: string[] = [];
  parts.push("## CI/CD Optimization Report");
  parts.push("");
  parts.push("**Repository**: " + ref.owner + "/" + ref.repo);
  parts.push("**Workflows analyzed**: " + yamlFiles.length);
  parts.push("**Findings**: " + allFindings.length);
  parts.push("");

  if (allFindings.length === 0) {
    parts.push(
      "No anti-patterns detected. The CI/CD configuration looks well-structured."
    );
  } else {
    parts.push("### Findings");
    parts.push("");
    parts.push(
      "| Severity | Category | Workflow | Description |"
    );
    parts.push("| --- | --- | --- | --- |");

    for (const f of allFindings) {
      parts.push(
        "| **" +
          f.severity.toUpperCase() +
          "** | " +
          f.category +
          " | `" +
          f.workflow +
          "` | " +
          f.description +
          " |"
      );
    }

    const critCount = allFindings.filter(
      (f) => f.severity === "critical"
    ).length;
    const highCount = allFindings.filter(
      (f) => f.severity === "high"
    ).length;
    const medCount = allFindings.filter(
      (f) => f.severity === "medium"
    ).length;
    const lowCount = allFindings.filter(
      (f) => f.severity === "low"
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
        medCount +
        " | **Low**: " +
        lowCount
    );

    const materialFindings = allFindings.filter(
      (f) => f.severity !== "low"
    );

    if (materialFindings.length > 0) {
      parts.push("");
      parts.push("### Suggested Fixes");

      for (const f of materialFindings.slice(0, 8)) {
        parts.push("");
        parts.push(
          "#### " +
            f.severity.toUpperCase() +
            " — " +
            f.category +
            " (`" +
            f.workflow +
            "`)"
        );
        parts.push("");
        parts.push(f.description);
        parts.push("");
        parts.push(f.suggestion);
      }
    }

    const cachingFindings = allFindings.filter(
      (f) => f.category === "Caching"
    );
    if (cachingFindings.length > 0) {
      parts.push("");
      parts.push("### Estimated Impact");
      parts.push("");
      parts.push(
        "Fixing " +
          cachingFindings.length +
          " caching issue(s) typically saves 30-60% of workflow run time by avoiding redundant dependency installations."
      );
    }
  }

  const summary = parts.join("\n");

  await runtimeTools.ui_notify(
    textPromptNotifyEvent({ type: "text", text: summary })
  );

  return { type: "text", text: summary };
}

export default agent({
  identifier: "cicd-optimizer",
  description,
  inputSchema,
  outputSchema,
  tools,
  run,
});
