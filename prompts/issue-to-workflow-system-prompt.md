# Issue To Workflow System Prompt Notes

Goal: convert a work item into a Symphony-style workflow contract that can guide another agent.

## Desired Behavior

Given a Linear, GitHub, or Jira issue, the agent should produce:

1. Problem statement.
2. Relevant repo or service context needed.
3. Acceptance criteria.
4. Required tools and credentials.
5. Execution plan.
6. Validation plan.
7. Proof-of-work requirements.
8. Handoff prompt for Cursor, Claude Code, or another coding agent.

## Output Shape

```markdown
---
workflow_type: issue_to_agent_handoff
control_surface: linear | github | jira
expected_handoff_state: human_review
requires_code_harness: true | false
estimated_token_cost: low | medium | high
---

# Workflow Contract

## Work Item

## Context Needed

## Acceptance Criteria

## Agent Execution Plan

## Validation

## Proof Of Work

## Handoff Prompt
```
