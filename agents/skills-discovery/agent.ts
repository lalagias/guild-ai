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
import { SkillsShTools } from "@guildai-services/dkountanis~skills-sh";
import { z } from "zod";

import description from "./description.md";

const inputSchema = z.object({
  type: z.literal("text"),
  text: z
    .string()
    .describe(
      "Natural language query describing what skill or capability you need (e.g. 'code review skill', 'React Native development', 'CI/CD optimization'). Optionally prefix with 'curated: true |' to only show official first-party skills."
    ),
});
type Input = z.infer<typeof inputSchema>;

const outputSchema = z.object({
  type: z.literal("text"),
  text: z
    .string()
    .describe(
      "Ranked skill recommendations with install counts, security audit status, and install commands."
    ),
});
type Output = z.infer<typeof outputSchema>;

const tools = {
  ...pick(SkillsShTools, [
    "skills_sh_search",
    "skills_sh_get_detail",
    "skills_sh_get_audit",
    "skills_sh_curated",
  ]),
  ...pick(userInterfaceTools, ["ui_notify"]),
};
type Tools = typeof tools;

interface ParsedInput {
  query: string;
  curatedOnly: boolean;
}

function parseInput(text: string): ParsedInput {
  let query = text.trim();
  let curatedOnly = false;

  const curatedMatch = query.match(
    /^curated:\s*true\s*\|\s*/i
  );
  if (curatedMatch) {
    curatedOnly = true;
    query = query.slice(curatedMatch[0].length).trim();
  }

  return { query, curatedOnly };
}

interface SkillResult {
  id: string;
  name: string;
  slug: string;
  source: string;
  installs: number;
  installUrl: string | null;
  url: string;
  isCurated: boolean;
  isDuplicate: boolean;
  description: string;
  auditStatus: string;
  auditSummary: string;
  riskLevel: string;
}

function truncate(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen - 3) + "...";
}

function extractDescription(skillMd: string): string {
  const lines = skillMd.split("\n");
  const contentLines: string[] = [];
  let inFrontmatter = false;
  let pastFrontmatter = false;

  for (const line of lines) {
    if (line.trim() === "---" && !pastFrontmatter) {
      if (inFrontmatter) {
        pastFrontmatter = true;
      } else {
        inFrontmatter = true;
      }
      continue;
    }
    if (inFrontmatter && !pastFrontmatter) continue;

    if (line.startsWith("#")) continue;
    const trimmed = line.trim();
    if (trimmed.length > 0) {
      contentLines.push(trimmed);
    }
    if (contentLines.length >= 3) break;
  }

  return contentLines.join(" ").slice(0, 200) || "(no description)";
}

async function run(input: Input, task: Task<Tools>): Promise<Output> {
  const runtimeTools = (task as any).tools as any;
  const parsed = parseInput(input.text);

  if (parsed.query.length < 2) {
    await runtimeTools.ui_notify(
      errorNotifyEvent("Query too short. Please describe what skill you need.")
    );
    return {
      type: "text",
      text: "## Search Failed\n\nQuery must be at least 2 characters.",
    };
  }

  await runtimeTools.ui_notify(
    progressLogNotifyEvent(
      "Searching skills.sh for: \"" + parsed.query + "\"" +
      (parsed.curatedOnly ? " (curated only)" : "") + "..."
    )
  );

  // Fetch curated skills for badge matching
  let curatedIds = new Set<string>();
  try {
    const curatedResult = await runtimeTools.skills_sh_curated({});
    const curatedData = curatedResult.data || curatedResult || [];
    if (Array.isArray(curatedData)) {
      for (const owner of curatedData) {
        const skills = owner.skills || [];
        for (const s of skills) {
          if (s.id) curatedIds.add(s.id);
        }
      }
    }
  } catch (_e) {
    // Curated fetch is optional enrichment
  }

  // Search for skills
  let searchResults: any[] = [];
  try {
    const searchResponse = await runtimeTools.skills_sh_search({
      q: parsed.query,
      limit: 10,
    });
    searchResults = searchResponse.data || searchResponse || [];
  } catch (e: any) {
    await runtimeTools.ui_notify(
      errorNotifyEvent(
        "Search failed: " + (e.message || "unknown error")
      )
    );
    return {
      type: "text",
      text: "## Search Failed\n\nCould not search skills.sh: " + (e.message || "unknown"),
    };
  }

  if (!Array.isArray(searchResults) || searchResults.length === 0) {
    return {
      type: "text",
      text: "## No Results\n\nNo skills found matching \"" + parsed.query + "\" on skills.sh.",
    };
  }

  // Filter duplicates and optionally curated-only
  let filtered = searchResults.filter(
    (s: any) => !s.isDuplicate
  );
  if (parsed.curatedOnly) {
    filtered = filtered.filter((s: any) =>
      curatedIds.has(s.id)
    );
  }

  const top = filtered.slice(0, 5);

  await runtimeTools.ui_notify(
    progressLogNotifyEvent(
      "Found " + filtered.length + " skill(s). Fetching details for top " + top.length + "..."
    )
  );

  const results: SkillResult[] = [];

  for (const skill of top) {
    const id = skill.id || "";
    const name = skill.name || skill.slug || id;
    const slug = skill.slug || "";
    const source = skill.source || "";
    const installs = skill.installs || 0;
    const installUrl = skill.installUrl || null;
    const url = skill.url || "https://skills.sh/" + id;
    const isCurated = curatedIds.has(id);
    const isDuplicate = !!skill.isDuplicate;

    let skillDescription = "";
    try {
      const detail = await runtimeTools.skills_sh_get_detail({
        source: source,
        skill: slug,
      });

      const files = detail.files || [];
      const skillMd = files.find(
        (f: any) => f.path === "SKILL.md" || f.path?.endsWith("/SKILL.md")
      );
      if (skillMd && skillMd.contents) {
        skillDescription = extractDescription(skillMd.contents);
      }
    } catch {
      skillDescription = "(details unavailable)";
    }

    let auditStatus = "unknown";
    let auditSummary = "No audit data";
    let riskLevel = "UNKNOWN";

    try {
      const audit = await runtimeTools.skills_sh_get_audit({
        source: source,
        skill: slug,
      });

      const audits = audit.audits || [];
      if (audits.length > 0) {
        const failedAudits = audits.filter(
          (a: any) => a.status === "fail"
        );
        const warnAudits = audits.filter(
          (a: any) => a.status === "warn"
        );

        if (failedAudits.length > 0) {
          auditStatus = "FAIL";
          auditSummary = failedAudits[0].summary || "Failed audit";
          riskLevel = failedAudits[0].riskLevel || "HIGH";
        } else if (warnAudits.length > 0) {
          auditStatus = "WARN";
          auditSummary = warnAudits[0].summary || "Review recommended";
          riskLevel = warnAudits[0].riskLevel || "MEDIUM";
        } else {
          auditStatus = "PASS";
          auditSummary =
            audits.length + " audit(s) passed";
          riskLevel = "LOW";
        }
      }
    } catch {
      // Audit may not exist yet for new skills
    }

    results.push({
      id,
      name,
      slug,
      source,
      installs,
      installUrl,
      url,
      isCurated,
      isDuplicate,
      description: skillDescription,
      auditStatus,
      auditSummary,
      riskLevel,
    });
  }

  await runtimeTools.ui_notify(
    progressLogNotifyEvent("Building recommendations...")
  );

  const parts: string[] = [];
  parts.push("## Skills Discovery Results");
  parts.push("");
  parts.push("**Query**: " + parsed.query);
  parts.push("**Results**: " + results.length + " skill(s)");
  parts.push("");

  parts.push("### Ranked Recommendations");
  parts.push("");
  parts.push(
    "| # | Skill | Installs | Audit | Official | Risk |"
  );
  parts.push("| --- | --- | --- | --- | --- | --- |");

  let rank = 1;
  for (const r of results) {
    parts.push(
      "| " +
        rank +
        " | [" +
        r.name +
        "](" +
        r.url +
        ") | " +
        r.installs.toLocaleString() +
        " | " +
        r.auditStatus +
        " | " +
        (r.isCurated ? "Yes" : "-") +
        " | " +
        r.riskLevel +
        " |"
    );
    rank++;
  }

  parts.push("");
  parts.push("### Details");

  for (const r of results) {
    parts.push("");
    parts.push("#### " + r.name);
    parts.push("");
    parts.push("- **Source**: `" + r.source + "`");
    parts.push("- **Installs**: " + r.installs.toLocaleString());
    parts.push("- **Audit**: " + r.auditStatus + " — " + r.auditSummary);
    if (r.isCurated) {
      parts.push("- **Official**: First-party skill from the technology maker");
    }
    parts.push("");
    parts.push(truncate(r.description, 200));

    if (r.installUrl) {
      parts.push("");
      parts.push("```");
      parts.push("npx skills add " + r.installUrl);
      parts.push("```");
    }

    if (r.auditStatus === "FAIL") {
      parts.push("");
      parts.push(
        "**Warning**: This skill failed security audit. Review before installing."
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
  identifier: "skills-discovery",
  description,
  inputSchema,
  outputSchema,
  tools,
  run,
});
