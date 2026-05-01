---
name: guild-cli-workflow
description: Guild CLI workflow for creating, cloning, forking, testing, saving, and publishing Guild agents. Use when running `guild agent` commands or organizing local agent directories.
---

# Guild CLI Workflow

Use the Guild CLI for agent lifecycle work. Do not replace Guild agent save/pull/publish with raw git commands.

## Common Commands

```powershell
guild auth status
guild doctor
guild setup
guild agent init --name my-agent --template LLM
guild agent init --fork owner/agent-name
guild agent clone owner/agent-name
guild agent pull
guild agent test --ephemeral
guild agent chat "Hello"
guild agent save --message "Describe the change" --wait
guild agent publish
```

## Local Layout

Each deployable agent should live in its own directory under `agents/<agent-name>` and have its own Guild-managed repo:

```text
agents/<agent-name>/
├── agent.ts
├── package.json
├── tsconfig.json
├── guild.json
└── .gitignore
```

Do not hand-edit `guild.json`; the CLI owns it.
