# dkountanis~documenter

Documentation updater that analyzes GitHub pull requests and creates corresponding documentation updates.

This is a separate local fork/copy for Dimitris to iterate on independently. It is based on Bryce's `bryceheltzel/documenter`, with the first improvement being repo-aware documentation targeting instead of hardcoding one docs repository.

## Input

A GitHub PR URL or short reference:

- `owner/repo#123`
- `https://github.com/owner/repo/pull/123`

Optionally include a docs repository:

- `docs: owner/docs`
- `documentation repo: https://github.com/owner/docs`

If no docs repository is specified, the agent defaults to `guildaidev/docs`.

## Workflow

1. Retrieve and analyze PR changes.
2. Determine documentation impact.
3. Locate existing documentation in the selected docs repository.
4. Plan documentation changes.
5. Implement documentation changes.
6. Create a documentation PR.

## Output

A structured summary including:

- Source PR analyzed.
- Documentation repository used.
- Documentation PR link, if created.
- Files changed.
- Rationale for each change.
- PR changes with no doc impact and justification.
- Areas of uncertainty that need human review.