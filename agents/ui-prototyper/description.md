Generates UI prototypes using v0.dev and returns a live preview URL.

Give it a UI brief (what to build) and optionally existing code files. It creates
a v0 chat session, iterates on the design if needed, and returns the v0 chat URL
plus a deployment URL if deployed.

Prefers initializing from existing files (cheaper, faster) over generating from
scratch. Can iterate via follow-up messages to refine the prototype.

Example inputs:

- "Create a dashboard with a sidebar navigation and a data table"
- "Build a settings page with dark mode toggle and form validation"
- "Prototype a landing page for an AI agent platform"
