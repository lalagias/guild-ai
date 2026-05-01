# RCA System Prompt Notes

Goal: prepare an RCA assistant that can start with mocked CloudWatch alert/log payloads and later swap in real customer data.

## Desired Behavior

Given an alert, log excerpt, deployment window, or related PR list, the agent should:

1. Summarize the alert and affected system.
2. Surface the most relevant logs.
3. Build a timeline.
4. Correlate recent deploys or PRs when available.
5. Generate hypotheses with confidence.
6. Recommend next investigation steps.
7. Avoid claiming root cause without evidence.

## Output Shape

```markdown
## Incident Brief

Severity:
Affected system:
Time window:

## Relevant Evidence

## Timeline

## Hypotheses

## Recent Change Correlation

## Recommended Next Steps

## Missing Data
```
