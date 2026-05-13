# OpenAI Responses API Reference

Source: https://developers.openai.com/api/reference/resources/responses
OpenAPI spec: https://github.com/openai/openai-openapi (responses endpoints)

Base URL: `https://api.openai.com`
Authentication: Bearer token with API key.

## Endpoints

### Responses

| Method | Path | Description |
| --- | --- | --- |
| POST | `/v1/responses` | Create a response with optional tools (web search, code interpreter, shell, MCP, etc.). |
| GET | `/v1/responses/{response_id}` | Get response status and output. |
| POST | `/v1/responses/{response_id}/cancel` | Cancel an active response. |
| DELETE | `/v1/responses/{response_id}` | Delete a response. |
| POST | `/v1/responses/compact` | Compact a response (context management). |

## Response Statuses

`in_progress` -> `completed` | `incomplete` | `failed`

## Available Tools

When creating a response, you can specify tools the model can use:

| Tool Type | Description |
| --- | --- |
| `web_search` | Search the internet for information. |
| `file_search` | Search uploaded files in a vector store. |
| `code_interpreter` | Execute Python code in OpenAI's container. |
| `shell` | Run shell commands in a container. |
| `mcp` | Connect to remote MCP servers. |
| `image_generation` | Generate images using GPT image models. |
| `computer` | Computer use (screenshots, clicks, typing). |
| `function` | Custom function calling. |

## Create Response Request Shape

```json
{
  "model": "gpt-4o",
  "input": "Search the web for the latest AI news",
  "instructions": "You are a helpful research assistant.",
  "tools": [
    { "type": "web_search" }
  ],
  "background": true
}
```

### Key Parameters

| Parameter | Type | Description |
| --- | --- | --- |
| `model` | string | Model ID (e.g., `gpt-4o`, `gpt-4o-mini`, `gpt-5.5`). |
| `input` | string or array | Text input or array of input items (text, images, files). |
| `instructions` | string or array | System/developer instructions. |
| `tools` | array | Tools to make available (web_search, code_interpreter, etc.). |
| `background` | boolean | If true, runs asynchronously. Poll GET for completion. |
| `conversation` | string | Conversation ID for multi-turn context. |
| `include` | array | Additional data to include (e.g., `["reasoning.encrypted_content"]`). |

## Tool Configuration Examples

### Web Search

```json
{
  "type": "web_search",
  "search_context_size": "medium",
  "user_location": {
    "country": "US",
    "city": "San Francisco"
  }
}
```

### Code Interpreter

```json
{
  "type": "code_interpreter",
  "container": {
    "type": "auto",
    "file_ids": ["file-abc123"],
    "memory_limit": "4g"
  }
}
```

### Shell

```json
{
  "type": "shell",
  "environment": {
    "type": "container_auto",
    "memory_limit": "4g"
  }
}
```

### MCP Server

```json
{
  "type": "mcp",
  "server_label": "my-mcp-server",
  "server_url": "https://mcp.example.com",
  "allowed_tools": ["tool1", "tool2"]
}
```

### File Search

```json
{
  "type": "file_search",
  "vector_store_ids": ["vs_abc123"],
  "max_num_results": 10
}
```

## Response Object Shape

```json
{
  "id": "resp_abc123",
  "object": "response",
  "created_at": 1714934400,
  "status": "completed",
  "model": "gpt-4o",
  "output": [
    {
      "type": "message",
      "role": "assistant",
      "content": [
        {
          "type": "output_text",
          "text": "Based on my web search..."
        }
      ]
    }
  ],
  "usage": {
    "input_tokens": 150,
    "output_tokens": 500,
    "total_tokens": 650
  }
}
```

## Output Item Types

| Type | Description |
| --- | --- |
| `message` | Assistant message with text content. |
| `reasoning` | Chain of thought (if reasoning model). |
| `function_call` | Function tool call request. |
| `function_call_output` | Function tool call result. |
| `web_search_call` | Web search tool invocation and results. |
| `file_search_call` | File search tool invocation and results. |
| `code_interpreter_call` | Code execution and outputs. |
| `shell_call` | Shell command execution and outputs. |
| `mcp_call` | MCP tool invocation. |
| `image_generation_call` | Image generation request and result. |
| `computer_call` | Computer use action. |

## Polling Pattern

For async responses (`background: true`):

1. Create response with `POST /v1/responses`
2. Extract `id` from response
3. Poll `GET /v1/responses/{id}` until `status` is `completed`, `incomplete`, or `failed`
4. Read `output` array for results

Recommended poll interval: 2-5 seconds for most tasks.

## Guild Integration Mapping

These endpoints map to Guild custom integration operations:

| Guild tool name | REST endpoint | Description |
| --- | --- | --- |
| `openai_responses_create` | `POST /v1/responses` | Create response with tools |
| `openai_responses_get` | `GET /v1/responses/{response_id}` | Get response status and output |
| `openai_responses_cancel` | `POST /v1/responses/{response_id}/cancel` | Cancel active response |
| `openai_responses_delete` | `DELETE /v1/responses/{response_id}` | Delete a response |

## Error Handling

| Status Code | Description |
| --- | --- |
| 400 | Bad request (invalid parameters). |
| 401 | Unauthorized (invalid API key). |
| 429 | Rate limited. |
| 500 | Server error. |

Error response shape:

```json
{
  "error": {
    "code": "invalid_request_error",
    "message": "Invalid model specified."
  }
}
```

## Comparison with Cursor Cloud Agents

| Aspect | Cursor Cloud | OpenAI Responses |
| --- | --- | --- |
| Base URL | `api.cursor.com` | `api.openai.com` |
| Auth | Basic (API key as username) | Bearer token |
| Primary use | Code changes, PR creation | Research, analysis, code execution |
| Git integration | Native (repos, branches, PRs) | None |
| Web search | No | Yes |
| Code execution | Full VM | Container (code_interpreter, shell) |
| Polling | `GET /runs/{runId}` | `GET /responses/{id}` |
