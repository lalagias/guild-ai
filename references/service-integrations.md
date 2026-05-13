# Service Integrations

Available service tools from `@guildai-services/*` packages.

## Import Pattern

```typescript
import { <toolSet> } from "@guildai-services/<org>~<name>"
```

**Important**: Don't add these packages to `package.json` - the Guild runtime provides them.

---

## First-Party Integrations

These are maintained by Guild (`guildai~*`):

### GitHub

```typescript
import { gitHubTools } from "@guildai-services/guildai~github"
```

Common tools:
- `github_repos_get` - Get repository details
- `github_pulls_list` - List pull requests
- `github_pulls_get` - Get single PR
- `github_issues_list` - List issues
- `github_issues_get` - Get single issue
- `github_issues_create` - Create issue
- `github_issues_create_comment` - Comment on issue
- `github_search_issues_and_pull_requests` - Search

### Slack

```typescript
import { slackTools } from "@guildai-services/guildai~slack"
```

Common tools:
- `slack_chat_post_message` - Send message to channel
- `slack_conversations_list` - List channels
- `slack_conversations_history` - Get channel messages
- `slack_users_list` - List users

### Jira

```typescript
import { jiraTools } from "@guildai-services/guildai~jira"
```

Common tools:
- `jira_issue_get` - Get issue details
- `jira_issue_create` - Create issue
- `jira_issue_update` - Update issue
- `jira_search` - Search with JQL

### Bitbucket

```typescript
import { bitbucketTools } from "@guildai-services/guildai~bitbucket"
```

### Azure DevOps

```typescript
import { azureDevOpsTools } from "@guildai-services/guildai~azure-devops"
```

### Confluence

```typescript
import { confluenceTools } from "@guildai-services/guildai~confluence"
```

### Figma

```typescript
import { figmaTools } from "@guildai-services/guildai~figma"
```

### Cypress

```typescript
import { cypressTools } from "@guildai-services/guildai~cypress"
```

### New Relic

```typescript
import { newrelicTools } from "@guildai-services/guildai~newrelic"
```

### TestRail

```typescript
import { testrailTools } from "@guildai-services/guildai~testrail"
```

---

## Custom Integrations

Organizations can publish custom integrations. Import pattern:

```typescript
import { myServiceTools } from "@guildai-services/<org>~<name>"
```

Example:

```typescript
import { firecrawlTools } from "@guildai-services/dkountanis~firecrawl"
```

---

## Credential Management

Credentials are configured at the organization level in **Settings > Credentials** at [app.guild.ai](https://app.guild.ai).

When an agent first uses a service tool:
1. Guild checks if credentials are configured
2. If not, prompts the user to connect via OAuth or API key
3. Credentials are stored securely and injected automatically

**Agents never see raw API keys or tokens.**

---

## Narrowing Tool Sets

Service tool sets can be large. Use `pick()` to include only what you need:

```typescript
import { pick } from "@guildai/agents-sdk"
import { gitHubTools } from "@guildai-services/guildai~github"

const tools = {
  ...pick(gitHubTools, [
    "github_repos_get",
    "github_pulls_list",
    "github_issues_create_comment",
  ]),
}
```

Benefits:
- Reduces LLM token cost (fewer tool definitions in prompt)
- Prevents unintended tool usage
- Makes agent behavior more predictable

---

## Creating Custom Integrations

If you need to connect to a service not listed above, you can create a custom integration:

```bash
# Create integration
guild integration create my-service \
  --base-url https://api.example.com \
  --auth-scheme api-key \
  --description "Connect to My Service"

# Add operations (from OpenAPI or manually)
guild integration operation create my-service --openapi ./openapi.yaml

# Build and publish
guild integration version build my-service --version-number 1.0.0
guild integration version publish my-service --version-number 1.0.0
```

See [CLI Reference](cli-reference.md#custom-integrations) for full details.
