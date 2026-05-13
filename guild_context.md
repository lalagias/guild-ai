# Guild.ai Engagement: Strategic Context And Agent Backlog

Read this entire file before generating any implementation plan for a Guild agent. The point is not just to build isolated agents for money. The point is to sequence agent work so it proves Guild's platform value and moves the engagement toward higher-leverage system ownership.

## 1. Who Guild.ai Is

Guild.ai is an early-stage, well-funded startup positioning itself as a control plane for AI agents. Their product covers orchestration, observability, deployment, credential handling, governance, and lifecycle management of agents in production.

- Funding: roughly $44M raised across Seed and Series A, with backers including GV.
- Estimated valuation: roughly $300M.
- Stage: strong product opinions and early internal adoption patterns, but still proving external lighthouse use cases.
- Differentiation: Microsoft Agent 365 and GitHub's enterprise agent control plane compete in the same category, but are locked to their own ecosystems. Guild's viable wedge is platform-neutral, multi-tracker, multi-model orchestration.

## 2. My Position In The Engagement

- Dimitris Kountanis, VP of Product Engineering at Native Teams.
- Operating Moccalabs as the external-work entity.
- Already shipped an issue-to-plan agent for Guild and was paid $3,000.
- Also did content amplification and was paid $1,000.
- Demoed live to Guild's CEO and team, creating strong internal trust.

Key stakeholders:

- CEO: highest-leverage relationship; attended the live demo.
- Christina: CMO, ex-Robinhood CMO; opened the door for current paid work.
- Bryce: day-to-day engineering/product channel for scoping agent builds.
- Jillian: coordination and partnerships.

## 3. Strategic Frame

Guild needs lighthouse use cases that prove the platform layer is worth paying for. Orchestration, observability, governance, and lifecycle management have weak value with a single isolated agent. They matter when there is a connected system of agents doing real work.

Therefore:



- Single isolated agents are low leverage.
- Connected multi-agent pipelines are high leverage because they demonstrate Guild's platform features.
- The harness layer is the highest-leverage area: codebase indexing, semantic search, MCP catalog, credential vault, observability, and safe handoffs.
- Commissioned agents are evidence for Guild's product, not the product itself.

The longer-term play is to move from per-agent contractor pricing, currently around $1,500 per agent, to retainer or platform-contributor pricing around $10k-$15k/month or higher by becoming the person who designs and owns the agent system layer.

## 4. Current Conversation State

Bryce shared a scoring matrix of common dev workflow agents and recommended one of:

- Security Scan + Auto-Remediation
- Incident RCA / Troubleshooting
- Documentation

Current stance:

- Documentation: shipped. `documenter` and `pr-doc-impact` are live. Done.
- Security Scan: in progress. Quiet PR risk scoring with optional Cursor remediation handoff for high-severity findings. Anti-CodeRabbit posture — stays silent on low-risk PRs.
- Incident RCA: in progress. Uses the official `guildai~aws-cloudwatch` integration (v1.0.0). Runs real Logs Insights queries, correlates with recent PRs, produces ranked hypotheses. Graceful credential fallback to manual-input mode if CloudWatch isn't connected yet. Credential wiring is the one ask for Bryce.
- Issue Triage + Routing: in progress. One agent that classifies and takes routing actions inline (labels, owner, comment, optional Cursor dispatch). Uses Linear and GitHub tools.
- Test Generation: in progress. Standalone agent using Guild's experimental-coding container. Detects test framework, writes tests, runs them, opens draft PR.
- Codex: dropped. App Server is local JSON-RPC stdio, not REST. SDK is npm-only (same Guild runtime blocker as @cursor/sdk). Set aside.
- OpenAI Responses API: dropped. Out of scope.
- Integration Hub additions: Firecrawl (dkountanis~firecrawl), v0.app (dkountanis~v0-app-api), and OpenRouter (dkountanis~openrouter) published and tested. Firecrawl and v0 unlock web-researcher and ui-prototyper agents. OpenRouter unlocks model-eval (multi-model comparison) and prompt-router (smart model selection) agents.

Strategic external context: OpenAI released Symphony in April 2026, an open-source spec for orchestrating Codex agents from a Linear board. They are not productizing it. This validates Guild's category and leaves the multi-tracker, multi-model, production governance lane open.

## 5. Cursor SDK As Execution Harness

On April 29, 2026 Cursor publicly released `@cursor/sdk` (TypeScript, public beta). This is the single most important infrastructure event for the Guild engagement since Symphony.

What the SDK provides:

- Scriptable coding agents via `Agent.create()` / `agent.send()` / `run.stream()`.
- Local runtime (agent runs in-process against the filesystem) and cloud runtime (dedicated VM, cloned repo, auto-PR via `autoCreatePR: true`).
- Full Cursor harness: codebase indexing, semantic search, instant grep, MCP servers, subagents, hooks, and skills.
- Every model Cursor supports (Composer 2, GPT-5.5, Claude Opus 4, etc.) via a single `model` field.
- Conversation state persists across runs; agents can be resumed by ID.
- Artifacts, cancellation, and structured event streaming.

Why this matters for Guild:

- The harness problem is solved. Codebase indexing, semantic search, safe multi-file edits, and test-aware patching were previously the hardest prerequisites. The Cursor SDK provides all of them out of the box.
- Tier 3 multi-agent pipelines drop from difficulty 5 to difficulty 2-3. Guild agents handle triage, planning, and orchestration; Cursor SDK agents handle code execution and PR creation.
- MCP integration is native. Cursor SDK agents consume MCP servers inline (stdio and HTTP, with credential injection). Guild's MCP Connection Catalog becomes the supply side; Cursor SDK agents are the demand side.
- Guild as control plane over Cursor execution is the positioning. Guild orchestrates, observes, and governs. Cursor executes. This is platform-neutral, multi-model orchestration in practice.
- Repo-Aware Context Retriever is partially obviated. Cursor's own codebase indexing handles single-repo context. Guild's retriever is only needed for cross-repo or non-code contexts.

Guild integration path:

- Directly importing `@cursor/sdk` into a Guild agent does NOT work. Guild's build pipeline (esbuild inside podman) cannot resolve the SDK's internal ESM imports. Guild's babel agent compiler also cannot handle dynamic `import()` or optional chaining. This was tested and confirmed with agent `dkountanis/cursor-cloud-coder` (validation failed at the metadata extraction step).
- The working path is a Guild custom integration wrapping Cursor's Cloud Agents REST API. Guild supports custom integrations that proxy HTTP requests to external APIs with auth injection, rate limiting, and credential vaulting. See `docs/guild-custom-integrations.md`.
- Cursor exposes a Cloud Agents REST API (`api.cursor.com/v1/agents`). See `docs/cursor-cloud-agents-api.md` for the full endpoint reference and Guild tool name mapping.
- To build: define endpoints in Guild's Integration Hub mapping to Cursor's REST API, set authentication to API key, publish. Agents then import `cursorTools` from `@guildai-services/...` like any other service. Guild's proxy handles `CURSOR_API_KEY` injection.
- Standalone `@cursor/sdk` scripts in `cursor-agents/` work fine outside Guild's runtime and serve as demos and local tooling.

Local workspace setup:

- The official Cursor cookbook lives at `cookbook/` with quickstart, kanban, app-builder, and coding-agent-cli examples.
- The Cursor SDK skill plugin is installed and available for development guidance.
- SDK docs are cached locally at `uploads/typescript-0.md`.
- `CURSOR_API_KEY` is set in `.env.local`.

## 6. Agent Backlog

### Tier 1: Quick Wins

These should ship in 1-2 weeks and can be priced around $1.5k-$3k each.

1. Documentation Agent
   - Trigger on PR diff scope.
   - Decide whether docs need updates.
   - Suggest or draft doc changes.
   - High demand, low adoption, moderate difficulty.
   - Status: documenter agent exists; needs improvement.

2. Standup / Status Agent
   - Scans Linear, Slack, GitHub activity per person.
   - Produces team status updates.
   - Easy to demo and low difficulty.

3. Customer Issue To Engineering Ticket Agent
   - Converts support ticket or Slack message into a clean Linear ticket.
   - Includes repro steps, severity, owner suggestions, and acceptance criteria.

### Tier 1.5: Cursor SDK Proof-of-Concept Agents

These are small, self-contained agents built on `@cursor/sdk` that prove the Guild-plus-Cursor execution model. Ship in days, not weeks. High demo value.

1. PR Explainer Agent
   - Takes a GitHub PR URL, clones the repo via Cursor SDK cloud agent, asks the agent to produce a structured summary of what changed and why.
   - Demonstrates Guild orchestrating a Cursor SDK agent against a real repo.
   - Output: structured markdown summary suitable as PR description or Slack post.

2. Issue Triage To Cursor Agent
   - Reads a GitHub issue, generates an implementation plan, kicks off a Cursor SDK cloud agent with that plan as the prompt.
   - The Cursor agent works against the repo; result is a branch (PR creation when cloud supports autoCreatePR for the target repo).
   - Demonstrates the full triage-to-code handoff.

### Tier 2: Harness Layer

This is the strategic gold and should be framed as platform contribution, not single-agent work. The Cursor SDK reduces the scope here: Guild no longer needs to build codebase indexing or semantic search. Focus shifts to MCP catalog, credential vaulting, and cross-agent observability.

1. MCP Connection Catalog
   - One-click connection to GitHub, Linear, Slack, Sentry, PagerDuty, Postgres, CloudWatch, Firecrawl, Brave Search, Notion, Stripe, and more.
   - Includes credential vaulting and usage observability.
   - This is Guild's product surface. Cursor SDK agents consume these MCP servers natively.

2. API To MCP Generator
   - Input OpenAPI/Swagger spec or Postman collection.
   - Output a working MCP server.
   - High demand, low adoption, moderate-high difficulty.

3. MCP Tool Generator From Codebase
   - Given a codebase, scaffold an MCP server exposing selected functions as tools.

4. Diff Intelligence Agent
   - Understands what a PR changes semantically.
   - Foundation for code review, documentation triggers, and security scoring.
   - Can now leverage Cursor SDK's codebase indexing for deeper analysis.

### Tier 3: Multi-Agent Pipelines

These are the showcase builds. The Cursor SDK makes them buildable now, not aspirational.

1. Issue Triage Pipeline
   - Guild triage agent reads issue, generates structured plan.
   - Plan is handed to a Cursor SDK cloud agent with the repo and plan as prompt.
   - Cursor agent writes code, creates branch, opens PR via `autoCreatePR: true`.
   - Developer reviews in the morning.
   - Difficulty: 2-3 with Cursor SDK (was 3-5 before).

2. Incident RCA Pipeline
   - CloudWatch alert to log surfacing.
   - Recent PR correlation sub-agent.
   - Hypothesis generation.
   - Fix proposal handed to Cursor SDK agent for implementation.
   - Customer attached at Guild, commercially valuable.

3. Bug To Fix To Ship Pipeline
   - Sentry alert to triage, repro, fix via Cursor SDK agent, PR, review, deploy.
   - Build incrementally; the Cursor SDK handles the fix-to-PR segment.

4. Customer Feedback To Roadmap Pipeline
   - Support tickets, Slack mentions, and sales calls to clusters, product opportunities, and Linear tickets.

### Tier 4: Higher-Judgment Agents

Previously blocked on the harness layer. The Cursor SDK unblocks several of these.

1. Quieter Code Review Agent
   - Existing tools over-flag to justify existence.
   - Real opportunity is an agent that stays silent most of the time and only comments when signal is high.
   - Cursor SDK's codebase indexing and semantic search make this feasible now.

2. Security Scan + Auto-Remediation
   - V1 risk scoring is feasible.
   - Auto-remediation is now feasible via Cursor SDK: indexing, semantic search, safe multi-file edits, and test-aware patching are built in.
   - Build incrementally: risk scoring first, then Cursor SDK agent for remediation.

## 7. Build Sequencing Logic

Revised roadmap (post Cursor SDK):

1. PR Explainer Agent: smallest Cursor SDK proof-of-concept. Ship in days. Proves the Guild-to-Cursor execution pattern.
2. Issue Triage To Cursor Agent: the flagship demo. Guild triage plus Cursor execution plus PR output.
3. Documentation Agent: improve existing agent; optionally add Cursor SDK execution for doc edits.
4. Incident RCA Pipeline: scope when data walkthrough exists; Cursor SDK handles the fix segment.
5. MCP Connection Catalog: actual platform contribution. Cursor SDK agents are native consumers.
6. Quieter code review, security remediation, and deeper workflows: now unblocked by the SDK.

## 8. Constraints For Planning Agents

When generating implementation plans for any Guild agent:

- Identify which tier the requested agent belongs to.
- If Tier 2 or higher, call out prerequisites and whether they exist.
- Design outputs as structured inputs for another agent whenever possible.
- Estimate token cost per run and flag anything above 500k tokens.
- For code execution, prefer the Cursor SDK (`@cursor/sdk`) as the harness. Do not rebuild codebase indexing, semantic search, or safe edit loops inside a Guild agent.
- Use Linear or GitHub as the control surface, mirroring the Symphony pattern.
- Treat tickets and PRs as state machines.
- Credentials should never reach agent context; assume credential vaulting belongs to the platform layer.
- Each agent should ship in 1-2 weeks max. If larger, call it an infrastructure initiative.
- Never propose generic indexing, search, or MCP infrastructure inside a single agent build. That belongs to the platform layer.
- When designing Cursor SDK integrations: always dispose agents, distinguish startup errors from run errors, log `run.id` and `agent.agentId` immediately after `send()`, and respect `error.isRetryable`.

## 9. Pricing And Engagement Structure

- Current per-agent pricing: around $1,500 per agent. Low, but acceptable temporarily to maintain momentum.
- Target: move to retainer or platform contribution pricing around $10k-$15k/month or higher.
- Moccalabs is the invoicing entity; build entity legitimacy in parallel with Guild work.

## 10. Communication Strategy

Default posture: proactive, artifact-driven updates every 24-48 hours.

Good update format:

> I made progress on X. It now does Y on sample input. To make it production-ready for Guild/customer use, I need A or B. If you are busy, I will continue with default assumption C and keep it demoable.

For Bryce:

- Keep messages short and concrete.
- Prefer "I built/tested/found" over "what should I do?"
- Ask option-based questions.
- If he is slow, proceed with fixtures, mocked payloads, or sample repos and make assumptions explicit.

For CEO/Christina:

- Frame around system-level value, not isolated agent tasks.
- Mention Symphony as validation of Guild's control-plane category.
- Position Moccalabs/Dimitris as a partner who can turn ambiguous agent ideas into platform proof.

## 11. Pending Work

- Build and test issue-triage-router agent end-to-end on real GitHub and Linear issues.
- Build and test test-generator agent against a real PR.
- Build and test security-scan agent against PRs with real risk signals and no-risk baselines.
- Build and test rca-incident-brief agent against sample CloudWatch alert; demo to Bryce with credential wiring ask.
- Build opportunistic web-researcher (Firecrawl) and ui-prototyper (v0) agents.
- Test model-eval and prompt-router agents end-to-end via OpenRouter integration.
- Update docs/integration-hub-roadmap.md as integrations and agents ship.
- Send Bryce consolidated update with sample runs and integration links.
- Draft strategic memo to CEO proposing system-level engagement and retainer pricing.
