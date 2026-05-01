# cursor-cloud-coder

A Guild agent that dispatches Cursor cloud coding agents to work on GitHub repositories.

## What it does

1. Parses a GitHub repo URL and task description from the input.
2. Creates a Cursor cloud agent via the `cursor-cloud-agents` Guild integration.
3. The cloud agent runs in an isolated VM with full codebase indexing, semantic search, and code editing tools.
4. Polls the Cursor API every 10 seconds until the agent finishes (up to 20 minutes).
5. Returns the final status, branch name, PR URL, and a link to the Cursor dashboard.

If polling fails or the agent state can't be serialized across a suspension, it falls back to returning the agent ID and dashboard URL so you can check manually.

## Integration dependency

This agent requires the `dkountanis/cursor-cloud-agents` custom integration to be installed in the workspace with valid Cursor API credentials.

The integration proxies requests to `https://api.cursor.com/v1/` and handles authentication via Guild's credential vault.

## Tools used

- `cursor_cloud_agents_create_agent` -- Create a cloud agent with a prompt and repo
- `cursor_cloud_agents_get_run` -- Poll run status
- `cursor_cloud_agents_get_agent` -- Fetch agent metadata (branch, URL)

## Example

```
Fix the broken login flow in https://github.com/myorg/webapp
```

Returns:

```markdown
## Cursor Cloud Agent Result

- **Agent ID**: bc-abc123
- **Run ID**: run-def456
- **Repository**: https://github.com/myorg/webapp
- **Model**: composer-2
- **Dashboard**: https://cursor.com/agents?id=bc-abc123

- **Final Status**: FINISHED
- **Branch**: cursor/fix-login-flow
```
