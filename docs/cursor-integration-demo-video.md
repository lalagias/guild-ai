# Cursor Cloud Agents Integration — Demo Video Pack

A self-contained brief for the 4-minute developer-track demo video. This is the
"how we wired Cursor into Guild" cut, not the exec multi-runtime pitch in
`uploads/files/video_demo_script.md`. Both can coexist; this one is the build
walkthrough.

The thesis the video has to land:

> Guild is the control plane. We plug in any coding-agent harness — Cursor's
> today — and immediately get credential vaulting, observability, and a single
> agent surface for users. Cursor SDK is one runtime under that plane. Codex
> App Server, Claude Code, and anything else with a REST API plug in the same
> way through Guild's Integration Hub.

---

## 1. Strategic frame (read before recording)

- **Hero = Guild's Integration Hub + the `cursor-cloud-coder` agent**. Not
  Cursor SDK on its own. Cursor is the runtime we're plugging in; Guild is the
  layer that makes it usable in production.
- **Cursor SDK is named, not avoided**. The cookbook and the standalone scripts
  prove the runtime works. Then we move up the stack to Guild.
- **Path A (direct `@cursor/sdk` import inside a Guild agent) gets one line**.
  Guild's runtime sandbox does not accept arbitrary npm packages — that's by
  design and that's why the Integration Hub exists. No compiler-error tour.
- **Polling is not a mystery**. We did a basic 10-second poll with a fallback
  so a long run never strands the user. As Cursor ships webhooks and we wire
  SSE streaming, that becomes push-based.
- **Multi-runtime is implicit, not preached**. The same Integration Hub flow
  works for Codex App Server or Claude Code; we mention it once.
- Do **not** mention `pr-doc-impact`, `documenter`, or the abstract "task
  arrives in Linear, Guild picks it up..." flow. This is a build video.

Word count target: ~600 words at ~150 wpm = ~4 minutes.

---

## 2. The script

### Scene 1 — Cold open (0:00–0:25)

**On screen.** Cursor IDE on `agents/cursor-cloud-coder/agent.ts`, scrolled to
the tool wiring at lines 29–33. Quick wipe to a browser tab on
`app.guild.ai/integrations/dkountanis~cursor-cloud-agents`.

**Voiceover.**
"Cursor shipped their TypeScript SDK on April 29 — `@cursor/sdk`, public beta.
A great runtime: codebase indexing, semantic search, isolated cloud VMs,
auto-PR. The interesting question wasn't whether Cursor could write code. It
was: how do we put it under Guild's control plane so a team can actually use
it — with credentials in the vault, every run observable, governance on top,
and one agent surface the user calls. That's what this video walks through."

**Caption.** `cursor-cloud-coder` · live on Guild · v1.0.5

---

### Scene 2 — The cookbook, briefly (0:25–0:50)

**On screen.** `cookbook/sdk/quickstart/src/index.ts` zoomed to lines 1–8.
Quick cut to the file tree under `cookbook/sdk/` showing `quickstart`,
`coding-agent-cli`, `agent-kanban`, `app-builder`.

**Voiceover.**
"Cursor publishes a cookbook — quickstart, a coding-agent CLI, a kanban
example, an app builder. The SDK surface is small: `Agent.create`, `agent.send`,
`run.stream`. Two runtimes — local against your filesystem, cloud in a
dedicated VM that can clone a repo and open a PR. We want cloud, with
`autoCreatePR: true`. That's the runtime we're putting under Guild."

**Caption.** Source: `cookbook/sdk/` · runtime: cloud + `autoCreatePR`

---

### Scene 3 — Standalone proof, then up the stack (0:50–1:15)

**On screen.** `cursor-agents/pr-explainer/` and `cursor-agents/issue-triage/`
folders side by side. Run one of them, let a couple of streamed lines render.
Then close the terminal — that's the punchline; we're moving on.

**Voiceover.**
"Before touching Guild we built two standalone scripts that just use the SDK
directly — a PR explainer and an issue triage. Pure Node. They prove the
runtime works end to end. But standalone scripts aren't useful to a team. No
shared credentials, no audit trail, no place a user can invoke them. So we
move up the stack — into Guild."

**Caption.** Standalone scripts: runtime works · Now: bring it under Guild

---

### Scene 4 — Why Guild's Integration Hub (1:15–1:50)

**On screen.** Open `app.guild.ai > Integration Hub`, scroll the catalog of
existing first-party integrations (GitHub, Linear, Slack, Sentry, etc.) to
visually establish "this is a registry, not a one-off." Then click into
**Create Integration** to show the form fields: name, base URL, auth type.

**Voiceover.**
"Guild has a Custom Integrations system. Anything that speaks HTTP can be
wrapped as a versioned integration: name it, set a base URL, pick an auth
type, define endpoints, publish a version. Guild's runtime then proxies every
call from any agent through that integration — injecting credentials from
the vault, rate-limiting, logging every request. We tried importing the SDK
directly into a Guild agent and the runtime sandbox doesn't accept arbitrary
npm packages — that's exactly the case the Integration Hub is built for. Cursor
exposes a REST API at `api.cursor.com/v1` alongside the SDK. So we wrap the
REST API."

**Caption.** Guild Integration Hub · custom integration: HTTP in, agent tools out

---

### Scene 5 — Building the integration (1:50–2:35)

**On screen.** Stay in the Integration Hub. Show the version page for
`dkountanis~cursor-cloud-agents` v1.0.0. Click into the endpoint list:
`create_agent`, `get_run`, `get_agent`, `list_agents`, `cancel_run`,
`list_artifacts`, `list_models`. Click `create_agent`, expand its request body
schema, briefly highlight the `prompt`, `model`, `repos`, `autoCreatePR`
fields. Then jump to **Credentials** and show the masked `CURSOR_API_KEY` row.

**Voiceover.**
"Seven endpoints, mapped one-for-one onto Cursor's REST API. Each gets a
request and response schema — that's how Guild knows what fields to forward
through the proxy. The credential is `CURSOR_API_KEY`, vaulted in Guild and
sent as Basic Auth on outbound requests. The agent never sees it. The user
never sees it. Workspace admins manage it once, in one place. That credential
posture is the same regardless of which runtime is on the other end of the
proxy — Cursor today, anything else tomorrow."

**Caption.** 7 endpoints · `CURSOR_API_KEY` vaulted · agent never sees secrets

---

### Scene 6 — The Guild agent (2:35–3:15)

**On screen.** `agents/cursor-cloud-coder/agent.ts`. Highlight three regions
in sequence: the tool wiring (lines 29–33), the dispatch (lines 79–92), and
the poll loop (lines 111–129). Cursor on line 163 (the `pollingFailed`
fallback) for the close.

**Voiceover.**
"The Guild agent itself is small. It imports the integration's tools as
`CursorCloudAgentsTools` and picks `ui_notify` for live messages back to the
user. Parse a GitHub URL and a task out of the input. Call
`cursor_cloud_agents_create_agent` with prompt, model, repo, and
`autoCreatePR: true`. Notify the user with the dashboard link the moment the
cloud run is live. Then poll — every ten seconds, up to twenty minutes — and
notify again on terminal status. This is intentionally a basic poll with a
fallback for the early phase: if anything interrupts the loop, the agent
still returns the agent ID, run ID, and dashboard URL so the user is never
stranded. The cloud run keeps going regardless."

**Caption.** `agents/cursor-cloud-coder/agent.ts` · 178 lines · 3 calls into the integration

---

### Scene 7 — Control plane, and what's next (3:15–4:00)

**On screen.** Guild's agent dashboard for `dkountanis/cursor-cloud-coder`
showing a run history with `ui_notify` messages threading through. Then a
simple slide-style overlay (or a clean text card) listing:

- streaming runs to the user via SSE
- webhooks when Cursor ships them
- the same pattern → other coding-agent runtimes

**Voiceover.**
"This is what 'Guild as control plane' actually looks like. Every dispatch is
visible in Guild's run history. Every credential stays vaulted. Every
`ui_notify` is on the audit trail. From the user's seat there is one agent
they call — `cursor-cloud-coder` — and Guild handles the rest. Next up we
move polling onto Cursor's run stream so the user gets continuous progress
instead of waiting on ten-second ticks, and onto webhooks once Cursor ships
them so completion is push-based. And the same Integration Hub flow opens
the door to plug in Codex App Server, Claude Code, or any future coding-agent
API the same way. Guild stays the control plane. The runtimes underneath are
ours to choose."

**Caption.** Next: SSE streaming · webhooks · multi-runtime via the same hub

---

## 3. Pre-recording prep checklist

Run this list top-to-bottom the day of the recording. Anything that fails
becomes a blocker, fix before you hit record.

### 3.1 Agent code

- [ ] `agents/cursor-cloud-coder/agent.ts` is at v1.0.5 or higher and the
      published version matches what's on `app.guild.ai`.
- [ ] `npm run build` passes clean from `agents/cursor-cloud-coder/`.
- [ ] `guild auth status` shows `dkountanis` authenticated.
- [ ] `guild agent pull` from the agent directory is up to date.
- [ ] `description.md` is a one-paragraph summary that reads well if it
      flashes on screen — it currently does.

### 3.2 Guild Integration Hub

- [ ] `dkountanis~cursor-cloud-agents` integration exists with a published
      version (1.0.0+).
- [ ] All seven endpoints are present and have request body schemas:
      `create_agent`, `get_run`, `get_agent`, `list_agents`, `cancel_run`,
      `list_artifacts`, `list_models`.
- [ ] `create_agent`'s schema is the one in `docs/cursor-cloud-agents-api.md`
      (prompt, model, repos, autoCreatePR — at minimum).
- [ ] Auth type: API key, Basic with `CURSOR_API_KEY` as username, empty
      password.
- [ ] **Test page** for the integration: invoke `create_agent` once on a
      throwaway repo to confirm a 200 response. Cancel the run immediately to
      keep things tidy.
- [ ] Workspace credentials show `CURSOR_API_KEY` configured (masked is fine
      and is what the camera should see).

### 3.3 Test fixtures

- [ ] `agents/cursor-cloud-coder/test-input.json` is current — example task
      pointing at a public repo you control.
- [ ] Run `guild agent chat "<short task on a public repo>"` once, end to end,
      so you have a recent successful run visible in the Guild dashboard
      history. The dashboard with real run rows is your Scene 7 footage.

### 3.4 Recording environment

- [ ] Cursor IDE: clean workspace, only the `guild-ai` repo open. Close
      unrelated tabs and the chat panel.
- [ ] Browser: a fresh profile or window with two tabs only:
      `app.guild.ai/integrations/...` and `cursor.com/docs/cloud-agent/api/endpoints`.
      No bookmarks bar with personal links visible.
- [ ] OS notifications: do-not-disturb on. Slack quit. Email quit.
- [ ] Terminal: clear scrollback. Prompt is short and impersonal (no full
      home path). Run a successful build once to populate green output.
- [ ] Hide `.env.local` from any visible file tree or sidebar. Never open it
      on camera.
- [ ] If recording yourself on camera too, do it in 30–60s segments per scene
      so re-shoots are cheap.

### 3.5 Files and lines you will point at on screen

| Scene | File | Lines |
| --- | --- | --- |
| 1 | `agents/cursor-cloud-coder/agent.ts` | 29–33 (tool wiring) |
| 2 | `cookbook/sdk/quickstart/src/index.ts` | 1–8 |
| 3 | `cursor-agents/pr-explainer/`, `cursor-agents/issue-triage/` | folder view |
| 4 | (Guild Integration Hub UI) | catalog → Create Integration form |
| 5 | (Guild Integration Hub UI) | `dkountanis~cursor-cloud-agents` v1.0.0 endpoints |
| 6 | `agents/cursor-cloud-coder/agent.ts` | 79–92, 111–129, 163 |
| 7 | (Guild agent dashboard) | run history with `ui_notify` rows |

---

## 4. Production notes

- **Format**: 1080p, 30fps, mp4. Aim under 200 MB.
- **Audio**: single-take voiceover per scene, re-record on stumble. Match the
  word counts above; do not improvise the close — it's where the control
  plane line lives.
- **Tooling**: Loom for the all-in-one easy path; CleanShot X or OBS if you
  want separate tracks; Descript if you want to edit by text.
- **Cuts you can drop if you go long**: Scene 3 (standalone proof) compresses
  to one sentence; Scene 4 can lose the catalog scroll.
- **Cuts you can drop if you go short**: a 90-second internal-Slack version
  is just Scenes 4, 5, 6 — Integration Hub, build the integration, the agent.
  Skip the cookbook and the close.
- **Final sanity check** before sharing:
  1. Does Guild look like the headline (not Cursor)? Required.
  2. Does the credential vault land on screen at least once? Required.
  3. Is the multi-runtime line audible in the close? Required.
  4. Under 5 minutes? Required.

---

## 5. Talking-points cheat sheet

Drop-in lines if you stumble or want to swap phrasing on the fly.

- "Cursor SDK is the runtime. Guild is the control plane."
- "The Integration Hub is the seam. Anything HTTP becomes a Guild tool."
- "Credentials live in Guild's vault. The agent never sees them. The user
  never sees them."
- "Seven endpoints, one Guild agent, one credential — that's the surface."
- "We did a basic poll with a fallback for now. Streaming and webhooks are
  the next step."
- "The same Integration Hub flow plugs in Codex App Server or Claude Code.
  Guild stays the plane."
- "From the user's seat there's one agent. From the team's seat there's one
  credential, one audit trail, one place to govern."

---

## 6. Out of scope for this video

- The PR Doc Impact agent, the documenter agent, and the issue-to-workflow
  agent. Different deliverables, different videos.
- Linear/Sentry/PagerDuty triggers and the "task arrives, agent picks it up"
  flow — that belongs in the exec multi-runtime video, not this one.
- Cursor SDK internals beyond the cookbook. Link out, don't recap.
- Pricing, sign-ups, contact info.
