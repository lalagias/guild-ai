Analyzes GitHub Actions workflows and suggests concrete optimizations.

Give it a GitHub repo reference (e.g. owner/repo). It reads every workflow YAML
under .github/workflows/, detects anti-patterns like missing caching, overly broad
triggers, sequential jobs that could parallelize, missing timeouts, and security
misconfigurations. Produces a structured report with per-workflow findings, estimated
time savings, and ready-to-use YAML fix snippets.
