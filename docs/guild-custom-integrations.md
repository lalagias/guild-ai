# Guild Custom Integrations

Reference for building custom integrations that connect Guild agents to external services.

Source: https://docs.guild.ai (Integration Hub documentation)

## How It Works

A custom integration is a versioned package that tells the Guild runtime how to proxy HTTP requests to a service on behalf of agents.

```
Agent -> Guild runtime -> Integration proxy -> Service API
              |
     Handles auth, rate limiting,
     credential injection
```

The runtime injects credentials automatically. Agents never see raw API keys or tokens.

## Creating An Integration

1. **Create** in the Integration Hub UI: name, description, protocol (REST + base URL), authentication (API key or OAuth).
2. **Create a version** (semver). Versions are strictly increasing.
3. **Define endpoints**: operation name (becomes the tool name), HTTP method, path, description. Can define manually, from OpenAPI spec, or copy from a previous version.
4. **Build and publish**: Guild validates and assigns the version. Published versions are available to workspace agents.
5. **Test**: invoke endpoints interactively from the version's Test page.
6. **Webhooks (optional)**: define inbound events from the service. Requires HMAC-SHA256 signature verification via `X-Guild-Webhook-Signature` header and `X-Guild-Webhook-ID` for deduplication.

## Authentication Types

| Type | Use for |
| --- | --- |
| API key | Services that authenticate with a static token or API key |
| OAuth | Services that use OAuth 2.0 flows (Guild manages the token lifecycle) |

## Endpoint Definition

| Field | Description |
| --- | --- |
| Operation name | Unique identifier; becomes the tool name agents see |
| HTTP method | GET, POST, PUT, PATCH, or DELETE |
| Path | URL path appended to the base URL |
| Description | What the endpoint does; shown to LLMs when choosing tools |

## Using A Custom Integration In Agent Code

```typescript
import { myServiceTools } from "@guildai-services/my-org~my-service"
import { llmAgent, guildTools } from "@guildai/agents-sdk"

export default llmAgent({
  description: "An agent that uses a custom integration.",
  tools: { ...myServiceTools, ...guildTools },
  systemPrompt: `You have access to the Acme API.
Use it to look up customer records when asked.`,
})
```

## Connecting Credentials

Workspace administrators configure credentials in Settings > Credentials at app.guild.ai. If an agent invokes a tool from an unconfigured integration, Guild prompts the user to connect their account.

## Webhook Event Format

Inbound webhook payloads must be JSON:

```json
{
  "event": "push",
  "action": "opened",
  "payload": { ... }
}
```

Required headers:
- `X-Guild-Webhook-Signature`: `sha256=<HMAC-SHA256 hex of raw body using webhook secret>`
- `X-Guild-Webhook-ID`: unique delivery identifier (UUID)

## Relevance To Cursor SDK Integration

Cursor exposes a Cloud Agents REST API alongside the TypeScript SDK. A Guild custom integration wrapping that API would give Guild agents native access to Cursor cloud agent capabilities:

- Create cloud agents (`POST /v1/agents`)
- Send prompts to agents
- Stream or poll run status
- Retrieve run results, git metadata, PR URLs

This avoids importing `@cursor/sdk` into Guild's runtime (Node version and native dependency concerns). Instead, Guild's proxy layer handles auth (CURSOR_API_KEY injection) and agents get tools like `cursor_create_agent`, `cursor_send_prompt`, `cursor_get_run` as first-class Guild tools.

This is the cleanest path to a Guild agent that dispatches Cursor cloud agents for code execution.
