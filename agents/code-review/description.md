Quiet code reviewer that only speaks when it finds real issues.

Give it a GitHub PR URL or reference (e.g. owner/repo#42). It fetches the diff,
scans for security flaws, logic bugs, performance anti-patterns, and API contract
breaks. If nothing reaches medium severity, it stays silent. When it does comment,
findings are structured by file with severity and concrete descriptions.

Anti-CodeRabbit posture: no noise on clean PRs.
