# SDK Reference

Complete reference for `@guildai/agents-sdk` - the core package for building Guild agents.

## Agent Constructors

### `llmAgent`

Creates a prompt-driven agent where the LLM controls the logic.

```typescript
import { llmAgent, guildTools } from "@guildai/agents-sdk"

export default llmAgent({
  description: "What the agent does (shown to users and LLMs)",
  tools: { ...guildTools },
  systemPrompt: "Instructions for the LLM",
  mode: "one-shot" | "multi-turn",  // default: "one-shot"
})
```

**Fixed schemas**: `llmAgent` uses fixed input/output schemas:
```typescript
type Input = { type: "text"; text: string }
type Output = { type: "text"; text: string }
```

**Mode**:
- `"one-shot"` (default): Agent responds once and terminates
- `"multi-turn"`: Agent continues until it calls `__submit__` tool

**Auto-includes**: `userInterfaceTools` is automatically included - don't add it manually.

### `agent`

Creates a coded agent with explicit TypeScript logic.

```typescript
import { agent, type Task } from "@guildai/agents-sdk"
import { z } from "zod"

export default agent({
  description: "What the agent does",
  inputSchema: z.object({ /* ... */ }),
  outputSchema: z.object({ /* ... */ }),
  tools: { /* ... */ },
  run: async (input, task) => { /* ... */ },  // Auto-managed state
  // OR for self-managed state:
  stateSchema: z.object({ /* ... */ }),
  start: async (input, task) => { /* ... */ },
  onToolResults: async (results, task) => { /* ... */ },
})
```

---

## Tool Sets

### `guildTools`

Platform tools for Guild API access. **Always spread fully** - don't use `pick()` on this.

```typescript
import { guildTools } from "@guildai/agents-sdk"

const tools = { ...guildTools }
```

Includes 55+ tools for:
- Current user: `guild_get_me`, `guild_get_my_workspaces`
- Agents: `guild_list_agents`, `guild_search_agent`, `guild_get_agent_code`
- Workspaces: `guild_get_workspace`, `guild_get_workspace_contexts`
- Triggers: `guild_create_workspace_trigger`, `guild_activate_trigger`
- Credentials: `guild_credentials_request`
- HTTP: `guild_experimental_fetch`

**Enables**: `task.guild` service

### `userInterfaceTools`

Tools for user interaction.

```typescript
import { userInterfaceTools } from "@guildai/agents-sdk"
```

| Tool | Description |
|------|-------------|
| `ui_prompt` | Ask user a question, block until response |
| `ui_notify` | Fire-and-forget notification |
| `ui_ping` | Health check (testing) |

**Enables**: `task.ui` service

**Note**: Auto-included in `llmAgent` - only add explicitly for coded agents.

### `consoleTools`

Debug logging tools.

```typescript
import { consoleTools } from "@guildai/agents-sdk"
```

| Tool | Description |
|------|-------------|
| `console_log` | Log at debug/info/warn/error level |

**Note**: `task.console` is always available regardless of this tool set. Include `consoleTools` to give LLMs access to logging.

### `noTools`

Explicit empty tool set for agents that need no tools.

```typescript
import { noTools } from "@guildai/agents-sdk"

export default agent({
  tools: noTools,
  // ...
})
```

---

## Utilities

### `pick` and `omit`

Narrow tool sets to reduce token cost and prevent unintended tool usage.

```typescript
import { pick, omit } from "@guildai/agents-sdk"
import { gitHubTools } from "@guildai-services/guildai~github"

// Include only what you need
const tools = {
  ...pick(gitHubTools, ["github_repos_get", "github_pulls_list"]),
}

// Or exclude specific tools
const tools = {
  ...omit(gitHubTools, ["github_repos_delete"]),
}
```

**Rule**: Never use `pick`/`omit` on `guildTools` - spread it fully.

### `output` and `callTools`

For self-managed state agents only.

```typescript
import { output, callTools } from "@guildai/agents-sdk"

// Finish the agent
return output({ result: "done" })

// Request tool execution (can be parallel)
return callTools([
  { toolName: "github_issues_get", args: { owner: "org", repo: "repo", issue_number: 1 } },
  { toolName: "github_issues_get", args: { owner: "org", repo: "repo", issue_number: 2 } },
])
```

### `ask`

Shorthand for prompting the user (self-managed state only).

```typescript
import { ask } from "@guildai/agents-sdk"

return ask("Which repository?")
```

---

## Notify Event Helpers

Use with `task.ui.notify()` for user feedback.

```typescript
import {
  progressLogNotifyEvent,
  textPromptNotifyEvent,
  errorNotifyEvent,
} from "@guildai/agents-sdk"

// Progress updates (non-intrusive)
await task.ui?.notify(progressLogNotifyEvent("Fetching data..."))

// Regular message to conversation
await task.ui?.notify(textPromptNotifyEvent({ type: "text", text: "Here's what I found." }))

// Error display
await task.ui?.notify(errorNotifyEvent("Failed to connect"))
```

---

## Task Object

The `Task` object is passed to every agent callback and provides runtime services.

### Always Available

| Property | Description |
|----------|-------------|
| `task.sessionId` | Opaque session identifier |
| `task.console` | Debug logging (`debug`, `info`, `warn`, `error`, `log`) |
| `task.tools` | Typed proxy for all declared tools |
| `task.llm` | LLM calls via `generateText()` |

### Conditional Availability

| Property | Required Tool Set | Description |
|----------|-------------------|-------------|
| `task.ui` | `userInterfaceTools` | User interaction (notify, prompt) |
| `task.guild` | `guildTools` | Platform operations |
| `task.save` / `task.restore` | Self-managed agent | State persistence |

### `task.tools`

Call any tool declared in your agent's `tools` object:

```typescript
const pr = await task.tools.github_pulls_get({ owner, repo, pull_number: 42 })
await task.tools.slack_chat_post_message({ channel: "C123", text: "Done" })
```

### `task.llm.generateText()`

Make LLM calls from coded agents:

```typescript
// Simple prompt
const result = await task.llm.generateText({
  prompt: "Summarize this: " + text,
})
console.log(result.text)

// Chat messages
const result = await task.llm.generateText({
  system: "You are a helpful assistant.",
  messages: [
    { role: "user", content: "What is Guild?" },
  ],
})
```

### `task.ui`

User interaction (requires `userInterfaceTools`):

```typescript
// Notify (fire-and-forget)
await task.ui?.notify(progressLogNotifyEvent("Working..."))

// Prompt (blocks until user responds)
const reply = await task.ui?.prompt({ type: "text", text: "Which repo?" })
console.log(reply.text)
```

### `task.guild`

Platform operations (requires `guildTools`):

```typescript
const agents = await task.guild?.search_agent({ keywords: ["calculator"] })
await task.guild?.credentials_request({ service: "linear" })
```

### `task.console`

Debug logging (always available):

```typescript
task.console.debug({ input }, "received request")
task.console.info("processing")
task.console.warn("rate limited")
task.console.error("failed to connect")
```

### `task.save()` / `task.restore()`

State persistence for self-managed agents:

```typescript
// Save state before requesting tool calls
await task.save({ step: "fetching", items: [] })

// Restore in onToolResults
const state = await task.restore()  // Returns STATE | undefined
```
