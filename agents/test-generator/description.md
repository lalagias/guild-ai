Generates tests for a GitHub repository and opens a draft pull request.

Give it a PR URL, a file reference (owner/repo path/to/file), or just a
repository URL for a coverage sweep. It clones the repo in an isolated coding
container, detects the language and test framework, writes tests following the
project's existing conventions, optionally runs them to verify they pass, and
opens a draft PR.

Never introduces a new test framework. If framework detection fails, produces
a markdown report instead of opening a PR. Hard cap of 5 new test files per
run. Always opens PRs as drafts — never auto-merges.

Example inputs:

- "https://github.com/myorg/myrepo/pull/42"
- "myorg/myrepo src/utils/helpers.ts"
- "Generate tests for https://github.com/myorg/myrepo"
