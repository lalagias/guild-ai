# Owned Agent Specs

These are Dimitris-owned follow-up assets. They should be useful on their own, but also demonstrate Guild as the control plane for connected agent workflows.

## PR Doc Impact

Tier: 1 quick win.

Goal: given a GitHub PR, decide whether documentation should change and draft the update plan.

Inputs:

- PR URL or `owner/repo#number`.
- Optional docs repository.
- Optional docs style guide.

Outputs:

- Documentation impact decision.
- Confidence level.
- Files or sections likely affected.
- Draft documentation change.
- Handoff prompt for a coding/docs PR agent.

Handoff design:

- If docs impact is high, output should feed `documenter`.
- If impact is uncertain, output should feed human review.
- If no docs impact, output should explain why and stop.

Token risk:

- Low to medium if based on PR metadata and changed files.
- High if attempting full repo understanding without a harness.

## Issue To Workflow

Tier: 3 multi-agent pipeline wedge.

Goal: convert a Linear/GitHub/Jira issue into a Symphony-style workflow contract that another agent can execute.

Inputs:

- Work item title and body.
- Tracker URL or identifier.
- Optional repo target.
- Optional acceptance criteria.

Outputs:

- Problem statement.
- Context needed.
- Acceptance criteria.
- Agent execution plan.
- Validation plan.
- Proof-of-work requirements.
- Handoff prompt for Cursor, Claude Code, or a Guild coding agent.

Handoff design:

- Output should be structured enough for a coding agent to start.
- It should explicitly list blockers, missing credentials, and assumptions.
- It should preserve human review as the default final state.

Token risk:

- Low when only planning from issue text.
- High if it attempts to scan a large repo directly.
- Use Cursor or Claude Code as the harness for code-heavy context.

## Agent Demo Packager

Tier: 1 quick win, relationship leverage.

Goal: turn an agent run result into a concise Bryce/Guild/customer update.

Inputs:

- Agent name.
- Sample input.
- Run output.
- Missing data.
- Next ask.

Outputs:

- 3-6 sentence update.
- One artifact link or command.
- One clear decision request.

Handoff design:

- Feeds Slack/email updates to Bryce.
- Feeds demo log entries.
