# Guild Agent Skills

[![skills.sh](https://skills.sh/b/lalagias/guild-agent-skills)](https://skills.sh/lalagias/guild-agent-skills)

A [skills.sh](https://skills.sh) skill that helps AI coding assistants (Cursor, Claude Code, etc.) build agents for the [Guild.ai](https://guild.ai) platform.

## What This Skill Does

When installed, this skill enables your AI assistant to:

- Create new Guild agents with the correct structure and patterns
- Choose the right agent type (llmAgent, auto-managed, self-managed)
- Use the Guild SDK correctly (`@guildai/agents-sdk`, `@guildai-services/*`)
- Avoid common pitfalls (sandboxed runtime, Babel compiler limitations)
- Run Guild CLI commands for testing and publishing

## Installation

```bash
npx skills add lalagias/guild-agent-skills
```

Works with Cursor, Claude Code, Windsurf, and other AI coding agents.

Alternatively, manually copy the skill files to your project's `.claude/skills/` or `.cursor/skills/` directory.

## Contents

```
guild-agent-skill/
├── SKILL.md                    # Main entry point
├── references/
│   ├── sdk-reference.md        # @guildai/agents-sdk exports
│   ├── cli-reference.md        # Guild CLI commands
│   ├── service-integrations.md # Available service tools
│   └── constraints.md          # Runtime limitations
└── patterns/
    ├── llm-agent.md            # llmAgent best practices
    ├── coded-agent.md          # Auto-managed state patterns
    ├── self-managed-agent.md   # Parallel tool calls
    └── tools.md                # Tool selection patterns
```

## Quick Start

Once the skill is installed, ask your AI assistant:

> "Create a new Guild agent that reviews GitHub pull requests"

The AI will:
1. Guide you through `guild agent init`
2. Generate the correct `agent.ts` code
3. Help you test with `guild agent test --ephemeral`
4. Publish with `guild agent save --publish`

## Prerequisites

- Node.js 18+
- Guild account (contact Guild for access)
- Guild CLI installed: `npm i @guildai/cli -g`

## Links

- [Guild.ai Documentation](https://docs.guild.ai)
- [Guild.ai Platform](https://app.guild.ai)
- [skills.sh](https://skills.sh)

## Contributing

Issues and PRs welcome. This skill is maintained to stay current with the Guild.ai SDK and CLI.

## License

MIT
