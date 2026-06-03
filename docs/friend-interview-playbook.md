# Friend Interview Playbook
## Topic: Agent Infrastructure — Executor, Guild, agentplex

**Goal**: Pick your friend's brain as a power user on the real friction points with agents/tools/MCPs today, validate or invalidate your product thesis, and explore if there's a collaboration angle.

**Duration**: 45-60 min
**Format**: Casual but structured. You drive with questions, let them riff.

---

## Part 1: Warm-up — Their Current Agent Setup (10 min)

Start broad. Understand their world before introducing your ideas.

1. **"Walk me through your current agent setup — what do you use day-to-day?"**
   - Cursor? Claude Code? Other?
   - How many MCP servers do they have configured?
   - Do they use any custom tools/MCPs they built?

2. **"When was the last time you got frustrated setting up or managing an MCP connection?"**
   - What was the API? What went wrong?
   - Did they give up or push through?

3. **"Do you use agents for anything outside of coding? Business tasks, research, outreach?"**
   - If yes: what tools? How reliable?
   - If no: why not? What's stopping them?

---

## Part 2: Problem Validation (15 min)

Present pain points. See which ones resonate.

4. **"Here's what I keep running into — tell me if any of these hit home:"**
   - Managing 5+ MCP servers, enabling/disabling per project
   - Being afraid an agent will call a destructive API (DELETE, transfer money)
   - Credentials scattered across .env files, no central management
   - Wanting to give an agent access to an API but the MCP doesn't exist yet
   - Wanting to use agents for non-code tasks but they lack good API connections

   **Which of these is your #1 pain?**

5. **"Have you seen Executor by Rhys Sullivan?"**
   - If yes: what do they think? Using it?
   - If no: explain briefly — "sandboxed runtime for tool calls with policy gates"
   - **"Would you use something like that? What's missing?"**

6. **"What about the approval/confirmation thing — do you want agents to ask before destructive actions, or does that break the flow?"**
   - Do they want fully autonomous agents or supervised ones?
   - Where's their trust boundary?

---

## Part 3: Introduce Your Thesis (15 min)

Now share what you're building. Frame it as early/exploratory.

7. **"I've been building something called agentplex. The pitch is:"**
   > "Paste an OpenAPI spec, get MCP tools instantly. Credentials managed centrally. Policies per tool (GET is auto-approved, DELETE needs confirmation). Any agent connects via one MCP endpoint."

   **"Does that solve a real problem for you, or is it a nice-to-have?"**

8. **"The angle I'm exploring for Guild.ai ($300M agent platform company) is:"**
   > "This becomes their MCP Connection Catalog — the layer that gives all agents controlled access to external APIs with RBAC and observability."

   **"If you were their eng lead, would you buy this or build it yourself?"**

9. **"For my own SaaS (avrae.ai — AI search tracking), I want to pivot from just tracking to acting:"**
   > "Agents that do GEO/marketing work, connected to CMS + SEO tools via agentplex, with deterministic boundaries so they don't go rogue."

   **"Does 'deterministic agents with constrained tool access' resonate as a product?"**

---

## Part 4: Competitive Landscape (10 min)

10. **"Here's what's out there — where's the opportunity?"**
    - **Executor** (Rhys Sullivan) — sandbox + policies, code-first, open source
    - **Composio** — managed integrations (200+ apps), SaaS pricing
    - **OpenClaw** (270k GitHub stars) — personal AI assistant in messaging apps
    - **Hermes Agent** (121k stars) — self-improving agent with memory
    - **Symphony** (OpenAI) — orchestrate Codex agents from issue trackers
    - **Warden** (Sentry) — skills as markdown, compose into review agents
    - **Guild.ai** — control plane for agents (orchestration, governance)

    **"Where's the gap? What would YOU pay for?"**

11. **"Is 'MCP-as-a-service with guardrails' a standalone SaaS? Or does it only make sense inside something else?"**

---

## Part 5: Collaboration / Close (5-10 min)

12. **"I'm trying to figure out if this is:"**
    - A Guild contribution (retainer revenue, their infra)
    - A standalone SaaS (compete with Executor/Composio)
    - An open-source project that builds reputation
    - Infrastructure for my own products (avrae)

    **"If you were me, which path? Interested in working on any of this together?"**

13. **"What would you need to see to actually use agentplex yourself this week?"**
    - This is the most important question. Their answer = your MVP feature priority.

14. **"Anything I'm completely missing? Blind spots?"**

---

## Key Things to Listen For

- **Pain intensity** — do they describe frustration, or "it's fine"?
- **Willingness to pay** — would they pay $X/month, or expect it free/open-source?
- **Trust boundary** — fully autonomous vs supervised agents?
- **Build vs buy** — would they build their own MCP per API, or want a catalog?
- **Non-code use cases** — if only coding, agentplex has less surface area
- **Executor awareness** — if they know it, your differentiation must be crisp

---

## After the Call — Capture

Write down:
1. Their #1 pain point (verbatim quote if possible)
2. Did agentplex resonate? Which part?
3. Would they use it / pay for it?
4. Any blind spots or ideas they raised
5. Collaboration interest level (1-5)
6. Specific features they'd need to try it
