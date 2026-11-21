# Porter integration batch: November 2026

20 integrations chosen for an agent platform, built with [Porter](https://porter-guild.vercel.app) and published as public integrations on the Guild Integration Hub under `dkountanis`. All 20 sign in with an API key, so each one built and published without an OAuth app, a dashboard sign-in, or a connected credential.

## How they were chosen

- Not already in Guild: there is no official `guildai` or `guildlabs` integration, and no earlier one on this account.
- Useful to agents: model and media APIs, web data, LLM observability and evals, infrastructure, email, and business systems.
- Buildable today: a REST or GraphQL API with a published spec that signs in with an API key. MCP servers and OAuth APIs were left out, because Guild can't read an unpublished OAuth MCP server's tools (see "Blocked" below).

## Published integrations

### AI and agent infrastructure

| Integration | Ops | Base URL | Credential header | Key to connect |
|---|---|---|---|---|
| `dkountanis~perplexity` | 48 | `https://api.perplexity.ai` | `Authorization: Bearer {token}` | Perplexity API key (`pplx-…`) |
| `dkountanis~replicate` | 34 | `https://api.replicate.com/v1` | `Authorization: Bearer {token}` | Replicate API token |
| `dkountanis~elevenlabs` | 16 | `https://api.elevenlabs.io` | `xi-api-key: {token}` | ElevenLabs API key |
| `dkountanis~assemblyai` | 9 | `https://api.assemblyai.com` | `Authorization: {token}` | AssemblyAI API key (no `Bearer` prefix) |
| `dkountanis~jina` | 32 | `https://api.jina.ai` | `Authorization: Bearer {token}` | Jina API key (`jina_…`) |
| `dkountanis~apify` | 231 | `https://api.apify.com` | `Authorization: Bearer {token}` | Apify API token |
| `dkountanis~fal` | 4 | `https://queue.fal.run` | `Authorization: Key {token}` | fal key (`FAL_KEY`) |
| `dkountanis~langfuse` | 121 | `https://cloud.langfuse.com` | `Authorization: Basic {token}` | base64 of `pk-lf-…:sk-lf-…` |
| `dkountanis~braintrust` | 156 | `https://api.braintrust.dev` | `Authorization: Bearer {token}` | Braintrust API key |
| `dkountanis~upstash-workflow` | 43 | `https://qstash-eu-central-1.upstash.io` | `Authorization: Bearer {token}` | QStash token (EU region) |

### Developer, data and business

| Integration | Ops | Base URL | Credential header | Key to connect |
|---|---|---|---|---|
| `dkountanis~digitalocean` | 290 | `https://api.digitalocean.com` | `Authorization: Bearer {token}` | DigitalOcean personal access token |
| `dkountanis~neon` | 194 | `https://console.neon.tech/api/v2` | `Authorization: Bearer {token}` | Neon API key |
| `dkountanis~honeycomb` | 82 | `https://api.honeycomb.io` | `X-Honeycomb-Team: {token}` | Honeycomb configuration key |
| `dkountanis~buildkite-graphql` | 1 | `https://graphql.buildkite.com/v1` | `Authorization: Bearer {token}` | Buildkite API token with GraphQL scope |
| `dkountanis~resend` | 144 | `https://api.resend.com` | `Authorization: Bearer {token}` | Resend API key (`re_…`) |
| `dkountanis~postmark` | 43 | `https://api.postmarkapp.com` | `X-Postmark-Server-Token: {token}` | Postmark server token |
| `dkountanis~customer-io-app` | 219 | `https://api.customer.io` | `Authorization: Bearer {token}` | Customer.io App API key (`sk_…`) |
| `dkountanis~loops` | 82 | `https://app.loops.so/api` | `Authorization: Bearer {token}` | Loops API key |
| `dkountanis~deel-api` | 43 | `https://api.letsdeel.com/rest/v2` | `Authorization: Bearer {token}` | Deel API token |
| `dkountanis~paddle-billing` | 126 | `https://api.paddle.com` | `Authorization: Bearer {token}` | Paddle live API key |

Connect any of them with your own key from a terminal. The command prompts for the key, so it never goes on the command line or into chat:

```bash
guild integration connect dkountanis~<integration> --owner <account>
```

## Fixes made during the build

- **Perplexity**: the generated TypeScript declared two schemas with the same name (TS2308). Renamed `OrchestratorChatResponseFormatJsonSchemaSchema` to `…Definition` and published 1.0.1 from a fresh draft.
- **AssemblyAI**:
  - Moved a `required` list that had been placed inside `properties`.
  - Changed `oneOf: [X, {type: null}]` to `anyOf`, because Guild treats a default value that matches both branches as an error.
  - Changed `type: bool` to `boolean`.
- **Jina**: added missing path-parameter schemas, and renamed 115 schema keys containing `@0x..`, which Guild rejects.
- **Fal**: changed the header to `Authorization: Key {token}`, which is what fal expects.
- **Honeycomb**: changed the header to `X-Honeycomb-Team`, which 79 of its 82 operations (the `/1/...` endpoints) expect. The 3 `/2/...` management endpoints need a management key sent as Bearer, so they don't work with this header.
- **Deel**: the first build pointed at `/rest` instead of `/rest/v2`. Rebuilt as `deel-api` and archived `deel`.
- **Customer.io**: 222 of 237 operations belong to the App API, but the first build used the Track host. Rebuilt as `customer-io-app` on `api.customer.io` with `/v1/*` only (219 operations).
- **Paddle**: the first build pointed at `sandbox-api.paddle.com`. Rebuilt as `paddle-billing` on `api.paddle.com`.

## Archived during this batch

- `render`: Porter's Render spec only covers Render's discovery endpoints, not `api.render.com/v1`.
- `contentful-graphql`: the `{space_id}` placeholder was stored URL-encoded, so a space ID can never be filled in.
- `bamboohr`: each customer has their own subdomain, and Guild rejected the spec.
- `deel`: wrong base URL, replaced by `deel-api`.
- `customer-io`: wrong host, replaced by `customer-io-app`.
- `paddle`: sandbox host, replaced by `paddle-billing`.
- `mailchimp`: Porter picked the Transactional (Mandrill) API, which passes its key in the request body.

## Blocked: OAuth MCP servers

Guild only lets you connect an OAuth credential from the dashboard, and only for an integration that has a published version. An MCP draft has 0 tools until a credential is connected, and a version with 0 tools fails to build (TS2306 on `src/ep/index.ts`). So these can't get started until Guild allows connecting a credential to a draft:

Zapier, Dropbox, QuickBooks, Clay, Capacities, Carta, Circleback, Clarify, Evernote, Gamma, Grain, Happenstance, Harmonic, Klaviyo, Krisp, Lightfield, Mercury, Metaview, Otter, Statsig, plus the existing drafts for Miro, Mixpanel, Mailchimp, Ahrefs and Atlassian.

Also built this session as private drafts, not yet published: `netlify` (118 operations), `zapier-workflow-api` (26) and `tally-mcp` (needs a key).

## Notes on regions

`langfuse` uses the EU cloud (`cloud.langfuse.com`), and `upstash-workflow` uses the EU QStash region. US accounts need separate integrations pointing at the US hosts, because a published URL is fixed.

## Next: Azure

Azure DevOps is already official (`guildai~azure-devops`). Porter can build Azure Resource Manager integrations when given the Entra sign-in URLs (`--install-url` and `--token-url` for `login.microsoftonline.com/organizations`). They can reuse the Entra app the Microsoft 365 integrations use (`c6835af6-…`) once the app has the delegated **Azure Service Management → user_impersonation** permission. Candidates:

- Resource Graph (4 operations)
- Resources (44)
- Cost Management (13)
- Advisor (9)
- Monitor activity-log alerts (6)
- Log Analytics (4)
- App Service web apps (357, import a subset)
- Microsoft Graph for Entra: Users, Groups, Applications, Directory, Security
