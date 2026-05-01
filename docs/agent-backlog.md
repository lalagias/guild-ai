# Agent Backlog

This backlog is sequenced for strategic value. The goal is to create visible Guild value while building toward system-level ownership.

## Tier 1: Quick Wins

### Documentation Agent

- PR diff in, documentation impact out.
- Draft or suggest docs updates.
- First priority because Bryce already has a documenter agent and Guild can use this internally.

### PR Doc Impact Agent

- Owned follow-up to the documenter.
- Given a PR, decide whether docs are stale and draft the update.
- Natural trigger: GitHub PR opened or updated.
- Handoff: output can feed a coding agent or docs PR agent.

### Customer Issue To Engineering Ticket

- Support/Slack message in, clean engineering ticket out.
- Handoff: output feeds issue triage or implementation planning.

### Standup / Status Agent

- Linear, Slack, and GitHub activity in.
- Team or per-person status update out.

## Tier 2: Harness And Platform Bets

### MCP Connection Catalog

Platform contribution, not a cheap single-agent build. Priority connectors:

- GitHub
- Linear
- Slack
- Sentry
- PagerDuty
- Postgres
- CloudWatch

### API To MCP Generator

OpenAPI, Swagger, or Postman collection in; working MCP server out.

### Repo-Aware Context Retriever

Repo index, embeddings, and symbol graph to lower token costs for planning and code-heavy agents.

### Diff Intelligence

Semantic understanding of PR changes. Foundation for docs, review, and security scoring.

## Tier 3: Multi-Agent Pipelines

### Issue Triage Pipeline

Issue in, scoped plan out, Cursor or coding agent handoff next.

### RCA Pipeline

CloudWatch alert in, relevant logs and recent PR correlation out, hypothesis and next steps produced.

### Bug To Fix To Ship

Sentry alert to triage, repro, fix, PR, review, and deploy.

## Tier 4: Later High-Judgment Agents

### Quieter Code Review

Review agent that stays silent unless it has high-signal findings.

### Security Scan And Auto-Remediation

Risk scoring is feasible early. Auto-remediation waits for harness support.
