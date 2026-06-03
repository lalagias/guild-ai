# Self-Managed Agent Patterns

Best practices for agents with explicit state management and parallel tool calls.

---

## When to Use

Use self-managed state agents when:
- You need parallel tool calls (fetch multiple items simultaneously)
- You need fine-grained control over state persistence
- You need complex branching based on tool results
- Auto-managed state limitations block your use case

**Default**: Start with `llmAgent` or auto-managed `agent`. Only use self-managed when you hit a limitation.

---

## Architecture

Self-managed agents are event-driven state machines:

```
Input
  ↓
start(input, task)
  ├─ return output(...)        → Done
  └─ return callTools([...])   → Runtime executes tools
                                    ↓
                               onToolResults(results, task)
                                 ├─ return output(...)        → Done
                                 └─ return callTools([...])   → Loop back ↑
```

---

## Good Patterns

### Always Save State Before callTools

```typescript
start: async (input, task) => {
  // Save state BEFORE requesting tool calls
  await task.save({
    step: "fetching",
    owner: input.owner,
    repo: input.repo,
    issueNumbers: input.issues,
  })
  
  return callTools(
    input.issues.map((n) => ({
      toolName: "github_issues_get" as const,
      args: { owner: input.owner, repo: input.repo, issue_number: n },
    }))
  )
}
```

### Always Restore State in onToolResults

```typescript
onToolResults: async (results, task) => {
  const state = await task.restore()
  if (!state) {
    throw new Error("State not found")
  }
  
  // Now use state.owner, state.repo, etc.
}
```

### Define stateSchema

```typescript
export default agent({
  description: "Fetches multiple issues in parallel",
  inputSchema,
  outputSchema,
  stateSchema: z.object({
    step: z.enum(["fetching", "processing", "done"]),
    owner: z.string(),
    repo: z.string(),
    issueNumbers: z.array(z.number()),
  }),
  tools,
  start,
  onToolResults,
})
```

### Handle Tool Errors in Results

Tool errors appear in the results array:

```typescript
onToolResults: async (results, task) => {
  for (const result of results) {
    if ("error" in result) {
      // Handle error
      console.error(`Tool ${result.toolName} failed: ${result.error}`)
      continue
    }
    // Process successful result
    const data = result.output
  }
}
```

### Use output() to Finish

```typescript
import { output } from "@guildai/agents-sdk"

onToolResults: async (results, task) => {
  // Process results...
  
  // Finish the agent
  return output({
    summaries: processedResults,
    count: processedResults.length,
  })
}
```

### Use callTools() to Continue

```typescript
import { callTools } from "@guildai/agents-sdk"

onToolResults: async (results, task) => {
  const state = await task.restore()
  
  if (state.step === "fetching") {
    // Move to next step
    await task.save({ ...state, step: "processing", fetchedData: results })
    
    return callTools([
      { toolName: "some_other_tool", args: { ... } },
    ])
  }
  
  // Final step
  return output({ ... })
}
```

### Use ask() for User Prompts

```typescript
import { ask } from "@guildai/agents-sdk"

start: async (input, task) => {
  if (!input.confirmed) {
    return ask("Are you sure you want to proceed?")
  }
  // Continue...
}
```

---

## Anti-Patterns

### Forgetting to Restore State

```typescript
// BAD: State is lost
onToolResults: async (results, task) => {
  // Where's the original input data?
  const owner = ???  // Oops, we don't have it
}
```

```typescript
// GOOD: Restore state first
onToolResults: async (results, task) => {
  const state = await task.restore()
  const owner = state.owner
}
```

### Using Self-Managed When Not Needed

```typescript
// OVERKILL: Simple sequential logic doesn't need self-managed state
export default agent({
  start: async (input, task) => {
    await task.save({ input })
    return callTools([{ toolName: "github_issues_get", args: { ... } }])
  },
  onToolResults: async (results, task) => {
    return output({ issue: results[0].output })
  },
})
```

```typescript
// SIMPLER: Use auto-managed state
"use agent"

async function run(input, task) {
  const issue = await task.tools.github_issues_get({ ... })
  return { issue }
}
```

### Not Handling Undefined State

```typescript
// BAD: Assumes state always exists
onToolResults: async (results, task) => {
  const state = await task.restore()
  const owner = state.owner  // Could throw if state is undefined
}
```

```typescript
// GOOD: Handle undefined case
onToolResults: async (results, task) => {
  const state = await task.restore()
  if (!state) {
    throw new Error("Expected state to exist")
  }
  const owner = state.owner
}
```

### Ignoring Tool Errors

```typescript
// BAD: Assumes all tools succeeded
onToolResults: async (results, task) => {
  const issues = results.map(r => r.output)  // Could be undefined or error
}
```

```typescript
// GOOD: Check for errors
onToolResults: async (results, task) => {
  const issues = []
  for (const result of results) {
    if ("error" in result) {
      console.error(`Failed: ${result.toolName} - ${result.error}`)
      continue
    }
    issues.push(result.output)
  }
}
```

---

## Pattern: Parallel Fetch

Fetch multiple items simultaneously:

```typescript
start: async (input, task) => {
  await task.save({ issueNumbers: input.issues })
  
  return callTools(
    input.issues.map((issue_number) => ({
      toolName: "github_issues_get" as const,
      args: { owner: input.owner, repo: input.repo, issue_number },
    }))
  )
},

onToolResults: async (results, task) => {
  const state = await task.restore()
  
  const issues = results
    .filter((r) => !("error" in r))
    .map((r, i) => ({
      number: state.issueNumbers[i],
      title: r.output?.title,
      body: r.output?.body,
    }))
  
  return output({ issues })
}
```

---

## Pattern: Multi-Step Workflow

```typescript
const stateSchema = z.object({
  step: z.enum(["fetch_issues", "fetch_comments", "summarize"]),
  issues: z.array(z.any()).optional(),
  comments: z.array(z.any()).optional(),
})

start: async (input, task) => {
  await task.save({ step: "fetch_issues" })
  return callTools([...])
},

onToolResults: async (results, task) => {
  const state = await task.restore()
  
  switch (state.step) {
    case "fetch_issues":
      await task.save({ step: "fetch_comments", issues: results.map(r => r.output) })
      return callTools([...])  // Fetch comments
      
    case "fetch_comments":
      await task.save({ step: "summarize", ...state, comments: results.map(r => r.output) })
      return callTools([...])  // Summarize with LLM
      
    case "summarize":
      return output({ summary: results[0].output })
  }
}
```

---

## Pattern: Interactive Loop

```typescript
import { ask } from "@guildai/agents-sdk"

start: async (input, task) => {
  await task.save({ count: 0 })
  return ask("Say 'marco'")
},

onToolResults: async (results, task) => {
  const state = await task.restore()
  const userInput = results[0].output.text
  
  if (userInput.toLowerCase() === "marco") {
    await task.save({ count: state.count + 1 })
    return ask("polo! Say 'marco' again or anything else to stop.")
  }
  
  return output({ rounds: state.count })
}
```
