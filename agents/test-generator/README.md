# Test Generator

Guild agent that generates tests for GitHub repositories and opens draft PRs.

## How It Works

1. Spins up an isolated coding container (same harness as `documenter`)
2. Clones the repo and detects language + test framework
3. Identifies target files from a PR diff, explicit file path, or coverage sweep
4. Writes tests following the project's existing conventions
5. Runs the test suite to verify
6. Opens a draft PR with test execution results

## Rules

- Never introduces a new test framework
- Max 5 new test files per run
- Always opens PRs as draft
- Documents what is NOT tested and why

## Usage

```
guild agent test --ephemeral
> https://github.com/myorg/myrepo/pull/42
```

## Dependencies

- `@guildai-services/guildai~github` (repo access, PR creation)
- `@guildai-services/guildai~experimental-coding` (coding container)
