# Bryce Update Draft

Send this via Slack after at least two agents have been tested end-to-end with real inputs.

---

## Previous Update (sent)

Update on the agent backlog. Two new Hub integrations live: Firecrawl (web research, scrape, search) and v0.app (UI scaffolding). Credentials vaulted, available to every Guild agent.

On your three:

- **7 (Docs)**: already shipped — `documenter` and `pr-doc-impact`. Done.
- **3 (RCA)**: shipped an RCA agent that uses the existing `guildai~aws-cloudwatch` integration. It runs Logs Insights queries, correlates with recent PRs, checks anomaly detectors, and produces an incident brief with ranked hypotheses. Never claims definitive root cause. **One ask**: connect CloudWatch credentials in the workspace so we can run it live. Until then it works in manual-input mode (pasted alert + logs).
- **2 (Security)**: shipped a quiet PR risk-scorer. Stays silent on low-risk PRs, comments only on medium+, and dispatches Cursor for high-severity findings with a clear remediation hint. Explicit anti-CodeRabbit posture.

Plus two new ones:

- `issue-triage-router` — Linear/GitHub issue → classify + label + route + optional Cursor dispatch, all in one agent.
- `test-generator` — PR → generates tests in the project's existing framework via Guild's coding container, opens a draft PR, no Cursor needed.

Two opportunistic adds on top of the new integrations:

- `web-researcher` (Firecrawl) — scoped web research with cited sources.
- `ui-prototyper` (v0) — UI brief → working React prototype → live deployment URL.

Sample inputs and run links inline when you want them. Let me know which one you want to push on a real customer first.

---

## Latest Update (draft — send now)

Pushed another batch today. Three new agents from the scoring matrix, two for multi-model routing, plus a new Hub integration.

**From the matrix:**

- `code-review` — quiet PR reviewer. Scans diffs for security, logic bugs, perf anti-patterns, and API contract breaks. Signal gate: stays silent unless findings are medium+. Same anti-CodeRabbit posture as the security agent.
- `cicd-optimizer` — reads a repo's `.github/workflows/`, flags missing caching, overly broad triggers, no timeouts, dangerous `pull_request_target` usage, sequential jobs that could parallelize. Outputs ready-to-paste YAML fixes.
- `dep-manager` — multi-ecosystem dependency health audit (npm, Python, Go, Ruby, Rust). Flags deprecated packages, unpinned versions, missing lock files, no Dependabot/Renovate config. Produces a risk-scored upgrade priority list.

**OpenRouter integration + agents:**

- `dkountanis~openrouter` — Hub integration wrapping OpenRouter's full API. Bearer auth, credential-vaulted.
- `model-eval` — fan-out a prompt to N models, get side-by-side cost/latency/quality comparison.
- `prompt-router` — classify task type + user preference, pick optimal model from tiered candidates, run completion, return result with routing metadata.

**In progress:**

- `skills-discovery` — agent that searches the skills.sh catalog, fetches SKILL.md content + security audits, and recommends installable skills. Hub integration (`dkountanis~skills-sh`) is specced and ready to publish, but skills.sh requires an API key for any requests and mine is pending. Will publish once the key comes through.

- Minor platform note: the Integration Hub doesn't allow defining endpoints without authentication configured, even for APIs that have a public unauthenticated tier. Not blocking — just something I noticed when setting up skills.sh.

Running total: 14 agents + 5 Hub integrations. Let me know if you want sample runs or which ones to push toward a customer demo first.
