# Demo Log

Use this file to track concrete progress for Bryce, Guild leadership, and future planning.

## Format

```markdown
## YYYY-MM-DD - Demo Name

- Agent:
- Goal:
- Sample input:
- Observed output:
- What works:
- Missing data or access:
- Next ask:
- Shareable update:
```

## 2026-04-29 - Workspace Setup

- Agent: N/A
- Goal: Prepare a repeatable Guild agent lab.
- Sample input: N/A
- Observed output: Guild CLI auth and doctor passed; context, rules, skills, and docs scaffolded.
- What works: Authenticated as `dkountanis`; default workspace is `developer-sandbox`.
- Missing data or access: Bryce documenter access still needs to be verified by fork/clone.
- Next ask: If fork/clone fails, ask Bryce to grant access or install/share `bryceheltzel/documenter`.
- Shareable update: "I set up a separate local Guild agent lab so I can work on your documenter without blocking the broader agent backlog."

## 2026-04-29 - Separate Documenter Copy

- Agent: `dkountanis/documenter`
- Goal: Create a separate editable copy of Bryce's documenter and make the docs repository configurable.
- Sample input: `owner/repo#123 docs: owner/docs`
- Observed output: Local agent source now builds with TypeScript and the Guild Babel compiler.
- What works: Agent id `019ddae9-eeb6-726e-0000-328a7e72eea1`; source copied from `bryceheltzel/documenter`; prompt defaults to `guildaidev/docs` only when no docs repository is supplied.
- Missing data or access: No live PR test has been run yet; GitHub/Guild credentials may be needed during runtime.
- Next ask: Ask Bryce whether the desired first target is Guild docs, a customer docs repo, or a sample PR.
- Shareable update: "I created a separate documenter copy under my account and made the docs repo configurable instead of hardcoded. Local build passes; next step is a real or sample PR run."

## 2026-04-29 - PR Doc Impact Agent

- Agent: `dkountanis/pr-doc-impact`
- Goal: Create a lightweight owned agent that decides whether a PR needs docs before handing off to a documenter.
- Sample input: `owner/repo#123 docs: owner/docs`
- Observed output: Guild draft version created and validation passed.
- What works: Fetches PR metadata/files through GitHub tools and produces a structured docs-impact handoff.
- Missing data or access: Needs a real PR to test against.
- Next ask: Ask Bryce for a representative PR or use a public/sample PR.
- Shareable update: "I also split out a smaller PR doc-impact agent. It does not write docs; it decides whether docs are needed and produces a handoff packet for the documenter."

## 2026-04-29 - Issue To Workflow Agent

- Agent: `dkountanis/issue-to-workflow`
- Goal: Prototype the Symphony-style layer: work item in, workflow contract and agent handoff out.
- Sample input: A Linear/GitHub/Jira issue body.
- Observed output: Guild draft version created and validation passed.
- What works: Produces tier classification, acceptance criteria, context needs, validation plan, and Bryce update.
- Missing data or access: No tracker integration yet; this version works from supplied issue text.
- Next ask: Use it on a real Bryce/Guild issue once available.
- Shareable update: "I drafted the orchestration-style agent too: issue in, workflow contract and coding-agent handoff out. This is the Symphony/Guild control-plane wedge."

## 2026-04-29 - RCA Fallback Spec

- Agent: Not created yet.
- Goal: Make RCA work unblockable without customer access.
- Sample input: `docs/sample-cloudwatch-alert.json`
- Observed output: `docs/rca-cloudwatch-mvp.md` defines the alert schema, log query templates, output shape, and handoff prompt.
- What works: Bryce can review the RCA shape before real CloudWatch access exists.
- Missing data or access: Real alert payload, log group names, deployment source, and customer expectations.
- Next ask: Ask Bryce whether the customer alert shape is CloudWatch alarm, EventBridge event, New Relic incident, or another payload.
- Shareable update: "For RCA, I prepared a mocked CloudWatch path so we are not blocked on customer access. First version should surface evidence and hypotheses, not claim root cause."
