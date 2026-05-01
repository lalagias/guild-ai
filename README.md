# Guild AI Agent Lab

This workspace is a local lab for Guild.ai agent work, strategic planning, and repeatable demos.

Read `guild_context.md` before planning or implementing any Guild agent. It contains the engagement strategy, stakeholder context, backlog tiers, token-cost constraints, and long-term platform-contributor direction.

## Layout

```text
guild-ai/
├── agents/                 # One Guild-managed repo per deployable agent
├── docs/                   # Backlog, demo log, workflow notes, strategy memos
├── prompts/                # Reusable system prompts and demo prompts
├── guild_context.md        # Strategic source of truth
└── guild-cli-getting-started.md
```

## Operating Rules

- Use `guild agent init`, `guild agent clone`, `guild agent pull`, `guild agent test`, and `guild agent save` for agent lifecycle work.
- Keep each agent in its own `agents/<agent-name>` directory.
- Do not hand-edit `guild.json`.
- Keep quick-win agents separate from platform/harness initiatives.
- Prefer artifacts and demos over broad status updates.
