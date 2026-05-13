# Issue Triage Router

Guild agent that classifies and routes GitHub issues automatically.

## What It Does

1. Fetches a GitHub issue by URL or reference
2. Classifies by kind (bug/feature/docs/question), severity (sev1-sev4), and area
3. Posts a structured triage comment on the issue
4. Adds labels when classification confidence is medium or higher
5. Optionally dispatches a Cursor cloud agent for high-severity bugs

## Anti-Noise Rules

- Never removes existing labels (add-only)
- Never reassigns already-assigned issues
- Low confidence = comment-only, no labels, no dispatch
- One triage comment per run

## Usage

```
guild agent test --ephemeral
> https://github.com/myorg/myrepo/issues/42
```

## Dependencies

- `@guildai-services/guildai~github` (issue read/write)
- `@guildai-services/dkountanis~cursor-cloud-agents` (optional bug-fix dispatch)
