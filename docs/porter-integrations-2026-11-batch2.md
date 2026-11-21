# Porter integration batch 2: November 2026

35 more integrations published as public integrations on the Guild Integration Hub under `dkountanis`. All of them sign in with an API key, so none needed an OAuth app or a dashboard sign-in to build. Each one was checked after publishing: it has a published version, it is public, and its base URL is the production host.

Connect one with your own key (the command prompts for it):

```bash
guild integration connect dkountanis~<integration> --owner <account>
```

## Auth, agents and AI infrastructure

| Integration | Ops | Base URL | Header | Key |
|---|---|---|---|---|
| `workos` | 274 | `https://api.workos.com` | `Authorization: Bearer {token}` | WorkOS secret key |
| `stytch` | 184 | `https://api.stytch.com` | `Authorization: Basic {token}` | base64 of `project_id:secret` |
| `clerk` | 267 | `https://api.clerk.com/v1` | `Authorization: Bearer {token}` | Clerk secret key (`sk_…`) |
| `hyperbrowser` | 115 | `https://api.hyperbrowser.ai` | `x-api-key: {token}` | Hyperbrowser API key |
| `daytona` | 175 | `https://app.daytona.io/api` | `Authorization: Bearer {token}` | Daytona API key |
| `runpod` | 35 | `https://rest.runpod.io/v1` | `Authorization: Bearer {token}` | RunPod API key |
| `reducto` | 20 | `https://platform.reducto.ai` | `Authorization: Bearer {token}` | Reducto API key |
| `promptlayer` | 143 | `https://api.promptlayer.com` | `X-API-Key: {token}` | PromptLayer API key |
| `brightdata` | 49 | `https://api.brightdata.com` | `Authorization: Bearer {token}` | Bright Data API token |
| `chroma` | 31 | `https://api.trychroma.com` | `x-chroma-token: {token}` | Chroma Cloud API key |
| `xata` | 79 | `https://api.xata.tech` | `Authorization: Bearer {token}` | Xata API key |
| `convex` | 49 | `https://api.convex.dev/v1` | `Authorization: Bearer {token}` | Convex team or deploy token |

## Voice, messaging and notifications

| Integration | Ops | Base URL | Header | Key |
|---|---|---|---|---|
| `vapi` | 145 | `https://api.vapi.ai` | `Authorization: Bearer {token}` | Vapi private key |
| `telnyx` | 359 | `https://api.telnyx.com/v2` | `Authorization: Bearer {token}` | Telnyx API key |
| `daily` | 73 | `https://api.daily.co/v1` | `Authorization: Bearer {token}` | Daily API key |
| `knock` | 118 | `https://api.knock.app` | `Authorization: Bearer {token}` | Knock secret key |
| `novu` | 135 | `https://api.novu.co` | `Authorization: ApiKey {token}` | Novu API key |
| `ably-control` | 22 | `https://control.ably.net/v1` | `Authorization: Bearer {token}` | Ably Control API token |

## Cloud, docs and media

| Integration | Ops | Base URL | Header | Key |
|---|---|---|---|---|
| `hetzner` | 144 | `https://api.hetzner.cloud/v1` | `Authorization: Bearer {token}` | Hetzner Cloud API token |
| `linode` | 348 | `https://api.linode.com/v4` | `Authorization: Bearer {token}` | Linode (Akamai) personal access token |
| `gitbook` | 410 | `https://api.gitbook.com/v1` | `Authorization: Bearer {token}` | GitBook API token |
| `readme` | 31 | `https://dash.readme.com/api/v1` | `Authorization: Basic {token}` | base64 of `<api key>:` |
| `vimeo` | 116 | `https://api.vimeo.com` | `Authorization: Bearer {token}` | Vimeo access token |
| `pinterest` | 324 | `https://api.pinterest.com/v5` | `Authorization: Bearer {token}` | Pinterest access token |

## Commerce, finance and data

| Integration | Ops | Base URL | Header | Key |
|---|---|---|---|---|
| `square` | 200 | `https://connect.squareup.com` | `Authorization: Bearer {token}` | Square production access token |
| `lago` | 224 | `https://api.getlago.com/api/v1` | `Authorization: Bearer {token}` | Lago API key |
| `twelvedata` | 187 | `https://api.twelvedata.com` | `Authorization: apikey {token}` | Twelve Data API key |
| `polygon` | 10 | `https://api.massive.com` | `Authorization: Bearer {token}` | Polygon (now Massive) API key |
| `ipinfo` | — | `https://api.ipinfo.io` | `Authorization: Bearer {token}` | IPinfo token |
| `yelp` | 1 (GraphQL) | `https://api.yelp.com` | `Authorization: Bearer {token}` | Yelp Fusion API key |

## Upstash

| Integration | Ops | Base URL | Header | Key |
|---|---|---|---|---|
| `upstash` | 62 | `https://api.upstash.com/v2` | `Authorization: Basic {token}` | base64 of `email:apikey` (Developer API) |
| `upstash-qstash` | 43 | `https://qstash.upstash.io` | `Authorization: Bearer {token}` | QStash token |
| `upstash-workflow-api` | 31 | `https://qstash.upstash.io` | `Authorization: Bearer {token}` | QStash token |
| `upstash-redis` | 27 | `https://{database}.upstash.io` | `Authorization: Bearer {token}` | REST token; enter the database host when connecting |
| `upstash-vector` | 18 | `https://{index}.upstash.io` | `Authorization: Bearer {token}` | Index token; enter the index host when connecting |

Upstash publishes spec fragments only for the Developer, QStash and Workflow APIs. The specs for `upstash-redis` and `upstash-vector` were written by hand from Upstash's docs and have not been tested against a live database or index. The earlier `upstash-workflow` integration is QStash on the EU host.

## Fixes made during the build

- **WorkOS:** 22 operationIds contained characters TypeScript can't use (for example `…_list[0]`). Renamed them, and published 1.0.1.
- **Hyperbrowser:**
  - 43 clashing `*Params` schemas were renamed to `*ParamsInput`.
  - The header was changed to `x-api-key`.
- **Vapi:**
  - An enum value contained quote marks, which broke the generated code.
  - 45 oversized sub-schemas were loosened to plain objects so they compile.
- **Telnyx:** enum values with literal quote marks were cleaned up.
- **Knock:** 8 duplicate operationIds ending in ` (2)` were renamed.
- **Convex:**
  - Added missing path-parameter schemas.
  - Removed spaces from the names of its auth schemes.
- **Linode:** 5 `$ref`s pointing at missing schemas were replaced with inline schemas.
- **Headers corrected to match each vendor's docs:**
  - Novu: `ApiKey`
  - Twelve Data: `apikey`
  - ReadMe: Basic
