# Cursor Cloud Agents REST API Reference

Source: https://cursor.com/docs/cloud-agent/api/endpoints
OpenAPI spec: https://cursor.com/docs-static/cloud-agents-openapi.yaml

Base URL: `https://api.cursor.com`
Authentication: Basic Auth with API key as username, empty password.

## Endpoints

### Agents

| Method | Path | Description |
| --- | --- | --- |
| POST | `/v1/agents` | Create agent + initial run. Takes prompt, model, repos, autoCreatePR. |
| GET | `/v1/agents` | List agents (paginated). Filter by prUrl, includeArchived. |
| GET | `/v1/agents/{id}` | Get agent metadata (repos, branchName, autoCreatePR, latestRunId). |
| POST | `/v1/agents/{id}/archive` | Soft-delete (reversible). |
| POST | `/v1/agents/{id}/unarchive` | Restore archived agent. |
| DELETE | `/v1/agents/{id}` | Permanent delete. |

### Runs

| Method | Path | Description |
| --- | --- | --- |
| POST | `/v1/agents/{id}/runs` | Send follow-up prompt to existing agent. 409 if run already active. |
| GET | `/v1/agents/{id}/runs` | List runs for an agent (paginated). |
| GET | `/v1/agents/{id}/runs/{runId}` | Get run status and timestamps. |
| GET | `/v1/agents/{id}/runs/{runId}/stream` | SSE stream of run events (status, assistant, thinking, tool_call, result, done). |
| POST | `/v1/agents/{id}/runs/{runId}/cancel` | Cancel active run. Terminal; cannot resume. |

### Artifacts

| Method | Path | Description |
| --- | --- | --- |
| GET | `/v1/agents/{id}/artifacts` | List artifacts (path, sizeBytes, updatedAt). |
| GET | `/v1/agents/{id}/artifacts/download?path=...` | Get presigned S3 URL (15-min expiry). |

### Metadata

| Method | Path | Description |
| --- | --- | --- |
| GET | `/v1/me` | API key info (name, email, createdAt). |
| GET | `/v1/models` | List available model IDs. |
| GET | `/v1/repositories` | List accessible GitHub repos (strict rate limit: 1/min, 30/hr). |

## Run Statuses

`CREATING` -> `RUNNING` -> `FINISHED` | `ERROR` | `CANCELLED` | `EXPIRED`

## SSE Stream Events

| Event | Payload | Description |
| --- | --- | --- |
| status | `{ runId, status }` | Run status transition |
| assistant | `{ text }` | Assistant text delta |
| thinking | `{ text }` | Thinking text delta |
| tool_call | varies | Tool call lifecycle |
| heartbeat | `{}` | Keepalive |
| result | `{ runId, status }` | Terminal run status |
| error | `{ code, message }` | Stream error |
| done | `{}` | Stream complete |

Supports resume via `Last-Event-ID` header. `410 stream_expired` after retention window.

## Create Agent Request Shape

```json
{
  "prompt": { "text": "...", "images": [] },
  "model": { "id": "composer-2" },
  "repos": [{ "url": "https://github.com/org/repo", "startingRef": "main" }],
  "autoCreatePR": true,
  "skipReviewerRequest": false,
  "branchName": "cursor/my-branch",
  "autoGenerateBranch": true
}
```

## Guild Integration Mapping

These endpoints map to Guild custom integration operations:

| Guild tool name | REST endpoint | Description |
| --- | --- | --- |
| `cursor_create_agent` | `POST /v1/agents` | Create cloud agent with prompt and repo |
| `cursor_get_agent` | `GET /v1/agents/{id}` | Check agent metadata and branch info |
| `cursor_list_agents` | `GET /v1/agents` | List recent agents |
| `cursor_send_prompt` | `POST /v1/agents/{id}/runs` | Send follow-up prompt |
| `cursor_get_run` | `GET /v1/agents/{id}/runs/{runId}` | Poll run status |
| `cursor_cancel_run` | `POST /v1/agents/{id}/runs/{runId}/cancel` | Cancel active run |
| `cursor_list_artifacts` | `GET /v1/agents/{id}/artifacts` | List generated files |
| `cursor_list_models` | `GET /v1/models` | Available models |
