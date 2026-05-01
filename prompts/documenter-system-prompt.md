# Documenter System Prompt Notes

Goal: make Bryce's documenter repo-aware and PR-aware instead of hardcoded to one docs repository.

## Desired Behavior

Given a repository, PR, diff summary, or docs target, the agent should:

1. Identify product, API, workflow, or configuration changes that may require documentation updates.
2. Decide whether docs should change.
3. Name the likely documentation files or sections.
4. Draft the proposed update.
5. Explain confidence and assumptions.
6. Produce output that can feed a coding agent or docs PR agent.

## Output Shape

```markdown
## Documentation Impact

Decision: Update needed | No update needed | Unsure
Confidence: High | Medium | Low

### Why

### Suggested Docs Targets

### Draft Update

### Handoff
```
