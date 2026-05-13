# OpenAI Responses API - Tool Examples

Examples for using OpenAI's hosted tools via the Guild integration.

## Web Search

```json
{
  "model": "gpt-4o",
  "input": "What are the latest AI developments in 2026?",
  "tools": [
    {
      "type": "web_search",
      "search_context_size": "high"
    }
  ],
  "background": true
}
```

## Code Interpreter

Execute Python code in OpenAI's hosted container.

```json
{
  "model": "gpt-4o",
  "input": "Calculate the first 20 Fibonacci numbers and plot them as a line chart. Save the chart as an image.",
  "tools": [
    {
      "type": "code_interpreter",
      "container": {
        "type": "auto",
        "memory_limit": "4g"
      }
    }
  ],
  "background": true
}
```

### Code Interpreter with Files

Upload files for the model to analyze:

```json
{
  "model": "gpt-4o",
  "input": "Analyze this CSV data and provide summary statistics.",
  "tools": [
    {
      "type": "code_interpreter",
      "container": {
        "type": "auto",
        "file_ids": ["file-abc123"],
        "memory_limit": "4g"
      }
    }
  ],
  "background": true
}
```

### Code Interpreter Output

The response includes `code_interpreter_call` items with:

```json
{
  "type": "code_interpreter_call",
  "id": "call_abc123",
  "code": "import matplotlib.pyplot as plt\n...",
  "container_id": "container_xyz",
  "outputs": [
    {
      "type": "logs",
      "logs": "Fibonacci: [0, 1, 1, 2, 3, 5, 8, ...]"
    },
    {
      "type": "image",
      "url": "https://..."
    }
  ],
  "status": "completed"
}
```

## Shell Commands

Run shell commands in a container.

```json
{
  "model": "gpt-4o",
  "input": "Check the current directory contents and system information.",
  "tools": [
    {
      "type": "shell",
      "environment": {
        "type": "container_auto",
        "memory_limit": "4g"
      }
    }
  ],
  "background": true
}
```

### Shell Output

The response includes `shell_call` items:

```json
{
  "type": "shell_call",
  "id": "call_xyz",
  "action": {
    "commands": ["ls -la", "uname -a"],
    "timeout_ms": 30000
  },
  "status": "completed"
}
```

And `shell_call_output` items:

```json
{
  "type": "shell_call_output",
  "id": "out_xyz",
  "call_id": "call_xyz",
  "output": [
    {
      "stdout": "total 8\ndrwxr-xr-x 2 root root 4096...",
      "stderr": "",
      "outcome": { "type": "exit", "exit_code": 0 }
    }
  ],
  "status": "completed"
}
```

## MCP Server Connection

Connect to a remote MCP server.

```json
{
  "model": "gpt-4o",
  "input": "Use the database tools to list all users.",
  "tools": [
    {
      "type": "mcp",
      "server_label": "my-database",
      "server_url": "https://mcp.example.com/database",
      "allowed_tools": ["list_users", "get_user"]
    }
  ],
  "background": true
}
```

## File Search (Vector Store)

Search uploaded documents.

```json
{
  "model": "gpt-4o",
  "input": "Find information about authentication in the uploaded documentation.",
  "tools": [
    {
      "type": "file_search",
      "vector_store_ids": ["vs_abc123"],
      "max_num_results": 10
    }
  ],
  "background": true
}
```

## Image Generation

Generate images using GPT image models.

```json
{
  "model": "gpt-4o",
  "input": "Create a minimalist logo for a tech company called 'Guild AI'.",
  "tools": [
    {
      "type": "image_generation",
      "model": "gpt-image-1",
      "size": "1024x1024",
      "quality": "high"
    }
  ],
  "background": true
}
```

## Multiple Tools

Combine tools for complex tasks.

```json
{
  "model": "gpt-4o",
  "input": "Search the web for recent stock prices of major tech companies, then use code interpreter to create a comparison chart.",
  "tools": [
    {
      "type": "web_search",
      "search_context_size": "medium"
    },
    {
      "type": "code_interpreter",
      "container": {
        "type": "auto",
        "memory_limit": "4g"
      }
    }
  ],
  "background": true
}
```

## Polling for Completion

When using `background: true`, poll until status is `completed`:

```typescript
const createResult = await tools.openai_responses_create({
  model: "gpt-4o",
  input: "...",
  tools: [...],
  background: true,
});

const responseId = createResult.id;
let status = createResult.status;

while (status === "in_progress") {
  await sleep(3000);
  const getResult = await tools.openai_responses_get({
    response_id: responseId,
  });
  status = getResult.status;
}

// Extract output from getResult.output array
```

## Status Values

| Status | Description |
| --- | --- |
| `in_progress` | Still processing |
| `completed` | Finished successfully |
| `incomplete` | Stopped early (max tokens, content filter) |
| `failed` | Error occurred |

## Guild Agent Example

See `agents/openai-web-researcher/agent.ts` for a complete Guild agent using the OpenAI Responses API integration.
