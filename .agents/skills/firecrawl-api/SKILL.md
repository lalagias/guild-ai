---
name: firecrawl-api
description: Firecrawl v2 API reference for Guild agent development. Use when building or modifying agents that call Firecrawl tools (scrape, search, crawl, map, batch, parse, interact, ask). Covers endpoint schemas, credit costs, the parsers gotcha, webhook events, and common patterns.
---

# Firecrawl v2 API Reference for Guild Agents

## Integration Identity

- **Integration**: `dkountanis~firecrawl` v6.1.0+ (OpenAPI import)
- **Base URL**: `https://api.firecrawl.dev/v2` (integration config must include `/v2`)
- **Auth**: API key (Bearer header, `FIRECRAWL_API_KEY`) — injected by Guild runtime
- **Import**: `import { FirecrawlTools } from "@guildai-services/dkountanis~firecrawl"`
- **Tool naming**: `firecrawl_{operation}`
- **Consumed by**: `web-researcher`, `rca-incident-brief`

Guild derives **`firecrawl_{operation}`** from each OpenAPI **`operationId`** in snake_case (e.g. `supportDocsSearch` → `support_docs_search` → **`firecrawl_support_docs_search`**). Align `pick(FirecrawlTools, [...])` with the names shown in the integration **Operations** table after publish.

## Endpoint Inventory (snake_case operations → tools)

Paths are relative to base URL `https://api.firecrawl.dev/v2`.

| Guild tool | Method | Path | Notes |
|-----------|--------|------|--------|
| `firecrawl_scrape_and_extract_from_url` | POST | /scrape | Single URL scrape |
| `firecrawl_search_and_scrape` | POST | /search | Web search + optional scrape |
| `firecrawl_map_urls` | POST | /map | Discover URLs |
| `firecrawl_parse_file` | POST | /parse | Multipart parse — **only** if `POST /parse` is in published operations |
| `firecrawl_extract_data` | POST | /extract | Multi-URL extraction with glob patterns, prompt, schema |
| `firecrawl_get_extract_status` | GET | /extract/{id} | Poll extract job (returns `tokensUsed`) |
| `firecrawl_crawl_urls` | POST | /crawl | Start crawl |
| `firecrawl_get_crawl_status` | GET | /crawl/{id} | Poll crawl |
| `firecrawl_cancel_crawl` | DELETE | /crawl/{id} | Cancel crawl |
| `firecrawl_get_active_crawls` | GET | /crawl/active | List running crawls |
| `firecrawl_crawl_params_preview` | POST | /crawl/params-preview | NL prompt → crawl params |
| `firecrawl_get_crawl_errors` | GET | /crawl/{id}/errors | Crawl error details + robots blocks |
| `firecrawl_scrape_and_extract_from_urls` | POST | /batch/scrape | Batch scrape |
| `firecrawl_get_batch_scrape_status` | GET | /batch/scrape/{id} | Poll batch |
| `firecrawl_cancel_batch_scrape` | DELETE | /batch/scrape/{id} | Cancel batch |
| `firecrawl_get_batch_scrape_errors` | GET | /batch/scrape/{id}/errors | Batch error details |
| `firecrawl_start_agent` | POST | /agent | Autonomous fire-1 agent (`prompt`, `maxCredits`, `model`) |
| `firecrawl_get_agent_status` | GET | /agent/{jobId} | Poll agent (returns `creditsUsed`) |
| `firecrawl_cancel_agent` | DELETE | /agent/{jobId} | Cancel agent |
| `firecrawl_create_browser_session` | POST | /browser | Standalone browser (`ttl`, `profile`) |
| `firecrawl_list_browser_sessions` | GET | /browser | List active/destroyed sessions |
| `firecrawl_execute_browser_code` | POST | /browser/{sessionId}/execute | Run code in browser sandbox |
| `firecrawl_delete_browser_session` | DELETE | /browser/{sessionId} | End session (returns `creditsBilled`) |
| `firecrawl_interact_with_scrape_browser_session` | POST | /scrape/{jobId}/interact | Scrape-bound interact: requires **`code`** + job id |
| `firecrawl_stop_interactive_scrape_browser_session` | DELETE | /scrape/{jobId}/interact | End scrape-bound interact |
| `firecrawl_get_credit_usage` | GET | /team/credit-usage | Current credits |
| `firecrawl_get_historical_credit_usage` | GET | /team/credit-usage/historical | Credit history by period |
| `firecrawl_get_token_usage` | GET | /team/token-usage | Extract token balance |
| `firecrawl_get_historical_token_usage` | GET | /team/token-usage/historical | Token history by period |
| `firecrawl_get_activity` | GET | /team/activity | Recent jobs |
| `firecrawl_get_queue_status` | GET | /team/queue-status | Scrape queue metrics |
| `firecrawl_support_ask` | POST | /support/ask | AI diagnose (`question`, …) |
| `firecrawl_support_docs_search` | POST | /support/docs-search | Docs Q&A (`question`) |

Import **`firecrawl-v2-openapi.json`** into Integration Hub for the full spec.

## ScrapeOptions Schema

Used by `/scrape` (top-level), `/search` (nested as `scrapeOptions`), and `/crawl` (nested as `scrapeOptions`).

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `formats` | array | `["markdown"]` | Output formats: `"markdown"`, `"html"`, `"rawHtml"`, `"links"`, `"screenshot"`, `"audio"`, or objects like `{ type: "summary" }`, `{ type: "json", schema: {...}, prompt: "..." }` |
| `onlyMainContent` | boolean | `true` | Strip headers/navs/footers deterministically (no LLM) |
| `onlyCleanContent` | boolean | `false` | Additional LLM-based cleanup of residual boilerplate |
| `parsers` | array | `["pdf"]` | **SEE PARSERS GOTCHA BELOW** |
| `maxAge` | integer | `172800000` | Cache TTL in ms. Returns cached version if younger. Set to enable 500% faster scrapes. |
| `minAge` | integer | — | Cache-only mode. Set to `1` to accept any cached data. Returns 404 if no cache. |
| `headers` | object | — | Custom request headers (cookies, user-agent, etc.) |
| `waitFor` | integer | `0` | Additional wait in ms before fetching content |
| `mobile` | boolean | `false` | Emulate mobile device |
| `timeout` | integer | `60000` | Request timeout in ms. Min 1000, max 300000. |
| `includeTags` | string[] | — | HTML tags to include |
| `excludeTags` | string[] | — | HTML tags to exclude |
| `removeBase64Images` | boolean | `true` | Remove base64 images, keep alt text |
| `blockAds` | boolean | `true` | Block ads and cookie popups |
| `proxy` | string | — | `"basic"`, `"enhanced"`, or `"auto"` |
| `location` | object | — | `{ country: "US", languages: ["en-US"] }` for geo-targeting |
| `actions` | array | — | Browser actions before scraping (wait, click, type, scroll, screenshot, etc.) |
| `skipTlsVerification` | boolean | `true` | Skip TLS cert verification |

## The Parsers Gotcha (CRITICAL)

This is the #1 thing every Firecrawl developer must know:

**Default behavior**: `parsers: ["pdf"]` — every PDF encountered is fully parsed. Costs **1 credit per PDF page**. A 329-page PDF = 329 credits in a single call.

**Safe default**: `parsers: []` — PDF content is returned as base64 with **1 flat credit** for the entire PDF.

**Capped parsing**: `parsers: [{ type: "pdf", mode: "fast", maxPages: 20 }]` — parse only the first 20 pages, costs up to 20 credits.

**PDF parsing modes**:

| Mode | Description |
|------|-------------|
| `auto` | Text extraction first, falls back to OCR if needed (default) |
| `fast` | Text-only, fastest, no OCR — won't extract from scanned pages |
| `ocr` | Force OCR on every page — use for scanned documents |

**Rules for Guild agents**:
- ALWAYS pass `parsers: []` unless the user explicitly requests PDF content.
- When PDF parsing IS needed, cap with `maxPages`.
- Apply `parsers: []` in `scrapeOptions` for search and crawl calls too.
- The `parsers` field also exists in `/parse` (ParseOptions) — same behavior.

## Parse Endpoint (/v2/parse)

Upload local or non-public files and convert them to clean, LLM-ready data.

**When to use `/parse` vs `/scrape`**:
- Public URL → use `/scrape` (auto-detects file type)
- Local file or non-public bytes → use `/parse`

**Supported formats**: PDF, DOCX, DOC, ODT, RTF, XLSX, XLS, HTML, HTM

**Request**: `multipart/form-data` with:
- `file` (required): the file bytes
- `options` (optional, JSON): ParseOptions object

**ParseOptions**:

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `formats` | array | `["markdown"]` | `"markdown"`, `"summary"`, `"html"`, `"rawHtml"`, `"links"`, `"images"`, or `{ type: "json", schema: {...}, prompt: "..." }` |
| `onlyMainContent` | boolean | `true` | Strip non-main content |
| `parsers` | array | `["pdf"]` | Same as ScrapeOptions — use `[]` or `[{ type: "pdf", mode: "fast", maxPages: N }]` |
| `includeTags` | string[] | — | HTML tags to include |
| `excludeTags` | string[] | — | HTML tags to exclude |
| `timeout` | integer | `30000` | Timeout in ms (max 300000) |
| `removeBase64Images` | boolean | `true` | Remove base64 images |
| `blockAds` | boolean | `true` | Block ads |

**Max file size**: 50 MB

**JSON extraction**: Pass `formats: [{ type: "json", schema: { ... }, prompt: "Extract the..." }]` to get structured data from documents.

## Search-Specific Fields

The `/search` endpoint wraps web search with optional inline scraping.

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `query` | string | — | Search query (max 500 chars). Supports operators: `""`, `-`, `site:`, `filetype:`, `inurl:`, `intitle:` |
| `limit` | integer | `10` | Results per source type (max 100) |
| `scrapeOptions` | ScrapeOptions | `{}` | Options for scraping results. Pass `{ formats: ["markdown"], parsers: [] }` to get content inline. |
| `categories` | array | `[]` | Filter: `"github"`, `"research"`, `"pdf"` |
| `tbs` | string | — | Time filter: `"qdr:h"` (hour), `"qdr:d"` (day), `"qdr:w"` (week), `"qdr:m"` (month), `"qdr:y"` (year) |
| `includeDomains` | string[] | — | Restrict to these domains (hostnames only) |
| `excludeDomains` | string[] | — | Exclude these domains |
| `sources` | array | `["web"]` | Source types: `"web"`, `"images"`, `"news"` |
| `location` | string | — | Geo-targeting (e.g., `"San Francisco,California,United States"`) |
| `country` | string | `"US"` | ISO country code |
| `timeout` | integer | `60000` | Timeout in ms |
| `ignoreInvalidURLs` | boolean | `false` | Exclude URLs invalid for other Firecrawl endpoints |

## Crawl-Specific Fields

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `url` | string | — | Base URL to start crawling |
| `scrapeOptions` | ScrapeOptions | — | Applied to every page. ALWAYS include `parsers: []`. |
| `limit` | integer | `10000` | Max pages. **Set this low (30-50) to avoid credit blowout.** |
| `maxDiscoveryDepth` | integer | — | Max depth from root. 0 = root only, 1 = root + direct links. |
| `includePaths` | string[] | — | Regex patterns for paths to include |
| `excludePaths` | string[] | — | Regex patterns for paths to exclude |
| `crawlEntireDomain` | boolean | `false` | Follow sibling/parent links, not just children |
| `allowExternalLinks` | boolean | `false` | Follow links to other domains |
| `allowSubdomains` | boolean | `false` | Follow links to subdomains |
| `sitemap` | string | `"include"` | `"skip"`, `"include"`, or `"only"` |
| `webhook` | object | — | `{ url: "...", headers: {...}, events: ["completed", "page", "failed", "started"] }` |
| `delay` | number | — | Seconds between scrapes (forces concurrency to 1) |
| `maxConcurrency` | integer | — | Concurrent scrape limit |

## Batch Scrape

Scrape multiple known URLs in one call.

| Field | Type | Description |
|-------|------|-------------|
| `urls` | string[] | Array of URLs to scrape |
| `scrapeOptions` | ScrapeOptions | Shared options. ALWAYS include `parsers: []`. |
| `webhook` | object | Same as crawl webhook |

Poll with `GET /v2/batch/scrape/{id}`. Cancel with `DELETE /v2/batch/scrape/{id}`.

## Ask / Docs Search (Self-Debugging)

### `/support/ask` — Diagnose failures
Call this when a Firecrawl API call fails or returns unexpected results.

| Field | Type | Description |
|-------|------|-------------|
| `question` | string | What to debug (1-8000 chars) |
| `rationale` | string | What the end user is trying to accomplish |
| `context` | object | Free-form metadata |

Response includes `answer`, `confidence`, `fixParameters` (apply to retry), and `validation`.

### `/support/docs-search` — Query Firecrawl docs
Returns docs-grounded answers with evidence citations.

| Field | Type | Description |
|-------|------|-------------|
| `question` | string | Question about Firecrawl API (1-8000 chars) |

## Interact

After a scrape, the v2 interact endpoint runs **sandbox code** against the scrape-bound browser session.

1. `POST /scrape` → read scrape job UUID from response metadata (e.g. `data.metadata.scrapeId`).
2. `POST /scrape/{jobId}/interact` with JSON body **`code`** (required), **`language`** (`node` \| `python` \| `bash`), **`timeout`** (seconds).
3. `DELETE /scrape/{jobId}/interact` to stop.

There is no separate `prompt` field in the published OpenAPI — translate user intent into executable code.

## Credit Cost Model

| Operation | Cost |
|-----------|------|
| Scrape (web page) | 1 credit |
| Scrape (PDF with `parsers: ["pdf"]`) | 1 credit per PDF page |
| Scrape (PDF with `parsers: []`) | 1 flat credit (base64 returned) |
| Scrape (PDF with `maxPages: N`) | Up to N credits |
| Search (without scrapeOptions) | 1 credit per 10 results |
| Search (with scrapeOptions) | 1 credit per 10 results + scrape credits per result |
| Crawl | 1 credit per page crawled |
| Batch scrape | 1 credit per URL |
| Map | 1 credit |
| Parse (non-PDF) | 1 flat credit |
| Parse (PDF) | Same as scrape PDF rules |

## Webhook Events

Configure on the Guild integration for `crawl` and `batch_scrape`:

| Event | Actions | Payload |
|-------|---------|---------|
| `crawl` | `started`, `page`, `completed`, `failed` | Job ID, status, scraped data per page |
| `batch_scrape` | `started`, `page`, `completed`, `failed` | Job ID, status, scraped data per URL |

Guild webhook format:
```json
{
  "event": "crawl",
  "action": "completed",
  "payload": { ... }
}
```

Required headers: `X-Guild-Webhook-Signature` (HMAC-SHA256), `X-Guild-Webhook-ID` (unique per delivery), `Content-Type: application/json`.

## Common Patterns

### Search then scrape
```
firecrawl_search_and_scrape({ query, scrapeOptions: { formats: [{ type: "markdown" }], parsers: [] } })
→ review results
→ firecrawl_scrape_and_extract_from_url({ url: best_result.url, formats: [{ type: "markdown" }], parsers: [] })
```

### Map then batch scrape
```
firecrawl_map_urls({ url: "https://docs.example.com" })
→ select relevant URLs
→ firecrawl_scrape_and_extract_from_urls({ urls: [...], scrapeOptions: { formats: [{ type: "markdown" }], parsers: [] } })
```

### Crawl with webhook
```
firecrawl_crawl_urls({ url, limit: 50, scrapeOptions: { parsers: [] }, webhook: { url: "...", events: ["completed"] } })
→ Guild trigger fires agent when crawl completes
```

### Scrape then interact
```
firecrawl_scrape_and_extract_from_url({ url, parsers: [] }) → job id from metadata
firecrawl_interact_with_scrape_browser_session({ jobId, code: "...", language: "node" })
firecrawl_stop_interactive_scrape_browser_session({ jobId })
```

### Error then ask then retry
```
result = firecrawl_scrape_and_extract_from_url({ url, parsers: [] })
if (empty or error):
  diagnosis = firecrawl_support_ask({ question: "scrape returned empty for <url>" })
  result = firecrawl_scrape_and_extract_from_url({ url, ...diagnosis.fixParameters })
```

### Parse local PDF then summarize
```
firecrawl_parse_file({ file: pdf_bytes, options: { formats: [{ type: "markdown" }], parsers: [{ type: "pdf", mode: "fast", maxPages: 20 }] } })
→ feed markdown to LLM for summary
```
