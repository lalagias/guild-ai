# RCA Incident Brief

Guild agent that investigates production incidents using AWS CloudWatch logs and GitHub PR correlation.

## How It Works

1. Parses an alert payload or free-text incident description
2. Queries CloudWatch Logs Insights for error patterns in the investigation window
3. Checks CloudWatch anomaly detectors
4. Correlates with recent GitHub PRs and deployments
5. Optionally enriches from runbook URLs via Firecrawl
6. Produces a structured incident brief with ranked hypotheses

## Credential Fallback

If CloudWatch credentials aren't connected in the Guild workspace, the agent gracefully degrades:
- Notifies the user
- Accepts pasted log samples from the alert payload
- Generates query templates the on-call can paste into CloudWatch console
- Continues with whatever evidence is available

## Rules

- Never claims definitive root cause
- Always bounds investigation window (30min before → 15min after alert)
- Caps log volume at 500 events with truncation notice
- Every hypothesis cites specific evidence
- Handoff prompt is output-only — no auto-dispatch

## Usage

```
guild agent test --ephemeral
> {"alarmName": "prod-api-5xx-rate-high", "service": "api", "environment": "production", ...}
```

Or free text:
```
> prod-api 5xx spike in the last hour
```

## Dependencies

- `@guildai-services/guildai~aws-cloudwatch` (log queries, anomaly detection)
- `@guildai-services/guildai~github` (PR correlation)
- `@guildai-services/dkountanis~firecrawl` (optional runbook enrichment)
