# dkountanis~pr-doc-impact

Lightweight Guild agent that analyzes a GitHub pull request for documentation impact.

This agent does not edit files or create PRs. It decides whether documentation should change and produces a structured handoff packet for a documenter agent or human reviewer.

## Input

A GitHub PR URL or short reference:

- `owner/repo#123`
- `https://github.com/owner/repo/pull/123`

Optionally include a docs repository:

- `docs: owner/docs`
- `documentation repo: https://github.com/owner/docs`

## Output

- Documentation impact decision.
- Confidence level.
- Evidence from PR title and changed files.
- Suggested docs targets or search terms.
- Draft change brief.
- Handoff prompt for a documenter agent.
- Uncertainty and missing context.
