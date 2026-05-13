# CLI Reference

Complete reference for the Guild CLI (`@guildai/cli`).

## Installation

```bash
npm i @guildai/cli -g
```

Requires Node.js 18+ and a Guild account.

---

## Authentication

```bash
guild auth login      # Log in via browser OAuth
guild auth logout     # Remove stored token
guild auth status     # Show authentication state
guild auth token      # Print current auth token
```

---

## Agent Development

### Create Agent

```bash
guild agent init                              # Interactive prompts
guild agent init --name my-agent              # With name
guild agent init --name my-agent --template LLM  # With template
guild agent init --fork owner/agent-name      # Fork existing agent
```

**Templates**:

| Template | Use When |
|----------|----------|
| `LLM` | LLM drives logic. Write a prompt and pick tools. **Start here.** |
| `AUTO_MANAGED_STATE` | Procedural TypeScript that calls tools inline. |
| `BLANK` | Full control over agent lifecycle. |

### Test Agent

```bash
guild agent test              # Interactive chat session
guild agent test --ephemeral  # Test without saving version
guild agent chat "Hello"      # Send a single message
```

**Tip**: Use `--ephemeral` while iterating to avoid noisy version history.

### Save and Publish

```bash
guild agent save --message "Add feature"              # Save as draft
guild agent save --message "Fix bug" --wait           # Wait for validation
guild agent save --message "Ship it" --wait --publish # Save and publish

guild agent publish       # Publish latest draft
guild agent unpublish     # Unpublish from organization
guild agent revalidate    # Re-run validation
```

### Sync and Discovery

```bash
guild agent pull                    # Pull remote changes
guild agent get                     # Agent info and current version
guild agent versions                # Version history
guild agent code                    # View source of latest version

guild agent list                    # List your agents
guild agent search "code review"    # Search published agents
guild agent clone owner/agent-name  # Clone agent locally
```

### Tags

```bash
guild agent tags list              # List tags on current agent
guild agent tags add analytics     # Add a tag
guild agent tags remove analytics  # Remove a tag
```

---

## Workspace Management

```bash
guild workspace list                    # List accessible workspaces
guild workspace create <name>           # Create workspace
guild workspace get <identifier>        # Get workspace details
guild workspace select                  # Set default (interactive)
guild workspace select <id-or-name>     # Set default directly
guild workspace current                 # Show current default
```

### Workspace Agents

```bash
guild workspace agent list              # List installed agents
guild workspace agent add <identifier>  # Install agent
guild workspace agent remove <id>       # Remove agent
```

### Workspace Context

```bash
guild workspace context list <workspace-id>                      # List versions
guild workspace context get <workspace-id> <context-id>          # Get version
guild workspace context edit <workspace-id>                      # Edit in $EDITOR
guild workspace context edit <workspace-id> --from <context-id>  # Edit from version
guild workspace context publish <workspace-id> <context-id>      # Publish draft
```

---

## Chat

```bash
guild chat                           # Chat with Guild assistant
guild chat "Summarize my open PRs"   # With initial message
guild chat --agent <identifier>      # Chat with specific agent
guild chat --workspace <identifier>  # Use specific workspace
guild chat --once "What is 2+2?"     # One-shot mode
guild chat --resume <session-id>     # Resume session
```

**Note**: To chat with the agent you're developing, use `guild agent chat` from inside the agent directory.

---

## Sessions

```bash
guild session list                      # List sessions in default workspace
guild session list --workspace <id>     # Specify workspace
guild session list --type chat          # Filter: chat, webhook, time, agent_test
guild session get <session-id>          # Get session details
guild session events <session-id>       # Stream session events
guild session tasks <session-id>        # List tasks in session
guild session send <session-id> <msg>   # Send message to active session
```

---

## Triggers

```bash
guild trigger list                      # List triggers
guild trigger get <trigger-id>          # Get trigger details
guild trigger sessions <trigger-id>     # List sessions from trigger

# Create webhook trigger
guild trigger create --type webhook --service SLACK --event app_mention --agent <id>

# Create time trigger
guild trigger create --type time --frequency DAILY --time 09:00 --agent <id>

guild trigger update <trigger-id> --time 10:00
guild trigger activate <trigger-id>
guild trigger deactivate <trigger-id>
```

---

## Custom Integrations

### Management

```bash
guild integration list                    # List integrations
guild integration list --search "deploy"  # Search
guild integration list --published        # Only published
guild integration get <id_or_name>        # Get details
```

### Create Integration

```bash
# API key auth
guild integration create my-service \
  --base-url https://api.example.com \
  --auth-scheme api-key \
  --description "Connect to Acme API"

# OAuth auth
guild integration create my-oauth-service \
  --base-url https://api.example.com \
  --auth-scheme oauth \
  --install-url https://example.com/oauth/authorize \
  --token-url https://example.com/oauth/token \
  --client-id <id> --client-secret <secret> \
  --scopes "read,write"

guild integration update myorg~my-service --description "Updated"
```

### Credentials

```bash
guild integration connect myorg~my-service                  # Interactive
guild integration connect myorg~my-service --token <value>  # Non-interactive
```

### Versions

```bash
guild integration version list <id_or_name>
guild integration version create <id_or_name>               # Create draft
guild integration version get <id_or_name>                  # Latest version
guild integration version get <id_or_name> --version-number 1.0.0

guild integration version build <id_or_name> --version-number 1.0.0    # Validate
guild integration version publish <id_or_name> --version-number 1.0.0  # Publish
```

### Operations (Endpoints)

```bash
# List operations
guild integration operation list <id_or_name>
guild integration operation list <id_or_name> --version-number 1.0.0

# Add manually
guild integration operation create myorg~my-service \
  --operation list_users \
  --method GET \
  --path /users \
  --summary "List all users"

# Import from OpenAPI
guild integration operation create myorg~my-service --openapi ./openapi.yaml
```

### Test

```bash
guild integration version test myorg~my-service \
  --operation list_users \
  --account my-account \
  --input-query '{"limit": 10}'
```

---

## Configuration

```bash
guild config list               # Show all config values
guild config get <key>          # Read value
guild config set <key> <value>  # Write value
guild config path               # Show config file path
```

Keys: `default_workspace`, `debug`, `json`, `quiet`

---

## Utilities

```bash
guild doctor     # Diagnose setup (auth, server, workspace, git)
guild setup      # Install coding assistant skills
guild version    # Show CLI version
```

### `guild doctor` Output

```
Checking Guild CLI setup...

  ✓ Authentication       Logged in
  ✓ Server               Connected to https://app.guild.ai/api (125ms)
  ✓ Global config        ~/.guild/config.json
  ✓ Default workspace    my-workspace
  - Local config         Not in an agent directory
  ✓ Git                  Installed

5 passed, 0 failed, 1 skipped
```

---

## Project Structure

After `guild agent init`:

```
my-agent/
├── agent.ts          # Your agent code (edit this)
├── package.json      # Dependencies (runtime pre-configured)
├── tsconfig.json     # TypeScript config
├── guild.json        # Local config (managed by CLI, don't edit)
└── .gitignore
```

---

## Key Rules

1. Agent code lives at `agent.ts` in project root
2. Don't add SDK packages to `package.json` - runtime provides them
3. Call tools through `task.tools.<name>(args)`
4. Use `guild agent save` to commit - don't use raw git commands
5. Don't edit `guild.json` - it's managed by the CLI
