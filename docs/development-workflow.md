# Guild Development Workflow

## Environment

Current verified state:

- Guild CLI auth: authenticated as `dkountanis`.
- Default Guild workspace: `developer-sandbox`.
- Root `guild-ai` directory is intentionally not an agent directory.
- `guild setup` has already installed `.claude/skills` and `.mcp.json`; rerun with `--force` only if you intentionally want to overwrite them.

## Agent Directories

Each deployable Guild agent should live under `agents/<agent-name>` and be managed by the Guild CLI.

For a separate editable copy of an existing agent:

```powershell
cd C:\Users\Dimitris\projects\guild-ai
mkdir agents
cd agents
guild agent init --fork owner/agent-name
```

Current CLI behavior observed on Windows: non-interactive fork init required both `--name` and `--template`.

```powershell
mkdir agents\documenter
cd agents\documenter
guild agent init --name documenter --template LLM --fork bryceheltzel/documenter
```

If that scaffolds a fresh template instead of pulling the source, fetch the source with:

```powershell
guild agent code bryceheltzel/documenter
```

For direct local work on an agent you have access to:

```powershell
cd C:\Users\Dimitris\projects\guild-ai
mkdir agents
cd agents
guild agent clone owner/agent-name
```

## Test And Save

```powershell
guild agent test --ephemeral
guild agent chat "Test input"
guild agent save --message "Describe the change" --wait
```

Use `guild agent save --wait --publish` only when the version is ready to publish.

## Notes

- Prefer `--ephemeral` while iterating to avoid noisy version history.
- If a command fails due to missing access, ask Bryce to share/install the agent or grant workspace access.
- Record important CLI discoveries in this file so future agents do not relearn them.
- On Windows, avoid Unix-only package scripts like `cp` and `rm -rf` if local builds matter. Use small Node scripts instead.
