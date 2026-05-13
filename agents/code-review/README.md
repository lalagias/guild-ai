# dkountanis~code-review

Quiet code reviewer that only speaks when it finds real issues.

## What it does

1. Parses a GitHub PR URL or reference (e.g. `owner/repo#42`).
2. Fetches PR metadata and file-level diffs via the GitHub integration.
3. Scans each changed file's added lines against pattern rules for real-issue categories:
   - **Security** — hardcoded secrets, SQL injection, XSS, weak crypto, disabled TLS, permissive CORS
   - **Logic bugs** — empty catch blocks, debug statements left in, TODO/FIXME markers
   - **Performance** — sequential awaits in loops, N+1 patterns, SELECT *, sync I/O
   - **API contract** — modified public exports (informational)
4. Scores each finding: `critical`, `high`, `medium`, or `low`.
5. **Signal gate**: if nothing reaches medium severity, stays silent — no comment on the PR.
6. If material findings exist, posts a structured review comment with a severity table and highlighted snippets.

Anti-CodeRabbit posture: no noise on clean PRs.

## Integration dependency

This agent requires `guildai~github` to be connected in the workspace with valid GitHub credentials.

## Tools used

- `github_pulls_get` — Fetch PR metadata
- `github_pulls_list_files` — Fetch file-level patches/diffs
- `github_issues_create_comment` — Post review comment on the PR

## Input format

GitHub PR URL:

```
https://github.com/acme/app/pull/42
```

Short reference:

```
acme/app#42
```

## Output

When findings exist:

```markdown
## Code Review Findings

| Severity | Category | File | Line | Description |
| --- | --- | --- | --- | --- |
| **CRITICAL** | Security | `src/db.ts` | L45 | Potential SQL injection via string concatenation |
| **HIGH** | Security | `src/api.ts` | L12 | Overly permissive CORS configuration |
| **MEDIUM** | Performance | `src/users.ts` | L88 | Sequential await inside loop |

### Summary
- **Critical**: 1 | **High**: 1 | **Medium**: 1

### Highlighted Snippets
(top findings with code context)
```

When PR is clean:

```markdown
## Code Review: Clean

No medium-or-higher severity findings detected.
Review stayed silent on the PR (anti-noise posture).
```
