Quietly scores the security risk of a GitHub pull request.

Give it a PR URL or reference. It fetches the diff, scores it across a fixed
risk taxonomy (auth, secrets, injection, crypto, deserialization, network egress,
dependency changes, permission/role changes), and computes an overall risk level.

Stays silent on low-risk PRs — no comment, no noise. Comments only when overall
risk is medium or higher, with one concise PR comment citing specific line ranges.
For high-risk findings with a clear remediation path, optionally dispatches a
Cursor cloud agent to implement the fix.

Explicit anti-CodeRabbit posture: this agent only speaks when it has something
worth saying.

Example inputs:

- "https://github.com/myorg/myrepo/pull/99"
- "Scan myorg/myrepo#99 for security risks"
