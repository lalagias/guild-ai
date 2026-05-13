# dkountanis~dep-manager

Audits a repository's dependency health across multiple ecosystems.

## What it does

1. Parses a GitHub repo URL or reference (e.g. `owner/repo`).
2. Fetches the repo root directory to auto-detect the package ecosystem:
   - `package.json` → Node.js/npm
   - `requirements.txt` → Python
   - `go.mod` → Go
   - `Gemfile` → Ruby
   - `Cargo.toml` → Rust
3. Reads the manifest file and parses all dependencies (name + version constraint).
4. Analyzes each dependency for:
   - **Version hygiene** — unpinned ranges (`*`, `latest`), open-ended `>=` without upper bound
   - **Deprecated packages** — curated lists (npm: `request`, `moment`, `tslint`, etc.; Python: `nose`, `pep8`, etc.)
   - **Dev/prod separation** — dev tools listed as production dependencies
   - **Lock file presence** — warns if no lock file found
5. Checks for automated dependency management (Dependabot or Renovate config).
6. Produces a risk-scored health report with upgrade priorities and actionable recommendations.

## Integration dependency

This agent requires `guildai~github` to be connected in the workspace with valid GitHub credentials.

## Tools used

- `github_repos_get_content` — Read directory listings, manifest files, Dependabot/Renovate config

## Input format

GitHub repo URL:

```
https://github.com/acme/app
```

Short reference:

```
acme/app
```

With specific manifest:

```
acme/app | packages/backend/package.json
```

## Output

```markdown
## Dependency Health Report

**Repository**: acme/app
**Node.js (npm): 24 prod + 18 dev dependencies**
**Automated updates**: Dependabot configured
**Findings**: 4

### Findings

| Severity | Category | Package | Description |
| --- | --- | --- | --- |
| **HIGH** | Deprecated | `request` | request is deprecated. Use undici, got, or node-fetch instead |
| **HIGH** | Version Hygiene | `lodash` | lodash uses unpinned version "*" — builds are non-deterministic |
| **MEDIUM** | Dev/Prod Separation | `jest` | jest appears to be a dev tool but is listed as a production dependency |
| **MEDIUM** | Automation | `dependency-tooling` | No Dependabot or Renovate config detected |

### Upgrade Priority

1. **request** — request is deprecated. Use undici, got, or node-fetch instead
2. **lodash** — lodash uses unpinned version "*" — builds are non-deterministic
```
