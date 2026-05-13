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
      "A GitHub repo URL (e.g. https://github.com/owner/repo) or short reference (owner/repo). Optionally append a manifest path after a pipe: owner/repo | path/to/package.json"
    ),
});
type Input = z.infer<typeof inputSchema>;

const outputSchema = z.object({
  type: z.literal("text"),
  text: z
    .string()
    .describe(
      "Dependency health report with risk scores, upgrade priorities, and hygiene checks."
    ),
});
type Output = z.infer<typeof outputSchema>;

const tools = {
  ...pick(gitHubTools, ["github_repos_get_content"]),
  ...pick(userInterfaceTools, ["ui_notify"]),
};
type Tools = typeof tools;

type Severity = "critical" | "high" | "medium" | "low";

interface DepFinding {
  severity: Severity;
  category: string;
  name: string;
  description: string;
}

const SEVERITY_RANK: Record<Severity, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

interface Ecosystem {
  name: string;
  manifestFiles: string[];
  lockFiles: string[];
  parseManifest: (content: string) => ParsedDep[];
}

interface ParsedDep {
  name: string;
  version: string;
  isDev: boolean;
}

const DEPRECATED_NPM: Record<string, string> = {
  request: "Use undici, got, or node-fetch instead",
  moment: "Use date-fns, dayjs, or Temporal API instead",
  "node-uuid": "Use the built-in crypto.randomUUID() or uuid package",
  "node-fetch": "Use the built-in fetch (Node 18+) or undici",
  querystring: "Use URLSearchParams (built-in)",
  "left-pad": "Use String.prototype.padStart()",
  underscore: "Use lodash-es or native array/object methods",
  bower: "Use npm/pnpm/yarn directly",
  tslint: "Use eslint with @typescript-eslint",
  "@types/node-fetch": "Built-in fetch is typed in Node 18+ / @types/node",
  corepack: "Bundled with Node.js — do not install separately",
};

const DEPRECATED_PYTHON: Record<string, string> = {
  nose: "Use pytest instead",
  pep8: "Use pycodestyle or ruff instead",
  autopep8: "Use black or ruff format instead",
  pylint: "Consider ruff as a faster alternative",
  "setuptools-scm": "Consider hatchling or flit-core for PEP 621 projects",
};

function parseNpmManifest(content: string): ParsedDep[] {
  const deps: ParsedDep[] = [];
  try {
    const pkg = JSON.parse(content);
    if (pkg.dependencies) {
      for (const [name, version] of Object.entries(pkg.dependencies)) {
        deps.push({ name, version: String(version), isDev: false });
      }
    }
    if (pkg.devDependencies) {
      for (const [name, version] of Object.entries(pkg.devDependencies)) {
        deps.push({ name, version: String(version), isDev: true });
      }
    }
  } catch {
    // malformed JSON
  }
  return deps;
}

function parsePythonRequirements(content: string): ParsedDep[] {
  const deps: ParsedDep[] = [];
  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#") || line.startsWith("-")) continue;
    const match = line.match(/^([a-zA-Z0-9_.-]+)\s*(?:([><=!~]+)\s*(.+))?/);
    if (match) {
      deps.push({
        name: match[1],
        version: match[2] ? match[2] + match[3] : "*",
        isDev: false,
      });
    }
  }
  return deps;
}

function parseGoMod(content: string): ParsedDep[] {
  const deps: ParsedDep[] = [];
  const inRequire = content.match(/require\s*\(([\s\S]*?)\)/g) || [];
  for (const block of inRequire) {
    const lines = block.split("\n");
    for (const line of lines) {
      const match = line
        .trim()
        .match(/^([a-zA-Z0-9./_-]+)\s+(v[0-9.]+(?:-[a-zA-Z0-9.]+)?)/);
      if (match) {
        deps.push({
          name: match[1],
          version: match[2],
          isDev: line.includes("// indirect"),
        });
      }
    }
  }
  return deps;
}

function parseGemfile(content: string): ParsedDep[] {
  const deps: ParsedDep[] = [];
  for (const line of content.split("\n")) {
    const match = line
      .trim()
      .match(/^gem\s+['"]([a-zA-Z0-9_.-]+)['"](?:\s*,\s*['"]([^'"]+)['"])?/);
    if (match) {
      deps.push({
        name: match[1],
        version: match[2] || "*",
        isDev: /group\s*:.*(?:development|test)/.test(line),
      });
    }
  }
  return deps;
}

function parseCargoToml(content: string): ParsedDep[] {
  const deps: ParsedDep[] = [];
  const sections = content.split(/\[([^\]]+)\]/);
  for (let i = 1; i < sections.length; i += 2) {
    const header = sections[i].trim();
    const body = sections[i + 1] || "";
    const isDev = header.includes("dev-dependencies");
    if (!header.includes("dependencies")) continue;

    for (const line of body.split("\n")) {
      const simpleMatch = line
        .trim()
        .match(/^([a-zA-Z0-9_-]+)\s*=\s*"([^"]+)"/);
      if (simpleMatch) {
        deps.push({
          name: simpleMatch[1],
          version: simpleMatch[2],
          isDev,
        });
        continue;
      }
      const tableMatch = line
        .trim()
        .match(
          /^([a-zA-Z0-9_-]+)\s*=\s*\{.*version\s*=\s*"([^"]+)"/
        );
      if (tableMatch) {
        deps.push({
          name: tableMatch[1],
          version: tableMatch[2],
          isDev,
        });
      }
    }
  }
  return deps;
}

const ECOSYSTEMS: Ecosystem[] = [
  {
    name: "Node.js (npm)",
    manifestFiles: ["package.json"],
    lockFiles: ["package-lock.json", "yarn.lock", "pnpm-lock.yaml", "bun.lockb"],
    parseManifest: parseNpmManifest,
  },
  {
    name: "Python",
    manifestFiles: ["requirements.txt"],
    lockFiles: ["requirements.lock", "poetry.lock", "Pipfile.lock"],
    parseManifest: parsePythonRequirements,
  },
  {
    name: "Go",
    manifestFiles: ["go.mod"],
    lockFiles: ["go.sum"],
    parseManifest: parseGoMod,
  },
  {
    name: "Ruby",
    manifestFiles: ["Gemfile"],
    lockFiles: ["Gemfile.lock"],
    parseManifest: parseGemfile,
  },
  {
    name: "Rust",
    manifestFiles: ["Cargo.toml"],
    lockFiles: ["Cargo.lock"],
    parseManifest: parseCargoToml,
  },
];

const DEV_TOOL_PACKAGES = new Set([
  "prettier",
  "eslint",
  "jest",
  "mocha",
  "chai",
  "sinon",
  "nyc",
  "istanbul",
  "husky",
  "lint-staged",
  "ts-node",
  "tsx",
  "nodemon",
  "webpack-dev-server",
  "concurrently",
  "@types/jest",
  "@types/mocha",
  "vitest",
  "playwright",
  "cypress",
  "storybook",
]);

function parseRepoRef(
  text: string
): { owner: string; repo: string; manifestPath: string | null } {
  let input = text.trim();
  let manifestPath: string | null = null;

  const pipeIdx = input.indexOf("|");
  if (pipeIdx !== -1) {
    manifestPath = input.slice(pipeIdx + 1).trim();
    input = input.slice(0, pipeIdx).trim();
  }

  const urlMatch = input.match(
    /https?:\/\/github\.com\/([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)/
  );
  if (urlMatch) {
    return { owner: urlMatch[1], repo: urlMatch[2], manifestPath };
  }

  const shortMatch = input.match(
    /^([a-zA-Z0-9_.-]+)\/([a-zA-Z0-9_.-]+)$/
  );
  if (shortMatch) {
    return { owner: shortMatch[1], repo: shortMatch[2], manifestPath };
  }

  return { owner: "", repo: "", manifestPath };
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

function analyzeDeps(
  deps: ParsedDep[],
  ecosystem: Ecosystem
): DepFinding[] {
  const findings: DepFinding[] = [];
  const deprecatedMap =
    ecosystem.name.startsWith("Node")
      ? DEPRECATED_NPM
      : ecosystem.name === "Python"
        ? DEPRECATED_PYTHON
        : {};

  for (const dep of deps) {
    if (deprecatedMap[dep.name]) {
      findings.push({
        severity: "high",
        category: "Deprecated",
        name: dep.name,
        description:
          dep.name +
          " is deprecated. " +
          deprecatedMap[dep.name],
      });
    }

    if (dep.version === "*" || dep.version === "latest" || dep.version === "") {
      findings.push({
        severity: "high",
        category: "Version Hygiene",
        name: dep.name,
        description:
          dep.name +
          ' uses unpinned version "' +
          dep.version +
          '" — builds are non-deterministic',
      });
    } else if (dep.version.startsWith(">=") && !dep.version.includes("<")) {
      findings.push({
        severity: "medium",
        category: "Version Hygiene",
        name: dep.name,
        description:
          dep.name +
          " has open-ended range (" +
          dep.version +
          ") — may pull breaking major versions",
      });
    }

    if (!dep.isDev && DEV_TOOL_PACKAGES.has(dep.name)) {
      findings.push({
        severity: "medium",
        category: "Dev/Prod Separation",
        name: dep.name,
        description:
          dep.name +
          " appears to be a dev tool but is listed as a production dependency",
      });
    }
  }

  return findings;
}

async function run(input: Input, task: Task<Tools>): Promise<Output> {
  const runtimeTools = (task as any).tools as any;
  const ref = parseRepoRef(input.text);

  if (!ref.owner || !ref.repo) {
    await runtimeTools.ui_notify(
      errorNotifyEvent(
        "Could not parse a GitHub repo reference. Expected: owner/repo or a GitHub repo URL."
      )
    );
    return {
      type: "text",
      text: "## Audit Failed\n\nCould not parse a GitHub repo reference from the input.",
    };
  }

  await runtimeTools.ui_notify(
    progressLogNotifyEvent(
      "Scanning dependencies for " +
        ref.owner +
        "/" +
        ref.repo +
        "..."
    )
  );

  // If a specific manifest was requested, try that directly
  if (ref.manifestPath) {
    await runtimeTools.ui_notify(
      progressLogNotifyEvent(
        "Fetching specified manifest: " + ref.manifestPath
      )
    );
  }

  // Fetch root directory listing to detect ecosystem
  let rootEntries: any[] = [];
  try {
    const rootResult = await runtimeTools.github_repos_get_content({
      owner: ref.owner,
      repo: ref.repo,
      path: "",
    });
    rootEntries = Array.isArray(rootResult)
      ? rootResult
      : rootResult.items || rootResult.entries || [];
  } catch (e: any) {
    await runtimeTools.ui_notify(
      errorNotifyEvent(
        "Failed to read repo root: " +
          (e.message || "unknown error")
      )
    );
    return {
      type: "text",
      text:
        "## Audit Failed\n\nCould not read the root of " +
        ref.owner +
        "/" +
        ref.repo +
        ".",
    };
  }

  const rootFileNames = new Set(
    rootEntries.map((e: any) => e.name || "")
  );

  // Detect ecosystems present
  const detectedEcosystems: {
    eco: Ecosystem;
    manifest: string;
    hasLock: boolean;
  }[] = [];

  for (const eco of ECOSYSTEMS) {
    for (const mf of eco.manifestFiles) {
      if (rootFileNames.has(mf) || mf === ref.manifestPath) {
        const hasLock = eco.lockFiles.some((lf) =>
          rootFileNames.has(lf)
        );
        detectedEcosystems.push({ eco, manifest: mf, hasLock });
      }
    }
  }

  if (detectedEcosystems.length === 0) {
    return {
      type: "text",
      text:
        "## Audit Complete\n\nNo recognized package manifest found in the root of " +
        ref.owner +
        "/" +
        ref.repo +
        ".\n\nLooked for: " +
        ECOSYSTEMS.flatMap((e) => e.manifestFiles).join(", "),
    };
  }

  await runtimeTools.ui_notify(
    progressLogNotifyEvent(
      "Detected ecosystem(s): " +
        detectedEcosystems.map((d) => d.eco.name).join(", ")
    )
  );

  const allFindings: DepFinding[] = [];
  const ecosystemSummaries: string[] = [];

  for (const detected of detectedEcosystems) {
    let manifestContent = "";
    try {
      const fileResult = await runtimeTools.github_repos_get_content({
        owner: ref.owner,
        repo: ref.repo,
        path: detected.manifest,
      });

      if (fileResult.content) {
        manifestContent = decodeContent(fileResult.content);
      } else if (typeof fileResult === "string") {
        manifestContent = fileResult;
      }
    } catch (e: any) {
      await runtimeTools.ui_notify(
        progressLogNotifyEvent(
          "Skipped " +
            detected.manifest +
            ": " +
            (e.message || "read error")
        )
      );
      continue;
    }

    if (!manifestContent) continue;

    const deps = detected.eco.parseManifest(manifestContent);
    const prodDeps = deps.filter((d) => !d.isDev);
    const devDeps = deps.filter((d) => d.isDev);

    ecosystemSummaries.push(
      detected.eco.name +
        ": " +
        prodDeps.length +
        " prod + " +
        devDeps.length +
        " dev dependencies"
    );

    const findings = analyzeDeps(deps, detected.eco);
    for (const f of findings) {
      allFindings.push(f);
    }

    if (!detected.hasLock) {
      allFindings.push({
        severity: "high",
        category: "Lock File",
        name: detected.manifest,
        description:
          "No lock file found for " +
          detected.eco.name +
          ". Expected one of: " +
          detected.eco.lockFiles.join(", "),
      });
    }
  }

  // Check for Dependabot / Renovate
  let hasAutomatedDeps = false;
  let automatedToolName = "";

  try {
    await runtimeTools.github_repos_get_content({
      owner: ref.owner,
      repo: ref.repo,
      path: ".github/dependabot.yml",
    });
    hasAutomatedDeps = true;
    automatedToolName = "Dependabot";
  } catch {
    try {
      await runtimeTools.github_repos_get_content({
        owner: ref.owner,
        repo: ref.repo,
        path: ".github/dependabot.yaml",
      });
      hasAutomatedDeps = true;
      automatedToolName = "Dependabot";
    } catch {
      // no dependabot config
    }
  }

  if (!hasAutomatedDeps && rootFileNames.has("renovate.json")) {
    hasAutomatedDeps = true;
    automatedToolName = "Renovate";
  }
  if (
    !hasAutomatedDeps &&
    rootFileNames.has(".renovaterc") 
  ) {
    hasAutomatedDeps = true;
    automatedToolName = "Renovate";
  }

  if (!hasAutomatedDeps) {
    allFindings.push({
      severity: "medium",
      category: "Automation",
      name: "dependency-tooling",
      description:
        "No Dependabot or Renovate config detected. Automated dependency updates are not configured.",
    });
  }

  allFindings.sort(
    (a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
  );

  // Build report
  const parts: string[] = [];
  parts.push("## Dependency Health Report");
  parts.push("");
  parts.push("**Repository**: " + ref.owner + "/" + ref.repo);
  for (const s of ecosystemSummaries) {
    parts.push("**" + s + "**");
  }
  parts.push(
    "**Automated updates**: " +
      (hasAutomatedDeps
        ? automatedToolName + " configured"
        : "Not configured")
  );
  parts.push("**Findings**: " + allFindings.length);
  parts.push("");

  if (allFindings.length === 0) {
    parts.push(
      "No dependency health issues detected. The dependency configuration looks clean."
    );
  } else {
    parts.push("### Findings");
    parts.push("");
    parts.push(
      "| Severity | Category | Package | Description |"
    );
    parts.push("| --- | --- | --- | --- |");

    for (const f of allFindings) {
      parts.push(
        "| **" +
          f.severity.toUpperCase() +
          "** | " +
          f.category +
          " | `" +
          f.name +
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

    // Upgrade priority list
    const priorityFindings = allFindings.filter(
      (f) =>
        f.severity === "critical" ||
        f.severity === "high"
    );
    if (priorityFindings.length > 0) {
      parts.push("");
      parts.push("### Upgrade Priority");
      parts.push("");
      let rank = 1;
      for (const f of priorityFindings) {
        parts.push(
          rank +
            ". **" +
            f.name +
            "** — " +
            f.description
        );
        rank++;
      }
    }

    if (!hasAutomatedDeps) {
      parts.push("");
      parts.push("### Recommendation: Enable Automated Updates");
      parts.push("");
      parts.push(
        "Create `.github/dependabot.yml` to get automated PRs for dependency updates:"
      );
      parts.push("```yaml");
      parts.push("version: 2");
      parts.push("updates:");

      for (const detected of detectedEcosystems) {
        const ecoType = detected.eco.name.startsWith("Node")
          ? "npm"
          : detected.eco.name.toLowerCase();
        parts.push("  - package-ecosystem: \"" + ecoType + "\"");
        parts.push("    directory: \"/\"");
        parts.push("    schedule:");
        parts.push("      interval: \"weekly\"");
      }
      parts.push("```");
    }
  }

  const summary = parts.join("\n");

  await runtimeTools.ui_notify(
    textPromptNotifyEvent({ type: "text", text: summary })
  );

  return { type: "text", text: summary };
}

export default agent({
  identifier: "dep-manager",
  description,
  inputSchema,
  outputSchema,
  tools,
  run,
});
