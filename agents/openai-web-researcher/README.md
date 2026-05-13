# OpenAI Web Researcher

A Guild agent that performs web research using OpenAI's Responses API with the hosted web search tool.

## What it does

This agent takes a research query and returns a structured summary with findings from web search. It uses:

- **Model**: gpt-4o
- **Tool**: OpenAI's hosted `web_search` tool
- **Search depth**: High context (comprehensive results)

## Usage

### Input

```json
{
  "type": "text",
  "text": "Your research query here"
}
```

### Output

Returns a markdown-formatted research summary including:
- Query details
- Response ID for reference
- Status
- Research findings with citations

## Examples

**Simple question:**
```
What is the capital of France?
```

**Research query:**
```
What are the latest developments in quantum computing as of 2026?
```

**Comparative analysis:**
```
Compare OpenAI Agents SDK vs Cursor SDK for building AI coding assistants
```

## Dependencies

- `@guildai-services/dkountanis~openai-api` - OpenAI Responses API integration
- `@guildai/agents-sdk` - Guild agent SDK

## How it works

1. Receives a text query from the user
2. Calls `openai_api_openai_responses_create` with:
   - Model: gpt-4o
   - Web search tool enabled
   - High search context size
3. Polls for completion if needed
4. Extracts and formats the response
5. Returns structured findings

## Configuration

The agent uses these OpenAI Responses API settings:

```typescript
{
  model: "gpt-4o",
  tools: [{
    type: "web_search",
    search_context_size: "high"
  }]
}
```

## Related

- [OpenAI Responses API docs](../docs/openai-responses-api.md)
- [Usage examples](../docs/openai-responses-examples.md)
