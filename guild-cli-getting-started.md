CLI
CLI reference
Install the Guild CLI and learn the agent development workflow.

Documentation Index
Fetch the complete documentation index at: https://docs.guild.ai/llms.txt

Use this file to discover all available pages before exploring further.

The Guild CLI is your primary tool for creating, testing, and publishing agents locally.
​
Installation
​
Prerequisites
Node.js 18+ and npm — nodejs.org
A Guild account — your Guild contact provides access
​
Install and authenticate
# Install the CLI
npm i @guildai/cli -g

# Authenticate with Guild
guild auth login

# Verify
guild auth status
guild auth login opens your browser to sign in at app.guild.ai and configures your local npm registry for Guild packages.
​
Coding assistant skills
If you use Claude Code, install Guild CLI skills into your project:
guild setup
This adds SDK reference and CLI workflow docs to .claude/skills/ so your coding assistant understands Guild agent development patterns.
​
Create an agent
mkdir my-agent && cd my-agent
guild agent init
The CLI prompts for a name and template. Skip prompts with flags:
guild agent init --name my-agent --template LLM
​
Templates
Template	Use when
LLM	The LLM drives the logic. You write a prompt and pick tools. Start here.
AUTO_MANAGED_STATE	You write procedural TypeScript that calls tools inline.
BLANK	You want full control over the agent lifecycle.
​
Project structure
my-agent/
├── agent.ts          # Your agent code (edit this)
├── package.json      # Dependencies (runtime packages pre-configured)
├── tsconfig.json     # TypeScript config
├── guild.json        # Local config (managed by CLI, don't edit)
└── .gitignore
​
Write your agent
Edit agent.ts. The template gives you a working starting point.
​
LLM agent
Define a system prompt and tools. No procedural code needed.
import { llmAgent, guildTools } from "@guildai/agents-sdk"
import { gitHubTools } from "@guildai-services/guildai~github"

export default llmAgent({
  description: "Answers questions about GitHub repositories",
  tools: { ...gitHubTools, ...guildTools },
  systemPrompt: `You help users understand their GitHub repositories.
Use the GitHub tools to look up real data when asked.`,
  mode: "multi-turn",
})
mode: "multi-turn" keeps the conversation going after each response. Use "one-shot" (default) when the agent should respond once and finish.
llmAgent automatically includes userInterfaceTools — no need to add them to your tools object.
​
Code-first agent
Write TypeScript that calls tools directly. Requires the "use agent" directive at the top of the file so the runtime can manage state between tool calls.
"use agent"

import { agent, guildTools, type Task } from "@guildai/agents-sdk"
import { gitHubTools } from "@guildai-services/guildai~github"
import { z } from "zod"

const tools = { ...gitHubTools, ...guildTools }
type Tools = typeof tools

const inputSchema = z.object({
  type: z.literal("text"),
  text: z.string().describe("Repository in owner/repo format"),
})

const outputSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
})

async function run(input: z.infer<typeof inputSchema>, task: Task<Tools>) {
  const prs = await task.tools.github_search_issues_and_pull_requests({
    q: `is:pr is:open repo:${input.text}`,
    per_page: 10,
  })

  if (!prs.items?.length) {
    return { type: "text" as const, text: "No open PRs." }
  }

  const summary = prs.items
    .map((pr) => `- #${pr.number}: ${pr.title}`)
    .join("\n")

  return { type: "text" as const, text: summary }
}

export default agent({
  description: "Lists open PRs in a GitHub repo",
  inputSchema,
  outputSchema,
  tools,
  run,
})
​
Tools overview
Agents have access to three categories of tools:
Service tools (gitHubTools, slackTools, etc.) — call third-party APIs. When a user first triggers a service tool, Guild prompts them to connect their account via OAuth.
guildTools — query the Guild platform (agents, workspaces, sessions, triggers).
userInterfaceTools — interact with the user during a session (questions, progress updates).
All tool calls go through task.tools:
const pr = await task.tools.github_pulls_get({ owner, repo, pull_number: 42 })
await task.tools.slack_chat_post_message({ channel: "C123", text: "PR merged" })
const answer = await task.tools.ui_prompt({ type: "text", text: "Which repo?" })
​
Available services
The runtime provides 10 service integrations (GitHub, Slack, Jira, Bitbucket, Azure DevOps, Confluence, Figma, and more). Import them from their @guildai-services/* packages — don’t add them to package.json.
See Service integrations for the full list with import paths.
Credentials for each service are configured at the organization level in Settings > Credentials at app.guild.ai. When an agent first uses a service tool, Guild prompts the user to connect if credentials aren’t already configured.
​
Development loop
The typical workflow: pull, edit, test, save.
​
Pull latest changes
If others are working on the same agent:
guild agent pull
​
Test locally
guild agent test              # Interactive chat session
guild agent test --ephemeral  # Test without saving a version
guild agent chat "Hello"      # Send a single message
guild agent test opens an interactive session. Changes to agent.ts take effect on the next save — no restart needed.
--ephemeral creates a temporary version for testing without committing to version history. Useful for quick iteration before you’re ready to save.
​
Save your work
guild agent save --message "Add Slack notifications"
This commits your code and creates a new version in the Guild backend. Versions start as drafts.
​
Publish
guild agent save --message "Ready to ship" --wait --publish
--wait blocks until validation passes. --publish makes the agent available to your organization.
Publish separately if needed:
guild agent publish
​
Check status
guild agent get                # Agent info and current version
guild agent versions           # Version history
guild agent code               # View source of latest version
​
Key rules
Agent code lives at agent.ts in the project root.
Don’t add @guildai/agents-sdk, zod, or @guildai-services/* to package.json — the runtime provides them.
Call tools through task.tools.<name>(args). Never access services directly.
Use guild agent save to commit and guild agent pull to sync. Don’t use raw git commands.
Don’t edit guild.json — it’s managed by the CLI.
​
Commands
​
Agent commands
guild agent init                          # Create a new agent
guild agent init --fork owner/agent-name  # Fork an existing agent
guild agent clone owner/agent-name        # Clone an agent to work on locally
guild agent pull                          # Pull remote changes
guild agent save --message "..."          # Commit and upload
guild agent publish                       # Publish to your organization
guild agent unpublish                     # Unpublish from your organization
guild agent revalidate                    # Re-run validation
guild agent get                           # Agent info
guild agent versions                      # Version history
guild agent code                          # View latest source
guild agent test                          # Interactive test session
guild agent chat "message"                # Send a single message
​
Other commands
guild auth login              # Authenticate with Guild
guild auth logout             # Sign out
guild auth status             # Check authentication
guild workspace select        # Set default workspace
guild doctor                  # Check CLI setup
guild setup                   # Install coding assistant skills
​
Diagnostics
Run guild doctor to check your setup:
guild doctor
Checking Guild CLI setup...

  ✓ Authentication       Logged in
  ✓ Server               Connected to https://app.guild.ai/api (125ms)
  ✓ Global config        ~/.guild/config.json
  ✓ Default workspace    my-workspace
  - Local config         Not in an agent directory
  ✓ Git                  Installed

5 passed, 0 failed, 1 skipped