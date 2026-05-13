# LLM Agent Patterns

Best practices and anti-patterns for `llmAgent` - the simplest way to build Guild agents.

---

## When to Use

Use `llmAgent` when:
- The task is expressible as a prompt + tools
- You want the LLM to decide how to accomplish the goal
- Variable behavior based on input is acceptable
- You don't need deterministic, repeatable execution

---

## Good Patterns

### Focused System Prompts

Keep prompts specific to one task:

```typescript
// GOOD: Clear, focused purpose
systemPrompt: `You are a code review assistant.
When given a pull request URL, fetch the PR details using GitHub tools
and provide constructive feedback on the changes.`
```

```typescript
// BAD: Too many responsibilities
systemPrompt: `You are a development assistant that can:
- Review code
- Write documentation
- Manage issues
- Deploy applications
- Answer questions about the codebase
- Generate tests
...`
```

### Use Multi-Turn for Conversations

```typescript
// For back-and-forth interaction
export default llmAgent({
  description: "Helps users understand their GitHub repos",
  tools: { ...gitHubTools, ...guildTools },
  systemPrompt: "Help users explore their GitHub repositories.",
  mode: "multi-turn",  // Continues until __submit__ is called
})
```

```typescript
// For one-shot tasks
export default llmAgent({
  description: "Summarizes a PR in one response",
  tools: { ...gitHubTools, ...guildTools },
  systemPrompt: "Summarize the given PR concisely.",
  mode: "one-shot",  // Default - responds once and terminates
})
```

### Include guildTools for Credential Requests

If your agent uses service tools that require OAuth:

```typescript
// GOOD: Can request credentials if needed
tools: { ...gitHubTools, ...guildTools }
```

```typescript
// RISKY: Can't request credentials if GitHub isn't connected
tools: { ...gitHubTools }
```

### Provide Context in Prompts

```typescript
systemPrompt: `You review Python code for best practices.

Focus on:
- PEP 8 style compliance
- Type hints
- Error handling
- Performance considerations

Be constructive, not critical. Suggest improvements with examples.`
```

---

## Anti-Patterns

### Overloaded Tool Sets

```typescript
// BAD: Including everything "just in case"
tools: {
  ...gitHubTools,      // 50+ tools
  ...slackTools,       // 30+ tools
  ...jiraTools,        // 40+ tools
  ...confluenceTools,  // 20+ tools
  ...guildTools,       // 55+ tools
}
// Result: Huge prompt, confused LLM, high token cost
```

```typescript
// GOOD: Only what's needed
tools: {
  ...pick(gitHubTools, ["github_pulls_get", "github_pulls_list_files"]),
  ...guildTools,
}
```

### Adding userInterfaceTools Manually

```typescript
// BAD: Redundant - llmAgent auto-includes this
tools: {
  ...gitHubTools,
  ...userInterfaceTools,  // Already included by llmAgent
}
```

```typescript
// GOOD: Just include what you need
tools: {
  ...gitHubTools,
  ...guildTools,
}
```

### Using llmAgent When Determinism Is Required

```typescript
// BAD: LLM might not follow the exact workflow
export default llmAgent({
  description: "Always posts to #releases then creates Jira ticket",
  // LLM might skip steps, change order, or interpret differently
})
```

```typescript
// GOOD: Use coded agent for deterministic workflows
"use agent"

async function run(input, task) {
  // Always executes in this exact order
  await task.tools.slack_chat_post_message({ channel: "#releases", text: input.text })
  await task.tools.jira_issue_create({ project: "REL", summary: input.text })
  return { type: "text", text: "Done" }
}
```

### Vague Descriptions

```typescript
// BAD: Doesn't help users or other agents understand when to use this
description: "Helps with stuff"
```

```typescript
// GOOD: Clear, specific description
description: "Reviews GitHub pull requests and provides feedback on code quality, style, and potential bugs"
```

---

## Fixed Input/Output Schemas

`llmAgent` uses fixed schemas - you cannot customize them:

```typescript
// Input: always this shape
type Input = { type: "text"; text: string }

// Output: always this shape  
type Output = { type: "text"; text: string }
```

If you need custom schemas, use a coded agent with `agent()`.

---

## Mode Comparison

| Mode | Behavior | Use When |
|------|----------|----------|
| `"one-shot"` | Responds once, terminates | Single question/task |
| `"multi-turn"` | Continues until `__submit__` | Conversations, clarifications needed |

---

## Testing Tips

1. **Use `--ephemeral` during development**:
   ```bash
   guild agent test --ephemeral
   ```

2. **Test edge cases**: What happens with empty input? Invalid data?

3. **Check tool usage**: Is the LLM using tools appropriately or making unnecessary calls?

4. **Monitor token cost**: Large tool sets = expensive prompts
