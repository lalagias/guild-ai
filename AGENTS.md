# AGENTS.md

This file provides guidance to AI coding agents (Cursor, Claude Code, Windsurf, etc.) when working with code in this repository.

## Repository Overview

A skill for AI coding agents that provides procedural knowledge for building Guild.ai agents. Covers the Guild SDK, CLI, patterns, and runtime constraints.

## Skill Structure

```
guild-agent-skill/
├── SKILL.md                    # Main entry point (required)
├── references/                 # Detailed reference documentation
│   ├── sdk-reference.md        # @guildai/agents-sdk exports
│   ├── cli-reference.md        # Guild CLI commands
│   ├── service-integrations.md # @guildai-services/* packages
│   └── constraints.md          # Runtime limitations
└── patterns/                   # Best practices and anti-patterns
    ├── llm-agent.md            # llmAgent patterns
    ├── coded-agent.md          # Auto-managed state patterns
    ├── self-managed-agent.md   # Self-managed state patterns
    └── tools.md                # Tool selection patterns
```

## Updating This Skill

### When to Update

- Guild.ai releases SDK changes
- New CLI commands are added
- New service integrations become available
- Patterns or constraints change

### How to Update

1. **Check official docs first**: Fetch `https://docs.guild.ai/llms.txt` for the current documentation index
2. **Update relevant files**: Modify the specific reference or pattern file
3. **Keep SKILL.md concise**: It should be under 500 lines - put details in reference files
4. **Test the skill**: Install locally and verify AI assistants can use it correctly

### File Guidelines

- **SKILL.md**: Quick start, decision tree, links to references. Keep under 500 lines.
- **references/*.md**: Detailed API/CLI documentation. Can be longer.
- **patterns/*.md**: Best practices with good/bad examples. Focus on actionable guidance.

### Frontmatter Format

SKILL.md uses this frontmatter:

```yaml
---
name: guild-agent-dev
description: Build Guild.ai agents with AI assistance...
license: MIT
metadata:
  author: lalagias
  version: "1.0.0"
globs: ["**/agent.ts", "**/guild.json"]
---
```

## Contributing

1. Fork the repository
2. Make your changes
3. Test with an AI assistant (Cursor, Claude Code)
4. Submit a pull request

## External Resources

- Guild.ai Documentation: https://docs.guild.ai
- Guild.ai Platform: https://app.guild.ai
- Documentation Index (for AI): https://docs.guild.ai/llms.txt
