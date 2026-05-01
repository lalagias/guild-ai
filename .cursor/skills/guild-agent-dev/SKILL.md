---
name: guild-agent-dev
description: Guild Agent SDK development patterns. Use when writing `agent.ts`, selecting SDK constructors, importing service tools, or troubleshooting Guild agent TypeScript.
---

# Guild Agent Development

Read `guild_context.md` before planning Guild work. For code-level Guild SDK patterns, follow these defaults.

## Imports

```typescript
import { agent, guildTools, llmAgent, pick, userInterfaceTools } from "@guildai/agents-sdk"
import { gitHubTools } from "@guildai-services/guildai~github"
import { z } from "zod"
```

Service integrations come from `@guildai-services/*`, not from `@guildai/agents-sdk`.

## Agent Shapes

- Use `llmAgent` for prompt-driven agents where the model is the logic.
- Use `agent` with `"use agent"` for deterministic code-first flows.
- Use self-managed state only when parallel tool calls or explicit save/restore loops are needed.

## Tool Rules

- Call tools through `task.tools.<toolName>(args)`.
- Use `pick(...)` to narrow service tool sets.
- Spread `guildTools` fully when included; do not pick individual Guild tools.
- Keep tool lists small to reduce prompt/tool-definition token cost.

## Strategic Constraint

If an agent needs repo indexing, semantic search, safe multi-file edits, credential vaulting, or MCP generation, classify that as harness/platform work unless Cursor or Claude Code can be used as the harness.
