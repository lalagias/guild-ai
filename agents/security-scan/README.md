# Security Scan

Guild agent that quietly scores the security risk of GitHub pull requests.

## Anti-CodeRabbit Posture

- **Silent on low-risk PRs** — no comment, no noise
- **Comments only on medium+ risk** — one concise comment with cited line ranges
- **Every score requires evidence** — if the model can't cite a line range, the score is downgraded
- **Optional Cursor dispatch** — only for high-risk findings with a concrete remediation hint

## Risk Categories

auth/authz, secrets/credentials, injection (sql/cmd/xss), crypto, deserialization, network egress, dependency changes, permission/role changes

## Usage

```
guild agent test --ephemeral
> https://github.com/myorg/myrepo/pull/99
```

## Dependencies

- `@guildai-services/guildai~github` (PR diff, comment)
- `@guildai-services/dkountanis~cursor-cloud-agents` (optional remediation dispatch)
