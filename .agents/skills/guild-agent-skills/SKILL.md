---
name: guild-agent-skills
description: Build Guild.ai agents with AI assistance. Use when creating agent.ts files, running guild CLI commands, or working with @guildai/agents-sdk. Covers SDK patterns, CLI workflow, service integrations, and runtime constraints.
license: MIT
metadata:
  author: lalagias
  version: "1.0.2"
globs: ["**/agent.ts", "**/guild.json"]
---

# Guild.ai Agent Development

Build agents for Guild.ai - a control plane for AI agents handling orchestration, deployment, credentials, and governance.

## When to Use

- Creating or editing Guild `agent.ts` files
- Running `guild` CLI commands
- Working with `@guildai/agents-sdk`

---

## Quick Start

**1. Install & Auth**
```bash
npm i @guildai/cli -g
guild auth login
```

**2. Create Agent**
```bash
mkdir my-agent && cd my-agent
guild agent init --name my-agent --template LLM
```

**3. Test**
```bash
guild agent test --ephemeral
```

**4. Publish**
```bash
guild agent save --message "First version" --wait --publish
```

---

## Choose Your Agent Type

| Type | Use When | Complexity |
|------|----------|------------|
| `llmAgent` | Task is prompt + tools | Simple |
| `agent` + `"use agent"` | Need deterministic TypeScript | Moderate |
| `agent` + `start/onToolResults` | Need parallel tool calls | Advanced |

**Start with `llmAgent`** - only escalate when you need deterministic behavior or parallelism.

---

## Critical Constraints

| Constraint | Details |
|------------|---------|
| **Imports** | Only `@guildai/agents-sdk`, `zod`, `@guildai-services/*` |
| **No Node.js** | No `fs`, `path`, `http`, or npm packages |
| **No Promise.all** | Use self-managed agents for parallel calls |
| **CLI owns files** | Never edit `guild.json` manually |

---

## Examples

### llmAgent

```typescript
import { llmAgent, guildTools } from "@guildai/agents-sdk"
import { gitHubTools } from "@guildai-services/guildai~github"

export default llmAgent({
  description: "Reviews GitHub pull requests",
  tools: { ...gitHubTools, ...guildTools },
  systemPrompt: "You review PRs. Use GitHub tools to fetch details.",
  mode: "multi-turn",
})
```

### Coded Agent

```typescript
"use agent"

import { agent, type Task, userInterfaceTools, progressLogNotifyEvent } from "@guildai/agents-sdk"
import { gitHubTools } from "@guildai-services/guildai~github"
import { z } from "zod"

const inputSchema = z.object({
  type: z.literal("text"),
  text: z.string().describe("Repository in owner/repo format"),
})

const outputSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
})

const tools = { ...gitHubTools, ...userInterfaceTools }
type Tools = typeof tools

async function run(input: z.infer<typeof inputSchema>, task: Task<Tools>) {
  await task.ui?.notify(progressLogNotifyEvent("Fetching PRs..."))
  const [owner, repo] = input.text.split("/")
  const prs = await task.tools.github_pulls_list({ owner, repo, state: "open" })
  const summary = prs?.map((pr: any) => `- #${pr.number}: ${pr.title}`).join("\n") || "No open PRs"
  return { type: "text" as const, text: summary }
}

export default agent({ description: "Lists open PRs", inputSchema, outputSchema, tools, run })
```

---

## Workflow

```
init → edit → test --ephemeral → save → publish
```

---

## References

- [SDK Reference](references/sdk-reference.md) — `@guildai/agents-sdk` exports
- [CLI Reference](references/cli-reference.md) — All `guild` commands
- [Service Integrations](references/service-integrations.md) — `@guildai-services/*`
- [Constraints](references/constraints.md) — Runtime limitations

## Patterns

- [LLM Agent](patterns/llm-agent.md) — Prompt-driven agents
- [Coded Agent](patterns/coded-agent.md) — Auto-managed state
- [Self-Managed](patterns/self-managed-agent.md) — Parallel tools
- [Tool Selection](patterns/tools.md) — `pick()`, `omit()`

---

*Guild.ai evolves fast. Check https://docs.guild.ai/llms.txt for latest docs.*
