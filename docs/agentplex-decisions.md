# Agentplex: Architecture Decisions & Open Questions

This document explains every major technical choice in the agentplex plan, alternatives considered, and why each piece exists (or might not be needed).

---

## 1. Database: Why Supabase? What Are the Alternatives?

### What We Need a Database For

agentplex stores:
- **Sources** — which APIs are connected (name, namespace, spec URL, parsed spec hash)
- **Tools** — extracted tool definitions per source (name, description, input schema, path)
- **Credentials** — encrypted API keys/tokens per user per source
- **Users** — who owns what (auth + identity)

### Option A: Supabase (Postgres + Auth + Vault)

**Pros:**
- Free tier is generous (500MB DB, unlimited API requests)
- Built-in auth (email, OAuth providers, magic link) — no need to build login
- Built-in Vault (pgsodium encryption) — secrets encrypted at DB level, not application level
- Row Level Security — DB enforces "users can only see their own stuff" without app code
- Hosted Postgres means full SQL power (tsvector search, JSONB, triggers)
- Real-time subscriptions if we ever want live UI updates
- You already have Supabase MCP servers configured in your workspace

**Cons:**
- Another hosted dependency
- Cold starts on free tier (not relevant for CF Workers — they talk to it via HTTP anyway)
- Vendor lock-in on auth/vault specifics

### Option B: Turso (libSQL / SQLite at the edge)

**Pros:**
- SQLite-compatible, edge-native (replicas close to CF Workers)
- Very fast reads, no cold start
- Embedded mode for local dev (just a file)
- Free tier: 9GB storage, 500M reads/month

**Cons:**
- No built-in auth — you'd need to add Clerk, Lucia, or roll your own
- No built-in vault — you'd encrypt secrets yourself (application-level AES)
- Less full-featured than Postgres for complex queries

### Option C: Cloudflare D1 (SQLite on CF)

**Pros:**
- Lives in the same network as your Workers (zero-latency reads)
- Free tier: 5GB, 25M reads/day
- Perfect if everything is on CF

**Cons:**
- No built-in auth
- No vault
- Limited SQL (no full-text search, no JSONB)
- Locked to Cloudflare ecosystem

### Option D: No cloud DB at all (local-first with config files)

**Pros:**
- Simplest possible MVP
- `agentplex.json` in your project = source of truth
- No account needed, no hosted service, works offline
- Like how `.env` files work — just a local config

**Cons:**
- No sharing between machines
- No web UI (or web UI becomes local-only on localhost)
- Credentials stored in plaintext or need local encryption
- Cannot host MCP servers in the cloud (no user lookup)

### Option E: Convex

**Pros:**
- TypeScript-first: your backend IS TypeScript functions (queries, mutations, actions) — no SQL
- Real-time reactive by default — when data changes, connected clients update automatically
- ACID transactions with serializable isolation (stronger than Supabase's default)
- Built-in auth (via Clerk or their own provider)
- Built-in file storage
- Scheduled functions / cron jobs built in
- Very fast developer experience — define schema in TS, get typed client automatically
- Free tier: 1M function calls/month, 0.5GB storage
- Perfect for real-time collaborative features (if we ever want live catalog updates)

**Cons:**
- **No built-in vault/encryption** — we'd need to handle credential encryption ourselves (application-level AES or a separate secrets service)
- **Vendor lock-in** — data lives in Convex's proprietary runtime, not standard Postgres. Cannot self-host. Cannot export to another DB easily.
- **No SQL** — no tsvector full-text search, no pg_trgm, no PostGIS, no Postgres extensions. Search would need to be built in application code or use Convex's built-in text search (which exists but is simpler than Postgres)
- **CF Workers integration** — our MCP Worker on Cloudflare would call Convex via HTTP actions, which adds a network hop vs Supabase's direct Postgres connection from Workers
- **Document model** — our data (sources, tools, credentials) is actually quite relational (tools belong to sources, credentials bind to sources + users). Relational DB is a more natural fit.

**Verdict:** Convex is excellent for real-time apps with complex client state (chat apps, collaborative editors, dashboards). But agentplex's hot path is **server-to-server** (CF Worker fetches credentials, calls external API). We don't need reactive client updates on the critical path. The lack of built-in vault is the bigger issue — credential security is core to our product and Supabase Vault handles it at the DB layer.

### Option F: FumaDB (what Executor uses)

FumaDB is Executor's custom embedded database layer. It wraps SQLite with:
- Schema-as-code (similar to Drizzle)
- Scoped table policies (row-level access control in application code)
- In-memory adapter for testing

**Would we need it?** No. FumaDB was built because Executor needed an embedded DB that works in Bun, Node, and CF Workers with a unified API. We don't have that constraint. We have Supabase (or Turso/D1) as a hosted service. Using FumaDB would mean adopting Executor's code and Effect-TS dependency, which is exactly what we said to avoid.

### Recommendation

**Supabase is the strongest fit** for three reasons:

1. **Credential security is core to the product.** Supabase Vault (pgsodium) encrypts secrets at the database layer. With Convex, Turso, or D1, we'd need to build application-level encryption ourselves — more code, more risk of getting it wrong.

2. **The hot path is server-to-server, not real-time client.** Our critical flow is: CF Worker receives MCP request -> fetches credential from DB -> calls external API. This is a simple read query, not a reactive subscription. Convex's real-time superpower doesn't help here.

3. **Auth is included.** Supabase Auth handles signup/login/OAuth out of the box. Convex needs Clerk (another service). Turso/D1 need you to build auth from scratch.

**Convex would be the pick if** we were building a collaborative, real-time-heavy product (like a multiplayer tool catalog editor). We're not — we're building an API gateway with a management UI.

If we later want the CLI to work fully offline (no cloud), we can add a "local mode" that uses a SQLite file + no auth + env-var secrets. But the hosted product needs a real DB.

---

## 2. OpenAPI Spec Fetching: Do We Need Firecrawl?

### The Problem

When a user pastes a URL like `https://api.github.com/openapi.json`, we need to:
1. Fetch the spec
2. Parse it (JSON or YAML)
3. Resolve `$ref` references (specs often split across files)
4. Extract operations into tool definitions

### When a Simple `fetch()` Is Enough

Most OpenAPI specs are served as static JSON/YAML files at a known URL:
- `https://petstore3.swagger.io/api/v3/openapi.json`
- `https://raw.githubusercontent.com/github/rest-api-description/main/descriptions/api.github.com/api.github.com.json`

A simple `fetch(url)` + JSON parse works for 90% of cases.

### When We Might Need More

Some specs are:
- Behind authentication (need headers)
- Rendered as HTML docs (Swagger UI pages, not raw JSON)
- Split across multiple files with relative `$ref`s
- Only discoverable by crawling a docs site

### Do We Need Firecrawl?

**Not for MVP.** Firecrawl is for crawling web pages and extracting content. OpenAPI specs are structured data files — they don't need HTML parsing or JS rendering.

What we DO need:
- A robust `fetch` with timeout, retry, and redirect following
- YAML parsing (many specs are YAML not JSON)
- `$ref` resolution (the `@apidevtools/swagger-parser` or `@readme/openapi-parser` libraries handle this)
- Optionally: detect if a URL is a Swagger UI page and extract the actual spec URL from it

**Later** (post-MVP), we could use Firecrawl to:
- Crawl documentation sites and discover OpenAPI spec URLs automatically
- Extract API information from unstructured docs (for APIs without OpenAPI specs)

### Recommendation

Use `@readme/openapi-parser` or `swagger-parser` for spec fetching + validation + $ref resolution. These are battle-tested libraries specifically for this purpose. No Firecrawl needed at MVP stage.

---

## 3. CLI: Why Do We Need It? What's It For?

### The Core Question

If we have a web UI, why do we need a CLI at all?

### Reason 1: Local MCP Server (the killer feature)

The CLI's `serve` command starts a **local stdio MCP server**. This is how agents actually connect:

```json
{
  "mcpServers": {
    "agentplex": {
      "command": "npx",
      "args": ["agentplex", "serve"]
    }
  }
}
```

Without the CLI, agents can only connect to the **cloud MCP endpoint** (the CF Worker). With the CLI, they can also run against a **local server** — useful for:
- Offline development
- Testing before deploying
- Faster response times (no network hop)
- Working with local-only credentials

### Reason 2: Developer Workflow

Developers managing their tool catalog want terminal commands:
- `agentplex add ./my-api-spec.yaml` — add a local spec file
- `agentplex search "send email"` — quick lookup without opening browser
- `agentplex test slack.messages.send '{"channel":"#general","text":"hi"}'` — test a tool call

### Reason 3: CI/CD Integration

In pipelines, you might want to:
- Validate that all tool definitions still match their specs
- Run integration tests against your MCP server
- Push config changes as part of a deploy

### Do We Need It for MVP?

**Minimum viable CLI**: just the `serve` command. That's the one thing the web UI cannot replace — being a local MCP stdio server that Cursor/Claude connects to.

Everything else (add, search, test, push) is nice-to-have that the web UI covers initially.

### Publishing: Private or Public?

**Start private.** The CLI should:
- Not be published to npm until we're confident in the API surface
- Work via `npx agentplex` from the monorepo during development
- Use `npm link` or direct path for local testing

When ready to publish:
- Use npm `--access restricted` first (private package, requires npm org)
- Or just don't publish until the web app is live and stable
- Then flip to `--access public` when ready for users

### Recommendation

Build the CLI but don't publish it. The `serve` command is essential (it's how agents connect locally). Everything else can wait. Keep the package private until the product is ready.

---

## 4. Preset Sources: What to Ship With

### Original Plan (Too Ambitious)

The plan listed 7 preset sources: GitHub, Linear, Slack, Stripe, Supabase, OpenAI, Cloudflare.

### Revised Minimum

For MVP, we only need presets that:
- We actively use and can test
- Have clean, well-documented OpenAPI specs
- Are relevant to the Guild pitch (developer tools for AI agents)

**Ship with:**
- **GitHub API** — the obvious first. Everyone has a GitHub token. REST API has excellent OpenAPI spec.
- **Linear API** — relevant to Guild's issue triage story. Clean GraphQL (we'd add GraphQL support later) but they also have REST endpoints.

**Add later based on demand:**
- Slack, Stripe, Cloudflare, Supabase, OpenAI, etc.
- These are just OpenAPI specs — adding them is trivial once the generator works

### Recommendation

Start with GitHub only as the reference integration. Prove the full flow end-to-end with one solid example. Then adding more is just "paste another OpenAPI URL."

---

## 5. Hosted MCP Servers: What Does "Hosting" Mean?

### The Mental Model

When a user adds a source (e.g., GitHub API), agentplex doesn't spin up a separate server per source. Instead:

1. **One Cloudflare Worker** handles ALL tool calls for ALL users
2. The Worker receives an MCP request like `call_tool({ path: "github.issues.create", args: {...} })`
3. It looks up the tool definition (from DB), the user's credential (from Vault), and makes the HTTP call
4. Returns the result

So "hosting an MCP server" just means: **one Worker + one DB**. There's no per-source infrastructure to manage.

### The Worker's Job

```
Incoming MCP request
  → Authenticate user (JWT in auth header)
  → Route to correct tool definition (from DB)
  → Fetch user's credential for that source (from Vault)
  → Build HTTP request (URL + method + headers + body from tool definition)
  → Make the request to the external API
  → Format response as MCP tool result
  → Return
```

### Cost at Scale

- CF Workers free tier: 100,000 requests/day
- Each tool call = 1 Worker invocation + 1-2 Supabase queries + 1 external API call
- Plenty for MVP and early users

---

## 6. The Relationship Between Web UI, CLI, and MCP Workers

### Three Interfaces, One Backend

```
Web UI (browser)     → Next.js API routes → Supabase (manage sources, credentials, view catalog)
CLI (terminal)       → Same Supabase client → Same data (add sources, search, manage)
CLI serve (stdio)    → Local MCP server → Reads config locally OR from Supabase → Calls external APIs
MCP Worker (cloud)   → CF Worker → Reads from Supabase → Calls external APIs
```

### Which Agents Connect Where?

| Agent Location | Connects To | Auth Method |
|---------------|-------------|-------------|
| Local (Cursor on your machine) | CLI `serve` (stdio) | None needed (local) |
| Local (Cursor on your machine) | CF Worker (HTTP) | API key in MCP config |
| Cloud (Guild agent, remote) | CF Worker (HTTP) | API key in MCP config |

### The User Journey

1. User signs up on agentplex.sh (web UI)
2. Adds GitHub API as a source (paste spec URL)
3. Sets their GitHub token in the credentials page
4. Gets an MCP endpoint URL + API key
5. Pastes the MCP config into Cursor settings
6. Cursor now has access to all their GitHub tools via the CF Worker

Alternatively (local-first):
1. User runs `npx agentplex init` in a project
2. Runs `npx agentplex add https://...github-openapi.json --name github`
3. Sets `GITHUB_TOKEN` in their env or agentplex config
4. Runs Cursor with the `agentplex serve` MCP config
5. Everything works locally, no cloud needed

---

## 7. Summary: What We Actually Need to Build

### Absolutely Required (MVP)

| Component | Why |
|-----------|-----|
| OpenAPI parser (packages/core) | The core value — spec to tools |
| Supabase schema (packages/db) | Store sources, tools, credentials |
| Web UI with auth (apps/web) | Users need to manage their stuff |
| CF Worker MCP server (packages/mcp-runtime) | Agents need to connect |
| CLI `serve` command (apps/cli) | Local MCP server for dev use |

### Nice to Have (Phase 2+)

| Component | Why |
|-----------|-----|
| Full CLI commands (add, search, test, push) | Developer productivity |
| Preset sources beyond GitHub | Onboarding speed |
| Firecrawl-based spec discovery | Handle edge cases |
| GraphQL source support | Expand beyond OpenAPI |
| Multi-user/workspace scoping | Team features |
| Public npm package | Distribution |

### Not Needed

| Component | Why Not |
|-----------|---------|
| FumaDB | Supabase covers our DB needs; FumaDB brings Effect-TS baggage |
| QuickJS sandbox | We're not running untrusted code; just making HTTP requests |
| Firecrawl (for MVP) | OpenAPI specs are structured files, not web pages |
| Multiple presets day 1 | GitHub alone proves the full flow |
| Public CLI immediately | Keep private until stable |

---

## 8. Open Questions (Need Your Input)

1. **Supabase vs Turso**: Are you comfortable with Supabase, or do you prefer something lighter? (Supabase gives us the most for free — auth + vault + RLS)

2. **Repo visibility**: Public from day 1 (open source, like Executor), or private until ready?

3. **GitHub org**: Under `moccalabs` org, or a new `agentplex` org?

4. **Local-only mode**: Should the CLI work entirely without a cloud account (local config file + env vars for secrets), or always require agentplex.sh login?

5. **MCP transport**: The CF Worker needs to speak MCP over HTTP. The two options are:
   - Streamable HTTP (new MCP spec, what Executor uses)
   - SSE (older, more widely supported by current clients)
   
   Most current MCP clients support stdio (CLI) and SSE. Streamable HTTP is newer but better. We could support both.
