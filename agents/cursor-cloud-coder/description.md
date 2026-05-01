Dispatches a Cursor cloud coding agent to work on a GitHub repository.

Give it a GitHub repo URL and a task description. It creates a Cursor cloud agent
in an isolated VM, sends the task as a prompt, polls until the agent finishes,
and returns the result including branch name, PR URL, and dashboard link.

The Cursor agent has full codebase indexing, semantic search, and can read, write,
and test code. When it finishes, it auto-creates a pull request on the repository.

If polling fails or times out, the agent still returns the dashboard URL and IDs
so you can check the result manually.

Example inputs:

- "Fix the auth token expiry bug in https://github.com/myorg/myrepo"
- "Add unit tests for the payment module in https://github.com/myorg/billing"
- "Update the README setup instructions in https://github.com/myorg/docs"
