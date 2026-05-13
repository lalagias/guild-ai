# Tool Selection Patterns

Best practices for selecting and using tools in Guild agents.

---

## Core Principle

**Keep tool sets small.** Every tool included in your agent:
- Adds tokens to the LLM prompt (cost)
- Gives the LLM more options to choose from (potential confusion)
- Increases the surface area for unintended behavior

---

## Good Patterns

### Use pick() to Narrow Service Tools

```typescript
import { pick } from "@guildai/agents-sdk"
import { gitHubTools } from "@guildai-services/guildai~github"

// GOOD: Only include tools the agent actually needs
const tools = {
  ...pick(gitHubTools, [
    "github_repos_get",
    "github_pulls_list",
    "github_pulls_get",
  ]),
  ...guildTools,
}
```

### Spread guildTools Fully

```typescript
import { guildTools } from "@guildai/agents-sdk"

// GOOD: Always spread fully
const tools = {
  ...guildTools,
  ...otherTools,
}

// BAD: Don't pick from guildTools
const tools = {
  ...pick(guildTools, ["guild_get_me"]),  // Don't do this
}
```

**Why?** `guildTools` includes credential request tools that may be needed dynamically.

### Include Tools Based on Features Used

| If your agent needs... | Include... |
|------------------------|------------|
| User notifications/prompts | `userInterfaceTools` |
| Platform API access | `guildTools` |
| Debug logging for LLMs | `consoleTools` |
| GitHub operations | `pick(gitHubTools, [...])` |
| Slack messaging | `pick(slackTools, [...])` |

### Match Tools to Task Object Usage

```typescript
// If you access task.ui, include userInterfaceTools
const tools = { ...userInterfaceTools }
// Now task.ui is available

// If you access task.guild, include guildTools
const tools = { ...guildTools }
// Now task.guild is available
```

---

## Anti-Patterns

### Including Everything "Just in Case"

```typescript
// BAD: Massive tool set
const tools = {
  ...gitHubTools,       // 50+ tools
  ...slackTools,        // 30+ tools
  ...jiraTools,         // 40+ tools
  ...confluenceTools,   // 20+ tools
  ...guildTools,        // 55+ tools
  ...userInterfaceTools,
  ...consoleTools,
}
// Result: 200+ tools in prompt, high cost, confused LLM
```

### Adding userInterfaceTools to llmAgent

```typescript
// BAD: Redundant - llmAgent auto-includes this
export default llmAgent({
  tools: {
    ...gitHubTools,
    ...userInterfaceTools,  // Already included automatically
  },
})
```

```typescript
// GOOD
export default llmAgent({
  tools: {
    ...gitHubTools,
    ...guildTools,
  },
})
```

### Accessing Services Without Tool Sets

```typescript
// BAD: task.ui will be undefined
const tools = { ...gitHubTools }

async function run(input, task) {
  await task.ui?.notify(...)  // task.ui is undefined
  await task.guild?.search_agent(...)  // task.guild is undefined
}
```

```typescript
// GOOD: Include required tool sets
const tools = {
  ...gitHubTools,
  ...userInterfaceTools,  // Enables task.ui
  ...guildTools,          // Enables task.guild
}
```

### Using omit() Incorrectly

```typescript
// RISKY: Might accidentally exclude needed tools
const tools = {
  ...omit(gitHubTools, ["github_repos_delete"]),
}
// Still includes 49+ tools you might not need
```

```typescript
// BETTER: Explicitly include what you need
const tools = {
  ...pick(gitHubTools, ["github_repos_get", "github_pulls_list"]),
}
```

---

## Tool Categories

### Service Tools (`@guildai-services/*`)

External API integrations. Always narrow with `pick()`.

```typescript
import { gitHubTools } from "@guildai-services/guildai~github"
import { slackTools } from "@guildai-services/guildai~slack"

const tools = {
  ...pick(gitHubTools, ["github_issues_get"]),
  ...pick(slackTools, ["slack_chat_post_message"]),
}
```

### Platform Tools (`guildTools`)

Guild API access. Spread fully.

```typescript
import { guildTools } from "@guildai/agents-sdk"

const tools = { ...guildTools }
```

### UI Tools (`userInterfaceTools`)

User interaction. Include when you need `task.ui`.

```typescript
import { userInterfaceTools } from "@guildai/agents-sdk"

// For coded agents - llmAgent auto-includes this
const tools = { ...userInterfaceTools, ...otherTools }
```

### Console Tools (`consoleTools`)

Debug logging. Include to give LLMs logging access.

```typescript
import { consoleTools } from "@guildai/agents-sdk"

// task.console is always available, but include this
// to let LLMs call console_log as a tool
const tools = { ...consoleTools, ...otherTools }
```

### No Tools (`noTools`)

Explicit marker for agents that need no tools.

```typescript
import { noTools } from "@guildai/agents-sdk"

export default agent({
  tools: noTools,
  run: async (input) => ({ result: input.value * 2 }),
})
```

---

## Calling Tools

### In Coded Agents

```typescript
// Access through task.tools
const pr = await task.tools.github_pulls_get({
  owner: "org",
  repo: "repo",
  pull_number: 42,
})

await task.tools.slack_chat_post_message({
  channel: "C123",
  text: "PR merged!",
})
```

### In Self-Managed Agents

```typescript
import { callTools } from "@guildai/agents-sdk"

// Request tool execution
return callTools([
  {
    toolName: "github_issues_get",
    args: { owner: "org", repo: "repo", issue_number: 1 },
  },
  {
    toolName: "github_issues_get",
    args: { owner: "org", repo: "repo", issue_number: 2 },
  },
])
```

---

## Tool Naming Convention

Service tools follow the pattern: `{service}_{resource}_{action}`

Examples:
- `github_repos_get`
- `github_pulls_list`
- `github_issues_create_comment`
- `slack_chat_post_message`
- `jira_issue_create`

Guild tools follow: `guild_{action}` or `guild_{resource}_{action}`

Examples:
- `guild_get_me`
- `guild_search_agent`
- `guild_credentials_request`

---

## Discovering Available Tools

1. **Check the service integration docs** for available tools
2. **Use TypeScript autocomplete** on the imported tool set
3. **Browse the Guild Integration Hub** for tool descriptions

```typescript
import { gitHubTools } from "@guildai-services/guildai~github"

// Type gitHubTools. to see available tools via autocomplete
const availableTools = Object.keys(gitHubTools)
```
