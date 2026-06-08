A one-shot web research toolkit with full Firecrawl v2 API coverage (32 tools).

Works as both a full research analyst and a direct web tool. Ask a research
question for a structured report, or use individual commands (scrape, search,
crawl, map, batch, extract, agent, browser, compare) for direct results.
Say "help" to see everything available.

Capabilities:
- Full research: search, scrape, synthesize, produce cited reports
- Direct scrape: clean markdown, HTML, links, or summary from any URL
- Structured extraction: pull JSON from one page or many pages via glob patterns
- Autonomous agent (fire-1): give it a goal and it navigates/extracts autonomously
- Standalone browser: persistent browser sessions with code execution (JS/Python/bash)
- Direct search: web search with time/domain/category filtering
- Site crawl: crawl entire sites with depth/page limits, error diagnostics, preview params
- Site map: discover all URLs on a domain
- Batch scrape: process multiple URLs in one call with error reporting
- Document handling: scrape HTTPS URLs for PDF/DOCX content
- Page interaction: scrape a page then interact with it (click, type, navigate)
- Compare mode: side-by-side comparison of two topics with sources
- Cancel jobs: stop running crawl, batch, or agent operations
- Monitoring: queue status, credit history, token usage
- Firecrawl docs: ask questions about the Firecrawl API itself
- Self-healing: auto-diagnoses and retries failed operations
- Credit tracking: transparent budget reporting before and after every action

Output formats (use modifiers):
- `--markdown` (default) — clean markdown
- `--json` — structured JSON extraction
- `--html` — rendered HTML
- `--links` — extracted links only
- `--summary` — LLM-generated summary

Example inputs:
- "help"
- "scrape https://docs.guild.ai"
- "scrape https://example.com --summary"
- "extract https://example.com/pricing/* all pricing tiers with name, price, features"
- "agent find all competitor pricing on firecrawl.dev"
- "browser https://example.com"
- "search AI agent orchestration 2026 --since:month"
- "crawl https://docs.firecrawl.dev limit 30"
- "preview crawl https://docs.firecrawl.dev"
- "map https://example.com"
- "batch https://a.com https://b.com https://c.com"
- "compare Firecrawl vs Jina Reader"
- "interact click the pricing tab"
- "cancel crawl"
- "queue"
- "tokens"
- "history"
- "docs how does PDF parsing work?"
- "What are the latest AI agent orchestration frameworks in 2026?"
- "credits"
