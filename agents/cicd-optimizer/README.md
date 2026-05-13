# dkountanis~cicd-optimizer

Analyzes GitHub Actions workflows and suggests concrete optimizations.

## What it does

1. Parses a GitHub repo URL or reference (e.g. `owner/repo`).
2. Fetches the `.github/workflows/` directory listing via the GitHub integration.
3. Reads each YAML workflow file and runs pattern-based checks for anti-patterns:
   - **Caching** — npm/pip install without cache, Docker builds without layer caching
   - **Triggers** — overly broad `on: push` without branch or path filters
   - **Security** — `pull_request_target` with PR head checkout, secrets over-exposed in env blocks
   - **Timeouts** — missing `timeout-minutes` (jobs can run indefinitely)
   - **Parallelization** — long `needs` chains where jobs could run concurrently
   - **Matrix** — hardcoded versions that should use `strategy.matrix`
   - **Redundancy** — excessive checkout steps suggesting artifacts would be better
4. Produces a structured report with per-workflow findings, severity ranking, and ready-to-paste YAML fix suggestions.

## Integration dependency

This agent requires `guildai~github` to be connected in the workspace with valid GitHub credentials.

## Tools used

- `github_repos_get_content` — Read workflow directory listing and individual YAML files

## Input format

GitHub repo URL:

```
https://github.com/acme/app
```

Short reference:

```
acme/app
```

## Output

```markdown
## CI/CD Optimization Report

**Repository**: acme/app
**Workflows analyzed**: 3
**Findings**: 5

### Findings

| Severity | Category | Workflow | Description |
| --- | --- | --- | --- |
| **CRITICAL** | Security | `deploy.yml` | pull_request_target with PR head checkout |
| **HIGH** | Caching | `ci.yml` | npm install without caching configured |
| **MEDIUM** | Timeouts | `test.yml` | No timeout-minutes set |

### Suggested Fixes

#### HIGH — Caching (`ci.yml`)
npm install without caching configured

Add cache to setup-node:
```yaml
- uses: actions/setup-node@v4
  with:
    node-version: '20'
    cache: 'npm'
```

### Estimated Impact
Fixing 2 caching issue(s) typically saves 30-60% of workflow run time.
```
