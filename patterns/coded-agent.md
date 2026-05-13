# Coded Agent Patterns (Auto-Managed State)

Best practices for agents using the `"use agent"` directive with deterministic TypeScript control flow.

---

## When to Use

Use auto-managed state agents when:
- You need deterministic, repeatable behavior
- The workflow has a fixed sequence of steps
- You want to minimize LLM token costs (fixed per run)
- You need custom input/output schemas

---

## Good Patterns

### Always Start with "use agent"

```typescript
"use agent"  // MUST be the very first line

import { agent, type Task } from "@guildai/agents-sdk"
// ...
```

The directive tells the Babel compiler to transform your code into a resumable state machine.

### Define Clear Schemas

```typescript
const inputSchema = z.object({
  repo: z.string().describe("Repository in owner/repo format"),
  issue_number: z.number().describe("The issue number to process"),
})
type Input = z.infer<typeof inputSchema>

const outputSchema = z.object({
  summary: z.string().describe("Summary of the issue"),
  labels: z.array(z.string()).describe("Suggested labels"),
})
type Output = z.infer<typeof outputSchema>
```

**Tip**: Use `.describe()` on schema fields - it helps LLMs and users understand the expected data.

### Use Progress Notifications

Keep users informed during long operations:

```typescript
import { progressLogNotifyEvent } from "@guildai/agents-sdk"

async function run(input: Input, task: Task<Tools>): Promise<Output> {
  await task.ui?.notify(progressLogNotifyEvent("Fetching issue details..."))
  const issue = await task.tools.github_issues_get({ ... })
  
  await task.ui?.notify(progressLogNotifyEvent("Analyzing content..."))
  const analysis = await task.llm.generateText({ prompt: ... })
  
  await task.ui?.notify(progressLogNotifyEvent("Generating summary..."))
  // ...
}
```

**Best practices for progress messages**:
- Use present continuous tense: "Fetching...", "Analyzing...", "Creating..."
- Keep to one line
- Be specific: "Fetching 5 issues..." not "Processing..."

### Type Your Tools

```typescript
const tools = {
  ...userInterfaceTools,
  ...pick(gitHubTools, ["github_issues_get", "github_issues_list_comments"]),
}
type Tools = typeof tools

async function run(input: Input, task: Task<Tools>): Promise<Output> {
  // task.tools is now properly typed
}
```

### Use task.llm for LLM Calls

```typescript
async function run(input: Input, task: Task<Tools>): Promise<Output> {
  const result = await task.llm.generateText({
    prompt: `Summarize this issue:\n\n${issue.body}`,
  })
  
  return {
    summary: result.text,
    // ...
  }
}
```

### Handle Errors Gracefully

```typescript
async function run(input: Input, task: Task<Tools>): Promise<Output> {
  try {
    const issue = await task.tools.github_issues_get({ ... })
    if (!issue) {
      throw new Error(`Issue #${input.issue_number} not found`)
    }
    // ...
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    throw new Error(`Failed to process issue: ${message}`)
  }
}
```

---

## Anti-Patterns

### Using Promise.all

```typescript
"use agent"

// WILL NOT WORK - Babel compiler doesn't support this
const [issue, comments, events] = await Promise.all([
  task.tools.github_issues_get({ ... }),
  task.tools.github_issues_list_comments({ ... }),
  task.tools.github_issues_list_events({ ... }),
])
```

**Solution 1**: Sequential calls (if order doesn't matter):

```typescript
"use agent"

const issue = await task.tools.github_issues_get({ ... })
const comments = await task.tools.github_issues_list_comments({ ... })
const events = await task.tools.github_issues_list_events({ ... })
```

**Solution 2**: Use self-managed state agent for true parallelism.

### Importing External Packages

```typescript
"use agent"

// WILL NOT WORK
import dayjs from "dayjs"
import _ from "lodash"
```

**Solution**: Use native JavaScript:

```typescript
"use agent"

// Use native Date
const now = new Date()
const formatted = now.toISOString()

// Use native array methods instead of lodash
const unique = [...new Set(items)]
const grouped = items.reduce((acc, item) => { ... }, {})
```

### Dynamic Function References Across Await

```typescript
"use agent"

// MAY BREAK - function reference might not survive serialization
const processor = input.type === "issue" ? processIssue : processPR
await someAsyncCall()
await processor(data)  // processor could be undefined
```

**Solution**: Use explicit conditionals:

```typescript
"use agent"

const type = input.type
await someAsyncCall()

if (type === "issue") {
  await processIssue(data)
} else {
  await processPR(data)
}
```

### Forgetting to Include Tool Sets for Services

```typescript
// BAD: task.ui will be undefined
const tools = { ...gitHubTools }

async function run(input, task) {
  await task.ui?.notify(...)  // Works but ui is always undefined
}
```

```typescript
// GOOD: Include userInterfaceTools for task.ui
const tools = { ...gitHubTools, ...userInterfaceTools }
```

### Accessing Services Directly

```typescript
// BAD: Won't work in Guild runtime
const response = await fetch("https://api.github.com/repos/...")
```

```typescript
// GOOD: Use task.tools
const repo = await task.tools.github_repos_get({ owner, repo })
```

---

## Pattern: Input Validation

```typescript
async function run(input: Input, task: Task<Tools>): Promise<Output> {
  // Validate input format
  const parts = input.repo.split("/")
  if (parts.length !== 2) {
    throw new Error(`Invalid repo format: ${input.repo}. Expected owner/repo`)
  }
  
  const [owner, repo] = parts
  // Continue with validated data...
}
```

---

## Pattern: Conditional Tool Usage

```typescript
async function run(input: Input, task: Task<Tools>): Promise<Output> {
  const issue = await task.tools.github_issues_get({ ... })
  
  // Only fetch comments if issue has any
  let comments: any[] = []
  if (issue.comments > 0) {
    const result = await task.tools.github_issues_list_comments({ ... })
    comments = result || []
  }
  
  // ...
}
```

---

## Pattern: Accumulating Results

```typescript
async function run(input: Input, task: Task<Tools>): Promise<Output> {
  const results: string[] = []
  
  for (const issueNumber of input.issues) {
    await task.ui?.notify(progressLogNotifyEvent(`Processing issue #${issueNumber}...`))
    const issue = await task.tools.github_issues_get({
      owner: input.owner,
      repo: input.repo,
      issue_number: issueNumber,
    })
    results.push(`#${issueNumber}: ${issue?.title}`)
  }
  
  return { type: "text", text: results.join("\n") }
}
```

**Note**: This is sequential. For parallel processing, use self-managed state.
