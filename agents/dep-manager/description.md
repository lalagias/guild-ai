Audits a repository's dependency health across multiple ecosystems.

Give it a GitHub repo reference (e.g. owner/repo). It auto-detects the package
ecosystem (npm, Python, Go, Ruby, Rust), fetches manifest files, and analyzes for
unpinned versions, deprecated packages, missing lock files, dev/prod separation
issues, and whether automated dependency tooling (Dependabot/Renovate) is configured.
Produces a risk-scored dependency health report with upgrade priorities.
