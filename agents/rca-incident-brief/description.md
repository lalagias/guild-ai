Investigates production incidents and produces a structured incident brief.

Give it an alert payload (CloudWatch alarm JSON), a free-text incident
description, or a service name and time window. It queries CloudWatch logs,
correlates with recent GitHub deployments and PRs, checks anomaly detectors,
and produces ranked hypotheses with confidence levels.

Never claims definitive root cause — output is evidence, ranked hypotheses,
missing data, and next steps. Includes a Cursor handoff prompt for the most
likely fix that the on-call can choose to dispatch.

If CloudWatch credentials aren't connected, gracefully falls back to accepting
pasted log samples and generating query templates instead of running them.

Example inputs:

- Paste a CloudWatch alarm JSON payload
- "prod-api 5xx spike in the last hour"
- "Investigate high latency on the payments service since 2pm UTC"
