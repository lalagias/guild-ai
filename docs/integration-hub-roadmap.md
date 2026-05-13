# Integration Hub Roadmap

Single source of truth for Guild custom integrations — what exists, what's planned, and which agents consume each one.

## Published Integrations

### `dkountanis~cursor-cloud-agents`
- **Status**: Published v1.0.0+
- **Base URL**: `https://api.cursor.com`
- **Auth**: API key (Basic Auth with `CURSOR_API_KEY` as username)
- **Import**: `import { CursorCloudAgentsTools } from "@guildai-services/dkountanis~cursor-cloud-agents"`
- **Tool pattern**: `cursor_cloud_agents_{operation}`
- **Endpoints**: `create_agent`, `get_agent`, `list_agents`, `get_run`, `cancel_run`, `list_artifacts`, `list_models`
- **Consumed by**: `cursor-cloud-coder`, `issue-triage-router` (dispatch), `security-scan` (remediation handoff)

### `dkountanis~firecrawl`
- **Status**: Published v6.0.0 (all endpoints verified against live API)
- **Base URL**: `https://api.firecrawl.dev`
- **Auth**: OAuth 2.0 (Bearer header)
- **Import**: `import { FirecrawlTools } from "@guildai-services/dkountanis~firecrawl"`
- **Tool pattern**: `firecrawl_{operation}`
- **Endpoints (v6 — 16 operations, all paths verified)**:
  - Core: `firecrawl_scrape` (POST /v2/scrape), `firecrawl_search` (POST /v2/search), `firecrawl_map` (POST /v2/map)
  - Crawl: `firecrawl_crawl` (POST /v2/crawl), `firecrawl_crawl_status` (GET /v2/crawl/{id}), `firecrawl_crawl_cancel` (DELETE /v2/crawl/{id})
  - Batch: `firecrawl_batch_scrape` (POST /v2/batch/scrape), `firecrawl_batch_scrape_status` (GET /v2/batch/scrape/{id}), `firecrawl_batch_scrape_cancel` (DELETE /v2/batch/scrape/{id})
  - Parse: `firecrawl_parse` (POST /v2/parse)
  - Team: `firecrawl_credit_usage` (GET /v2/team/credit-usage), `firecrawl_activity` (GET /v2/team/activity)
  - Support: `firecrawl_ask` (POST /v2/support/ask), `firecrawl_docs_search` (POST /v2/support/docs-search)
  - Interact: `firecrawl_interact` (POST /v2/scrape/{id}/interact), `firecrawl_interact_stop` (DELETE /v2/scrape/{id}/interact)
- **Consumed by**: `web-researcher` (multi-turn, 8 Firecrawl tools + guildTools + consoleTools), `rca-incident-brief` (optional enrichment)
- **Webhook events**: `crawl` (started/page/completed/failed), `batch_scrape` (started/page/completed/failed)
- **Credit safety**: All agents MUST pass `parsers: []` on scrape/search/crawl calls to prevent PDF credit blowout. Default `parsers: ["pdf"]` costs 1 credit per PDF page. See `.agents/skills/firecrawl-api/SKILL.md` for full reference.
- **New in v6**: `/parse` endpoint for local/non-public file processing (PDF, DOCX, XLSX, HTML, ODT, RTF — up to 50MB). `/ask` endpoint for AI-powered self-debugging with `fixParameters`. `/interact` for post-scrape page interaction. Credit usage and activity monitoring endpoints. All API paths verified with live integration tests.

### `dkountanis~v0-app-api`
- **Status**: Published v1.0.0
- **Base URL**: `https://api.v0.dev`
- **Auth**: API key (Bearer header, `V0_API_KEY`)
- **Import**: `import { V0AppApiTools } from "@guildai-services/dkountanis~v0-app-api"`
- **Tool pattern**: `v0_app_api_{operation}`
- **Endpoints**: `v0_chats_init`, `v0_chats_create`, `v0_chats_get`, `v0_chats_send_message`, `v0_projects_create`, `v0_projects_find`, `v0_deployments_create`
- **Consumed by**: `ui-prototyper`

### `dkountanis~openrouter`
- **Status**: Published v1.0.0
- **Base URL**: `https://openrouter.ai/api/v1`
- **Auth**: API key (Bearer header, `OPENROUTER_API_KEY`)
- **Import**: `import { OpenrouterTools } from "@guildai-services/dkountanis~openrouter"`
- **Tool pattern**: `openrouter_{operation}`
- **Key endpoints**: `send_chat_completion_request`, `get_models`, `get_generation`, `get_current_key`
- **All endpoints**: `send_chat_completion_request`, `get_models`, `get_generation`, `get_current_key`, `list_models_user`, `list_models_count`, `list_endpoints`, `list_providers`, `get_credits`, `get_user_activity`, `create_embeddings`, `list_embeddings_models`, `create_videos`, `get_videos`, `list_videos_models`, `create_rerank`, `create_responses`, `create_messages`, `create_audio_transcriptions`, `list_generation_content`, `list`, `create_keys`, `get_key`, `update_keys`, `delete_keys`, `list_guardrails`, `create_guardrail`, `get_guardrail`, `update_guardrail`, `delete_guardrail`, `list_workspaces`, `create_workspace`, `get_workspace`, `update_workspace`, `delete_workspace`
- **Consumed by**: `model-eval`, `prompt-router`

### `dkountanis~skills-sh`
- **Status**: Pending publication
- **Base URL**: `https://skills.sh`
- **Auth**: API key (Bearer header, `SKILLS_SH_API_KEY`) — optional but recommended for higher rate limits
- **Import**: `import { SkillsShTools } from "@guildai-services/dkountanis~skills-sh"`
- **Tool pattern**: `skills_sh_{operation}`
- **Endpoints**: `skills_sh_list`, `skills_sh_search`, `skills_sh_curated`, `skills_sh_get_detail`, `skills_sh_get_audit`
- **Consumed by**: `skills-discovery`

## Guild-Provided Integrations (consumed, not built by us)

### `guildai~github`
- **Import**: `import { gitHubTools } from "@guildai-services/guildai~github"`
- **Consumed by**: `issue-triage-router`, `test-generator`, `security-scan`, `rca-incident-brief`, `documenter`, `pr-doc-impact`, `code-review`, `cicd-optimizer`, `dep-manager`

### `guildai~aws-cloudwatch`
- **Status**: Published v1.0.0 (by Yun Yu)
- **Import**: `import { AwsCloudwatchTools } from "@guildai-services/guildai~aws-cloudwatch"`
- **Tool pattern**: `aws_cloudwatch_{operation}`
- **Key endpoints for RCA**: `start_query`, `get_query_results`, `filter_log_events`, `describe_log_groups`, `describe_log_streams`, `list_anomalies`
- **Consumed by**: `rca-incident-brief`
- **Note**: Credential wiring requires Bryce/Guild admin to connect AWS credentials in the workspace

### Linear (via Guild built-in)
- **Consumed by**: `issue-triage-router`

## Explicitly Dropped

| Integration | Reason |
| --- | --- |
| Codex Hub integration | App Server is stdio JSON-RPC; SDK is npm-only. Not Hub-addressable. |
| OpenAI Responses API | Out of scope this round. |
| Linear Hub build | Already exists in Guild. We consume it. |
| CloudWatch Hub build | Already exists in Guild (`guildai~aws-cloudwatch`). We consume it. |

## Agent → Integration Dependency Map

| Agent | Integrations Used |
| --- | --- |
| `cursor-cloud-coder` | cursor-cloud-agents |
| `documenter` | github, experimental-coding |
| `pr-doc-impact` | github |
| `issue-triage-router` | linear, github, cursor-cloud-agents |
| `test-generator` | github, experimental-coding |
| `security-scan` | github, cursor-cloud-agents |
| `rca-incident-brief` | aws-cloudwatch, github, firecrawl |
| `web-researcher` | firecrawl (v2: search, scrape, map, batch_scrape, crawl, crawl_status, credit_usage, ask + guildTools + consoleTools) |
| `ui-prototyper` | v0-app-api |
| `model-eval` | openrouter |
| `prompt-router` | openrouter |
| `code-review` | github |
| `cicd-optimizer` | github |
| `dep-manager` | github |
| `skills-discovery` | skills-sh |
