# UI Prototyper

Guild agent for rapid UI prototyping using v0.dev.

## What It Does

1. Takes a UI brief (free text)
2. Creates a v0 chat session
3. Generates a working React/Next.js prototype
4. Optionally deploys to v0 hosting
5. Returns chat URL and deployment URL

## Usage

```
guild agent test --ephemeral
> Create a dashboard with a sidebar navigation and a data table
```

## Dependencies

- `@guildai-services/dkountanis~v0-app-api` (v0 chat + deploy)
