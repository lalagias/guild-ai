---
name: guild-context
description: Read Guild.ai engagement context, stakeholder strategy, backlog tiers, and sequencing constraints. Use whenever planning, building, prioritizing, pricing, or discussing Guild.ai agents, Guild CLI work, Bryce, Christina, Moccalabs, Symphony-style orchestration, multi-agent pipelines, MCP catalog, RCA, documentation agents, or issue triage.
---

# Guild.ai Context

Before planning or implementing Guild.ai work, read `guild_context.md` from the workspace root.

Use that file as the source of truth for:

- Guild.ai stakeholder context.
- Dimitris and Moccalabs positioning.
- Strategic goal of moving from per-agent work to system/platform contribution.
- Agent backlog tiers.
- Build sequencing.
- Multi-agent handoff design.
- Token-cost constraints.
- Harness versus one-off agent boundaries.
- Pricing and engagement strategy.

When producing a Guild agent plan:

1. Identify the requested build's backlog tier.
2. State whether prerequisites exist.
3. Prefer outputs that feed another agent or workflow.
4. Estimate token cost and flag runs likely to exceed 500k tokens.
5. Use Cursor or Claude Code as a harness for code-heavy work instead of rebuilding indexing/search inside the agent.
6. Treat Linear, GitHub, tickets, PRs, alerts, and docs as control surfaces.
7. Keep 1-2 week agent builds separate from platform infrastructure initiatives.
