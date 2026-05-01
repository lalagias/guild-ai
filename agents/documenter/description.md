Documentation updater that analyzes GitHub pull requests and creates corresponding documentation updates.

Takes a GitHub pull request reference, analyzes the code changes, reviews existing public documentation in a specified documentation repository, and implements necessary documentation updates to keep docs accurate and in sync with the codebase. Creates a PR on the documentation repository with the proposed changes.

Input: A GitHub PR URL (`https://github.com/owner/repo/pull/123`) or short reference (`owner/repo#123`). Optionally include the docs repository target, for example `docs: owner/docs`. If no docs repository is specified, the agent defaults to `guildaidev/docs`.
