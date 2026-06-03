# Constraints

Guild agents run in a sandboxed environment with specific limitations. Understanding these constraints is critical for building agents that work.

---

## Sandboxed Runtime

### Allowed Imports

Only these packages are available:

```typescript
// Core SDK
import { ... } from "@guildai/agents-sdk"

// Schema validation
import { z } from "zod"

// Service integrations
import { gitHubTools } from "@guildai-services/guildai~github"
import { slackTools } from "@guildai-services/guildai~slack"
// etc.
```

### Forbidden

**No external npm packages**:
```typescript
// WILL NOT WORK
import axios from "axios"
import lodash from "lodash"
import dayjs from "dayjs"
```

**No Node.js built-ins**:
```typescript
// WILL NOT WORK
import fs from "fs"
import path from "path"
import http from "http"
import crypto from "crypto"
```

### Workarounds

- **HTTP requests**: Use `task.guild?.experimental_fetch()` (requires `guildTools`)
- **Date/time**: Use native JavaScript `Date`
- **JSON**: Use native `JSON.parse()` / `JSON.stringify()`
- **String manipulation**: Use native JavaScript methods

---

## Babel Compiler Limitations

The `"use agent"` directive transforms your code into a resumable state machine using Babel. This introduces constraints:

### No Parallel Promises

```typescript
"use agent"

// WILL NOT WORK
const [a, b, c] = await Promise.all([
  task.tools.github_issues_get({ ... }),
  task.tools.github_issues_get({ ... }),
  task.tools.github_issues_get({ ... }),
])

// WILL NOT WORK
await Promise.any([...])
await Promise.race([...])
```

**Solution**: Use self-managed state agents for parallel tool calls:

```typescript
// In self-managed agent's start():
return callTools([
  { toolName: "github_issues_get", args: { ... } },
  { toolName: "github_issues_get", args: { ... } },
  { toolName: "github_issues_get", args: { ... } },
])
```

### No Dynamic Function References Across Await

```typescript
"use agent"

// MAY NOT WORK - function reference may not survive serialization
let processor = input.type === "a" ? processA : processB
await someAsyncCall()
processor(data)  // processor might be undefined after resumption
```

**Solution**: Use conditionals after the await:

```typescript
"use agent"

const type = input.type
await someAsyncCall()
if (type === "a") {
  processA(data)
} else {
  processB(data)
}
```

### Conditionally Assigned Functions

```typescript
"use agent"

// MAY NOT WORK
const handler = condition ? async () => { ... } : async () => { ... }
await handler()
```

**Solution**: Use explicit conditionals or move to self-managed state.

---

## CLI-Managed Files

### `guild.json`

**Never edit this file manually.** It's managed by the CLI.

```json
{
  "agentId": "owner/agent-name",
  "workspaceId": "ws_xxx"
}
```

### `package.json`

**Don't add SDK packages:**

```json
{
  "dependencies": {
    // DON'T add these - runtime provides them:
    // "@guildai/agents-sdk": "...",
    // "zod": "...",
    // "@guildai-services/guildai~github": "..."
  }
}
```

### Version Control

**Use CLI commands, not raw git:**

```bash
# CORRECT
guild agent save --message "Add feature"
guild agent pull

# AVOID
git add . && git commit -m "Add feature"
git pull
```

The CLI handles synchronization with Guild's backend.

---

## Agent File Location

Agent code must be at `agent.ts` in the project root:

```
my-agent/
├── agent.ts      # REQUIRED - main agent code
├── package.json
├── tsconfig.json
├── guild.json
└── .gitignore
```

---

## Version Lifecycle

Versions follow a specific lifecycle:

```
Saved → Validated → Published
```

- **Saved**: Code uploaded, stored
- **Validated**: Runtime verified agent builds and conforms to schemas
- **Published**: Available to organization for installation

Use `--ephemeral` during development to avoid polluting version history:

```bash
guild agent test --ephemeral  # Creates temporary version, not saved
```

---

## Tool Call Patterns

### Correct

```typescript
// Access tools through task.tools
const pr = await task.tools.github_pulls_get({ owner, repo, pull_number })
```

### Incorrect

```typescript
// DON'T call APIs directly
const response = await fetch("https://api.github.com/...")

// DON'T import and use clients directly
import { Octokit } from "@octokit/rest"  // Won't work - external package
```

---

## Common Errors

### "Cannot find module"

You're trying to import an unsupported package. Only `@guildai/agents-sdk`, `zod`, and `@guildai-services/*` are available.

### "Promise.all is not supported"

You're using parallel promises in an auto-managed state agent. Either:
1. Make calls sequentially, or
2. Switch to a self-managed state agent

### "task.guild is undefined"

You're accessing `task.guild` without including `guildTools` in your agent's tools:

```typescript
// Add guildTools to enable task.guild
const tools = { ...guildTools, ...otherTools }
```

### "task.ui is undefined"

Same pattern - add `userInterfaceTools` to enable `task.ui`:

```typescript
const tools = { ...userInterfaceTools, ...otherTools }
```

Note: `llmAgent` auto-includes `userInterfaceTools`, but coded agents need it explicitly.
