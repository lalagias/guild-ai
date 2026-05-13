# Web Researcher

Guild agent for scoped web research using Firecrawl.

## What It Does

1. Searches the web for relevant content
2. Scrapes full pages from top results
3. Produces a structured report with cited sources
4. Caps at 10 pages per run

## Usage

```
guild agent test --ephemeral
> What are the latest AI agent orchestration frameworks in 2026?
```

## Dependencies

- `@guildai-services/dkountanis~firecrawl` (search + scrape)
