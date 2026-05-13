---
name: guild-agent-dev
description: Build Guild.ai agents with AI assistance. Covers SDK, CLI, patterns, and constraints for the Guild.ai platform.
globs: ["**/agent.ts", "**/guild.json"]
---

# Guild.ai Agent Development

This skill helps you build agents for the Guild.ai platform - a control plane for AI agents that handles orchestration, deployment, credential management, and governance.

## When to Use This Skill

- Creating a new Guild agent
- Editing `agent.ts` files
- Running `guild` CLI commands
- Understanding Guild SDK patterns and constraints

## Quick Start

```bash
# 1. Install CLI
npm i @guildai/cli -g

# 2. Authenticate
guild auth login

# 3. Create agent
mkdir my-agent && cd my-agent
guild agent init --name my-agent --template LLM

# 4. Test (ephemeral = no version saved)
guild agent test --ephemeral

# 5. Save and publish
guild agent save --message "First version" --wait --publish
```

## Agent Type Decision Tree

```
Need to build an agent?
│
├─ Is the task expressible as a prompt + tools?
│  └─ YES → Use `llmAgent` (simplest, start here)
│
├─ Need deterministic TypeScript control flow?
│  └─ YES → Use `agent` with `"use agent"` directive (auto-managed state)
│
└─ Need parallel tool calls (e.g., fetch 10 issues at once)?
   └─ YES → Use `agent` with `start`/`onToolResults` (self-managed state)
```

**Default choice**: Start with `llmAgent`. Only escalate to coded agents when you need deterministic behavior or parallel execution.

## Critical Constraints

These constraints are enforced by Guild's sandboxed runtime:

1. **Limited imports**: Only `@guildai/agents-sdk`, `zod`, and `@guildai-services/*` packages are available. No external npm packages. No Node.js built-ins (`fs`, `path`, `http`).

2. **Babel compiler limits** (for `"use agent"` agents): No `Promise.all`, `Promise.any`, `Promise.race`. Parallel tool calls require self-managed state agents.

3. **CLI-managed files**: Never edit `guild.json`. Don't add SDK packages to `package.json` - the runtime provides them.

See [Constraints Reference](references/constraints.md) for full details.

## Minimal Examples

### llmAgent (Prompt + Tools)

```typescript
import { llmAgent, guildTools } from "@guildai/agents-sdk"
import { gitHubTools } from "@guildai-services/guildai~github"

export default llmAgent({
  description: "Reviews GitHub pull requests",
  tools: { ...gitHubTools, ...guildTools },
  systemPrompt: `You review pull requests. Use GitHub tools to fetch PR details.`,
  mode: "multi-turn",
})
```

### Coded Agent (Auto-managed State)

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
  
  const prs = await task.tools.github_pulls_list({
    owner: input.text.split("/")[0],
    repo: input.text.split("/")[1],
    state: "open",
  })

  const summary = prs?.map((pr: any) => `- #${pr.number}: ${pr.title}`).join("\n") || "No open PRs"
  return { type: "text" as const, text: summary }
}

export default agent({
  description: "Lists open PRs in a GitHub repo",
  inputSchema,
  outputSchema,
  tools,
  run,
})
```

## Development Workflow

```
guild agent init          # Create new agent
       ↓
  Edit agent.ts           # Write your code
       ↓
guild agent test --ephemeral  # Test without saving version
       ↓
guild agent save --message "..."  # Commit and upload
       ↓
guild agent publish       # Make available to organization
```

## References

Detailed documentation for each area:

- [SDK Reference](references/sdk-reference.md) - All exports from `@guildai/agents-sdk`
- [CLI Reference](references/cli-reference.md) - All `guild` commands
- [Service Integrations](references/service-integrations.md) - Available `@guildai-services/*` packages
- [Constraints](references/constraints.md) - Runtime limitations and gotchas

## Patterns

Best practices and anti-patterns for each agent type:

- [LLM Agent Patterns](patterns/llm-agent.md)
- [Coded Agent Patterns](patterns/coded-agent.md) (auto-managed state)
- [Self-Managed Agent Patterns](patterns/self-managed-agent.md)
- [Tool Selection Patterns](patterns/tools.md)

## Version Note

Guild.ai is actively evolving. For the most current API reference, fetch the official documentation index:

```
https://docs.guild.ai/llms.txt
```
