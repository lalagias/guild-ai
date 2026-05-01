# RCA CloudWatch MVP

This is a fallback plan for Bryce's Incident RCA opportunity. It is designed to proceed with mocked payloads first, then swap in real CloudWatch or New Relic access when Guild/customer credentials are available.

## Tier

Tier 3: multi-agent pipeline.

This should not start as "full autonomous RCA." The MVP should produce an incident brief, relevant evidence, likely hypotheses, and a clean next-step handoff.

## MVP Goal

Given an alert payload and a bounded time window, produce:

- Alert summary.
- Affected service and environment.
- Relevant log search queries.
- Timeline of notable events.
- Recent deployment or PR correlation prompts.
- Hypotheses with confidence.
- Missing data and next actions.

## Non-Goals

- Do not claim definitive root cause without evidence.
- Do not auto-fix or deploy.
- Do not build a generic observability platform inside one agent.
- Do not put raw credentials into agent context.

## Required Inputs

Minimum viable mocked input:

```json
{
  "source": "cloudwatch",
  "alarmName": "prod-api-5xx-rate-high",
  "accountId": "123456789012",
  "region": "us-east-1",
  "service": "api",
  "environment": "production",
  "state": "ALARM",
  "metricName": "5XXError",
  "namespace": "AWS/ApplicationELB",
  "threshold": 50,
  "observedValue": 138,
  "startedAt": "2026-04-29T18:20:00Z",
  "endedAt": null,
  "dimensions": {
    "LoadBalancer": "app/prod-api/abc123",
    "TargetGroup": "targetgroup/prod-api/def456"
  },
  "runbookUrl": "https://example.com/runbooks/prod-api-5xx"
}
```

Optional enrichment:

```json
{
  "deployments": [
    {
      "repo": "acme/api",
      "sha": "abc1234",
      "pr": "https://github.com/acme/api/pull/456",
      "deployedAt": "2026-04-29T18:05:00Z",
      "author": "engineer@example.com"
    }
  ],
  "logSamples": [
    {
      "timestamp": "2026-04-29T18:21:08Z",
      "level": "error",
      "message": "POST /v1/payments failed with upstream timeout",
      "traceId": "trace-001"
    }
  ]
}
```

## Agent Flow

1. Parse the alert and normalize service, environment, metric, threshold, and time window.
2. Generate CloudWatch Logs Insights queries for the affected service and time range.
3. Summarize provided log samples or ask for logs if none are supplied.
4. Correlate recent deployments, PRs, or config changes if provided.
5. Produce hypotheses ranked by confidence.
6. Produce a handoff prompt for a follow-up investigation or coding agent.
7. Produce a Bryce/customer update.

## Output Shape

```markdown
## Incident Brief

Severity:
Affected service:
Environment:
Time window:
Current state:

## Evidence

## Suggested Log Queries

## Timeline

## Recent Change Correlation

## Hypotheses

## Recommended Next Steps

## Missing Data

## Handoff Prompt

## Bryce Update
```

## CloudWatch Logs Insights Query Templates

Application errors:

```sql
fields @timestamp, @message, @logStream
| filter @timestamp >= ago(2h)
| filter @message like /ERROR|Exception|timeout|5xx|failed/i
| sort @timestamp desc
| limit 100
```

Request path aggregation:

```sql
fields @timestamp, @message
| parse @message /(?<method>GET|POST|PUT|PATCH|DELETE) (?<path>\/[^ ]+)/
| stats count(*) as errors by method, path
| sort errors desc
| limit 20
```

Trace correlation:

```sql
fields @timestamp, @message, traceId
| filter traceId = "REPLACE_TRACE_ID"
| sort @timestamp asc
| limit 100
```

## Handoff Prompt Template

```markdown
You are investigating a production alert.

Alert:
[normalized alert JSON]

Relevant logs:
[log excerpts]

Recent changes:
[deployments or PRs]

Produce:
1. Most likely hypotheses with confidence.
2. Evidence supporting or weakening each hypothesis.
3. Missing data needed before root cause can be claimed.
4. Next concrete investigation steps.
5. If a code fix is likely, a scoped implementation plan for Cursor or Claude Code.
```

## Bryce Update

I can start RCA without customer access by using a mocked CloudWatch alert schema and log samples. The first version should not claim root cause; it should surface relevant evidence, correlate recent changes, rank hypotheses, and produce a follow-up handoff. Once you provide the real alert shape and log access assumptions, I can swap the fixture layer for the actual integration path.
