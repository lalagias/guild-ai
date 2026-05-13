# Agent Backlog

This backlog is sequenced for strategic value. The goal is to create visible Guild value while building toward system-level ownership.

## Done

### Documentation Agent (`documenter`)

- PR diff in, documentation impact out.
- Draft or suggest docs updates.
- Shipped.

### PR Doc Impact Agent (`pr-doc-impact`)

- Given a PR, decide whether docs are stale and draft the update.
- Natural trigger: GitHub PR opened or updated.
- Handoff: output can feed a coding agent or docs PR agent.
- Shipped.

### Cursor Cloud Coder (`cursor-cloud-coder`)

- Guild integration wrapping Cursor's Cloud Agents REST API.
- Proves the Guild-to-Cursor execution pattern.
- Shipped.

### Code Review (`code-review`)

- Quiet PR reviewer — anti-CodeRabbit posture.
- Scans diffs for security flaws, logic bugs, performance anti-patterns, API contract breaks.
- Signal gate: stays silent on clean PRs, only posts when medium+ severity findings exist.
- Uses `guildai~github`.
- Shipped.

### CI/CD Optimizer (`cicd-optimizer`)

- Analyzes GitHub Actions workflow YAML files for anti-patterns.
- Detects missing caching, overly broad triggers, long dependency chains, missing timeouts, security issues.
- Produces optimization report with concrete YAML fix suggestions.
- Uses `guildai~github`.
- Shipped.

### Dependency Manager (`dep-manager`)

- Audits repo dependency health across npm, Python, Go, Ruby, and Rust ecosystems.
- Checks version hygiene, deprecated packages, lock files, dev/prod separation, Dependabot/Renovate config.
- Produces risk-scored health report with upgrade priorities.
- Uses `guildai~github`.
- Shipped.

### Skills Discovery (`skills-discovery`)

- Searches, evaluates, and recommends agent skills from skills.sh catalog.
- Fetches skill details, security audit status, and official/curated badges.
- Uses `dkountanis~skills-sh` integration.
- Shipped.

## Tier 1: Quick Wins

### Customer Issue To Engineering Ticket

- Support/Slack message in, clean engineering ticket out.
- Handoff: output feeds issue triage or implementation planning.

### Standup / Status Agent

- Linear, Slack, and GitHub activity in.
- Team or per-person status update out.

## Tier 1.5: Near-Term Builds

### Issue Triage Router (`issue-triage-router`)

- One agent that classifies and routes issues.
- Labels, assigns owner, comments, optionally dispatches Cursor agent.
- Uses Linear and GitHub tools.

### Test Generator (`test-generator`)

- Experimental-coding container agent.
- Detects test framework, writes tests, runs them, opens draft PR.

### Security Scan (`security-scan`)

- Quiet PR risk scoring. Anti-CodeRabbit posture: stays silent on low-risk PRs.
- Optional Cursor remediation handoff for high-severity findings.

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

### RCA Incident Brief (`rca-incident-brief`)

- Uses `guildai~aws-cloudwatch` + GitHub + Firecrawl integrations.
- Runs real Logs Insights queries, correlates with recent PRs, produces ranked hypotheses.
- Graceful credential fallback to manual-input mode if CloudWatch isn't connected yet.

### Bug To Fix To Ship

Sentry alert to triage, repro, fix, PR, review, and deploy.

## Tier 4: Later High-Judgment Agents

### Security Scan And Auto-Remediation

Risk scoring is feasible early. Auto-remediation waits for harness support.

## Opportunistic

### Web Researcher (`web-researcher`)

- Uses Firecrawl (`dkountanis~firecrawl`) integration.
- Web research and summarization on demand.

### UI Prototyper (`ui-prototyper`)

- Uses v0.app (`dkountanis~v0-app-api`) integration.
- Generates UI prototypes from descriptions or screenshots.

## Dropped

### Codex

App Server is stdio JSON-RPC, not REST. SDK is npm-only (same Guild runtime blocker as `@cursor/sdk`). Set aside.

### OpenAI Responses API

Out of scope.

### Linear Hub Build

Already exists in Guild.

### CloudWatch Hub Build

Already exists as `guildai~aws-cloudwatch`.
