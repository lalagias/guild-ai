# Guild.ai Engagement — Deliverables Summary

**Prepared by:** Dimitris Kountanis / Moccalabs
**Date:** May 2, 2026

---

## Executive Summary

- **9 agents** built and validated (3 shipped earlier, 6 new this sprint)
- **3 custom integrations** published to Guild's Integration Hub
- **1 official Guild integration** consumed (`guildai~aws-cloudwatch`)
- Key technical findings on Cursor SDK runtime constraints and Guild build pipeline boundaries
- Forward roadmap for MCP catalog, multi-agent pipelines, and platform-level work

---

## Integration Hub Work

### Published Integrations (built by us)

#### `dkountanis~cursor-cloud-agents` — v1.0.0+

Wraps Cursor's Cloud Agents REST API (`https://api.cursor.com`) so Guild agents can create cloud coding agents, poll run status, and retrieve artifacts without importing `@cursor/sdk` directly.

| Field | Value |
| --- | --- |
| Auth | API key (Basic Auth, `CURSOR_API_KEY` as username) |
| Endpoints | `create_agent`, `get_agent`, `list_agents`, `get_run`, `cancel_run`, `list_artifacts`, `list_models` |
| Consumed by | `cursor-cloud-coder`, `issue-triage-router` (dispatch), `security-scan` (remediation handoff) |

#### `dkountanis~firecrawl` — v1.0.0

Firecrawl v2 API for web scraping, crawling, search, and structured extraction. Turns any URL into clean, LLM-ready markdown or JSON.

| Field | Value |
| --- | --- |
| Base URL | `https://api.firecrawl.dev` |
| Auth | API key (Bearer header, `FIRECRAWL_API_KEY`) |
| Endpoints | `firecrawl_scrape`, `firecrawl_crawl`, `firecrawl_crawl_status`, `firecrawl_search`, `firecrawl_map`, `firecrawl_agent` |
| Consumed by | `web-researcher`, `rca-incident-brief` (optional enrichment) |

#### `dkountanis~v0-app-api` — v1.0.0

v0.app API for AI-powered UI generation. Create React/Next.js components from natural language, iterate via chat, deploy to live URLs.

| Field | Value |
| --- | --- |
| Base URL | `https://api.v0.dev` |
| Auth | API key (Bearer header, `V0_API_KEY`) |
| Endpoints | `v0_chats_init`, `v0_chats_create`, `v0_chats_get`, `v0_chats_send_message`, `v0_projects_create`, `v0_projects_find`, `v0_deployments_create` |
| Consumed by | `ui-prototyper` |

### Consumed Integrations (not built by us)

| Integration | Owner | Used by |
| --- | --- | --- |
| `guildai~github` | Guild (first-party) | `issue-triage-router`, `test-generator`, `security-scan`, `rca-incident-brief`, `documenter`, `pr-doc-impact` |
| `guildai~aws-cloudwatch` v1.0.0 | Guild / Yun Yu | `rca-incident-brief` |
| Linear (built-in) | Guild | `issue-triage-router` |

### Explicitly Dropped

| Integration | Reason |
| --- | --- |
| Codex Hub integration | App Server is JSON-RPC over stdio/websocket — not addressable via Guild's HTTP-only Integration Hub |
| OpenAI Responses API | Out of scope this round |
| Linear Hub build | Already exists in Guild |
| CloudWatch Hub build | Already exists as `guildai~aws-cloudwatch` |

---

## Agents Delivered

### Shipped Earlier

#### 1. `documenter`

Analyzes a GitHub PR, plans documentation changes, implements them inside Guild's experimental-coding container, and opens a docs PR.

| Field | Value |
| --- | --- |
| Type | Code-first (`"use agent"` + experimental-coding container) |
| Integrations | `guildai~experimental-coding`, `guildai~github` |
| How it works | Creates a coding container, sends the PR diff and docs repo context, lets the container agent write and commit doc updates, then opens a PR via GitHub tools. Fork of Bryce's original with configurable docs repo target (default: `guildaidev/docs`). |
| Status | Shipped. Published as `dkountanis~documenter`. |

#### 2. `pr-doc-impact`

Read-only PR analysis agent that decides whether a PR requires documentation changes and produces a structured handoff for the `documenter`.

| Field | Value |
| --- | --- |
| Type | `llmAgent` (no container, no side effects) |
| Integrations | `guildai~github` |
| How it works | Fetches PR metadata and changed files, classifies impact (docs-required / optional / none / unsure), outputs evidence and a handoff prompt. Does not write or edit anything. |
| Status | Shipped. Published as `dkountanis~pr-doc-impact`. |

#### 3. `cursor-cloud-coder`

Guild agent that dispatches Cursor Cloud Agents for code execution. Proves the Guild-as-control-plane, Cursor-as-runtime pattern.

| Field | Value |
| --- | --- |
| Type | Code-first (`"use agent"` + Zod schemas) |
| Integrations | `dkountanis~cursor-cloud-agents` |
| How it works | Parses a GitHub repo URL and task description, creates a Cursor cloud agent (composer-2, `autoCreatePR: true`), polls run status every 15 seconds (up to ~20 min), returns agent ID, dashboard URL, branch name, and summary. Falls back with a dashboard link if polling times out. |
| Status | Shipped. Published as `dkountanis~cursor-cloud-coder`. |

---

### New This Sprint

#### 4. `issue-triage-router`

Single agent that classifies a GitHub issue and takes routing actions inline — labels, triage comment, and optional Cursor agent dispatch.

| Field | Value |
| --- | --- |
| Type | Code-first (`"use agent"` + Zod schemas) |
| Integrations | `guildai~github`, `dkountanis~cursor-cloud-agents`, Linear (built-in) |
| How it works | Parses a GitHub issue URL, fetches issue body/comments/labels, runs keyword heuristics for kind/severity/area/routing, posts a structured triage comment, and optionally creates a Cursor cloud agent for `cursor-dispatch` routing. |
| Caveats | Label application via GitHub API is stubbed out (API format issues encountered — suggested labels appear in the triage comment only). `description.md` mentions Linear support but the parser currently handles GitHub only. Classification uses heuristics, not nested LLM calls (Guild's `"use agent"` mode constraint). |
| Status | Built and validated locally. |

#### 5. `test-generator`

Standalone agent that generates tests for a PR or repository using Guild's experimental-coding container. No Cursor dependency.

| Field | Value |
| --- | --- |
| Type | Code-first (`"use agent"` + experimental-coding container) |
| Integrations | `guildai~experimental-coding`, `guildai~github` |
| How it works | Same container pattern as `documenter`. Takes a PR URL, file reference, or repo. Creates a coding container, detects the project's test framework, generates tests (capped at 5 files), runs them inside the container, and opens a draft PR. Will not introduce a new test framework — uses whatever the project already has. |
| Caveats | Same `(task as any).tools` bridge as `documenter` due to SDK type lag. |
| Status | Built and validated locally. |

#### 6. `security-scan`

Quiet PR risk-scoring agent with an explicit anti-CodeRabbit posture: stays silent on low-risk PRs, comments only on medium+ risk, and dispatches Cursor for high-severity remediation.

| Field | Value |
| --- | --- |
| Type | `llmAgent` with system prompt |
| Integrations | `guildai~github`, `dkountanis~cursor-cloud-agents` |
| How it works | LLM analyzes PR diff against a security risk taxonomy (defined in `system-prompt.md`). Scores risk level. Low risk = no comment, no noise. Medium risk = GitHub comment with findings. High risk = comment + Cursor cloud agent dispatch with a remediation hint. |
| Caveats | Behavior quality depends on the system prompt and model. Needs real PRs with known risk signals to validate scoring accuracy. |
| Status | Built and validated locally. |

#### 7. `rca-incident-brief`

Incident analysis agent that produces a structured brief with ranked hypotheses. Designed to use CloudWatch for log analysis and GitHub for PR correlation.

| Field | Value |
| --- | --- |
| Type | Code-first (`"use agent"` + Zod schemas) |
| Integrations | `guildai~github`, `dkountanis~firecrawl` (runbook scraping), `guildai~aws-cloudwatch` (designed for, not yet wired) |
| How it works | Accepts a JSON alert payload or free-text incident description. Extracts time window, service, environment. Generates suggested CloudWatch Logs Insights queries. Searches GitHub for recently merged PRs in the time window. Optionally scrapes a runbook URL via Firecrawl. Produces ranked hypotheses with confidence levels, suggested next steps, and a handoff prompt. Never claims definitive root cause. |
| Caveats | CloudWatch tools are referenced in the README and designed for but **not yet active in the code path** — the agent needs Bryce/Guild admin to connect AWS credentials in the workspace. Until then, it operates in manual-input mode (pasted alert JSON + log samples) and uses GitHub + Firecrawl. `system-prompt.md` is imported but unused (dead import). |
| Status | Built and validated locally. Pending CloudWatch credential wiring for live testing. |

#### 8. `web-researcher`

Scoped web research agent powered by Firecrawl. Scrapes, searches, and synthesizes information with cited sources.

| Field | Value |
| --- | --- |
| Type | `llmAgent` with system prompt |
| Integrations | `dkountanis~firecrawl` |
| How it works | Takes a research topic or question. Uses `firecrawl_search` to find relevant pages, `firecrawl_scrape` to extract content, and `firecrawl_map` for site structure. Synthesizes findings into a markdown report with cited URLs. System prompt prefers 2025-2026 sources. |
| Caveats | Requires Firecrawl API credentials (`FIRECRAWL_API_KEY`). |
| Status | Built and validated locally. |

#### 9. `ui-prototyper`

UI generation agent that drives v0.app to create React/Next.js components from natural language descriptions and deploy them.

| Field | Value |
| --- | --- |
| Type | `llmAgent` with system prompt |
| Integrations | `dkountanis~v0-app-api` |
| How it works | Takes a UI description or existing code files. Uses v0 chat API to generate or iterate on components. Can create projects, send follow-up messages for refinement, and deploy to a live URL. Returns markdown with chat and deployment links. |
| Caveats | Requires v0 API credentials (`V0_API_KEY`). |
| Status | Built and validated locally. |

---

### Agent-to-Integration Dependency Map

| Agent | Integrations |
| --- | --- |
| `cursor-cloud-coder` | `dkountanis~cursor-cloud-agents` |
| `documenter` | `guildai~github`, `guildai~experimental-coding` |
| `pr-doc-impact` | `guildai~github` |
| `issue-triage-router` | `guildai~github`, Linear, `dkountanis~cursor-cloud-agents` |
| `test-generator` | `guildai~github`, `guildai~experimental-coding` |
| `security-scan` | `guildai~github`, `dkountanis~cursor-cloud-agents` |
| `rca-incident-brief` | `guildai~github`, `dkountanis~firecrawl`, `guildai~aws-cloudwatch` (pending) |
| `web-researcher` | `dkountanis~firecrawl` |
| `ui-prototyper` | `dkountanis~v0-app-api` |

### SDK Pattern Summary

| Pattern | Agents |
| --- | --- |
| `agent()` + `"use agent"` + Zod I/O | `cursor-cloud-coder`, `documenter`, `issue-triage-router`, `rca-incident-brief`, `test-generator` |
| `llmAgent()` + system prompt | `pr-doc-impact`, `security-scan`, `ui-prototyper`, `web-researcher` |
| Experimental-coding container | `documenter`, `test-generator` |
| Cursor cloud agent dispatch | `cursor-cloud-coder`, `issue-triage-router`, `security-scan` |

---

## Technical Findings and Caveats

### Cursor SDK Runtime Blocker

Importing `@cursor/sdk` directly into a Guild agent does not work. Guild's build pipeline (esbuild inside podman + Babel agent compiler) cannot resolve the SDK's internal ESM dynamic imports and optional chaining. This was tested and confirmed with the `cursor-cloud-coder` agent — validation failed at the metadata extraction step.

**Workaround:** A Guild custom integration (`dkountanis~cursor-cloud-agents`) wraps Cursor's Cloud Agents REST API. Guild's proxy layer handles `CURSOR_API_KEY` injection. Agents get tools like `cursor_cloud_agents_create_agent` as first-class Guild tools. This is the production path.

Standalone `@cursor/sdk` scripts in `cursor-agents/` (issue-triage and pr-explainer demos) work fine outside Guild's runtime and serve as local demos.

### Codex — Dead End for Guild

| Surface | Works in Guild? | Reason |
| --- | --- | --- |
| Codex App Server | No | JSON-RPC over stdio/websocket. Guild's Integration Hub is HTTP-only. |
| Codex SDK (npm) | No | Same blocker as `@cursor/sdk` — Guild's runtime rejects arbitrary npm packages. |
| Codex CLI / IDE | No | Local interactive tools, no programmatic dispatch surface. |
| Codex GitHub Action | Yes (no integration needed) | Post `@codex` comments using existing `gitHubTools.github_issues_create_comment`. Codex Cloud picks them up. |

### Guild Build Pipeline Constraints

- Guild's Babel agent compiler (`@guildai/babel-plugin-agent-compiler`) is required for `"use agent"` code-first agents. `llmAgent` agents skip Babel and use plain `tsc`.
- Service integrations (`@guildai-services/*`) must not appear in `package.json` — they are injected at runtime by the Guild platform.
- Published SDK types sometimes lag behind runtime behavior — several agents use `(task as any).tools` as a bridge.

### CloudWatch Credential Gap

The `guildai~aws-cloudwatch` integration (v1.0.0, published by Yun Yu) exists and exposes the full CloudWatch Logs API. The `rca-incident-brief` agent is designed to consume it. However, AWS credentials need to be connected in the Guild workspace by an admin. Until then, the agent operates in manual-input fallback mode.

### Anti-Noise Discipline

All agents follow a consistent noise-reduction posture:
- **Cite-or-downgrade**: if the agent cannot back a claim with evidence, it downgrades confidence rather than hallucinating.
- **Quiet-by-default**: agents that interact with shared surfaces (PRs, issues) stay silent unless they have high-signal findings.
- **One comment per run**: no comment spam. One structured comment or none.
- **Mock-friendly inputs**: every agent accepts pasted/mocked input so it can be tested without live service connections.

---

## What's Next: MCP and Platform Work

These items move the engagement from per-agent builds toward system-level platform contribution — the strategic goal.

### MCP Connection Catalog

One-click connectors for the services dev teams already use: GitHub, Linear, Slack, Sentry, PagerDuty, Postgres, CloudWatch, Firecrawl, Brave Search, Notion, Stripe, and more. Each connector includes credential vaulting and usage observability. This is Guild's core product surface — Cursor SDK agents consume these MCP servers natively.

### API-to-MCP Generator

Input: OpenAPI/Swagger spec or Postman collection. Output: a working MCP server with typed tools. High demand in the ecosystem, moderate-high build difficulty. Positions Guild as the bridge between existing APIs and the MCP-native agent world.

### Cursor SDK as Guild Integration (production path)

The `dkountanis~cursor-cloud-agents` integration already wraps Cursor's REST API. Next steps:
- SSE streaming support (replace polling with push-based status updates)
- Webhook integration for async completion notifications
- Multi-model selection (expose Cursor's full model catalog to Guild agents)

### Multi-Agent Pipelines

These are the showcase builds that demonstrate Guild's orchestration value:

1. **Issue Triage Pipeline** — Guild triage agent reads issue, generates structured plan, hands off to Cursor SDK cloud agent for code execution, PR opens automatically. Developer reviews in the morning.

2. **RCA Pipeline** — CloudWatch alert triggers log surfacing, recent PR correlation, hypothesis generation, and fix proposal. Fix is handed to Cursor SDK agent for implementation.

3. **Bug-to-Fix-to-Ship Pipeline** — Sentry alert to triage, repro, fix via Cursor SDK agent, PR, review, deploy. Built incrementally; the Cursor SDK handles the fix-to-PR segment.

### Higher-Judgment Agents

- **Quieter Code Review** — stays silent most of the time, only comments when signal is high. Cursor SDK's codebase indexing and semantic search make this feasible.
- **Security Auto-Remediation** — V1 risk scoring is done (`security-scan`). V2 adds Cursor SDK agent to apply fixes, run tests, and open a remediation PR.

---

## Open Asks for Bryce

1. **Connect CloudWatch credentials** in the Guild workspace so `rca-incident-brief` can run live queries instead of manual-input mode.

2. **Pick a customer or repo** to push the first agent on. `issue-triage-router` and `security-scan` are the most immediately useful for a real workflow.

3. **Discuss MCP catalog scope and pricing.** The MCP Connection Catalog and API-to-MCP Generator are platform contributions, not single-agent builds. They warrant retainer or platform-contributor pricing rather than per-agent billing.

---

## Appendix: Source Files

| Resource | Path |
| --- | --- |
| All agent source | `agents/` (9 directories) |
| Integration Hub roadmap | `docs/integration-hub-roadmap.md` |
| Agent backlog | `docs/agent-backlog.md` |
| Cursor REST API reference | `docs/cursor-cloud-agents-api.md` |
| Guild custom integration guide | `docs/guild-custom-integrations.md` |
| RCA MVP design | `docs/rca-cloudwatch-mvp.md` |
| Demo log | `docs/demo-log.md` |
| Strategic context | `guild_context.md` |
| Guild CLI getting started | `guild-cli-getting-started.md` |
