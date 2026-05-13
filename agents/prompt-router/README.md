# dkountanis~prompt-router

Smart model picker that classifies a task and routes to the optimal LLM via OpenRouter.

## What it does

1. Parses the input for a prompt and an optional routing preference.
2. Classifies the task type using keyword heuristics (code, reasoning, creative, summarization, translation, analysis, general).
3. Fetches the live model list from OpenRouter to validate availability.
4. Selects the optimal model based on the task type and preference from tiered candidates (frontier, mid, budget).
5. Runs the completion and fetches generation stats (cost, latency).
6. Returns the completion result along with a routing metadata table explaining the model choice.

## Integration dependency

This agent requires the `dkountanis/openrouter` custom integration to be installed in the workspace with valid OpenRouter API credentials.

The integration proxies requests to `https://openrouter.ai/api/v1/` and handles authentication via Guild's credential vault.

## Tools used

- `send_chat_completion_request` -- Run a chat completion against any model
- `get_models` -- List available models to validate selection
- `get_generation` -- Fetch generation stats (tokens, cost, latency)

## Routing preferences

| Preference | Behavior |
| --- | --- |
| `cheapest` | Picks from budget models first, then mid, then frontier |
| `fastest` | Picks from mid-tier models first (best latency/quality balance) |
| `best-quality` | Picks from task-specific top models |
| `balanced` (default) | Picks mid-tier models, falling back to task-specific best |

## Input format

Simple prompt (balanced routing):

```
What are the key differences between TCP and UDP?
```

With preference:

```
preference: cheapest | Translate this paragraph to Spanish: The quick brown fox jumps over the lazy dog.
```

```
preference: best-quality | Review this Go function for concurrency bugs: func process(ch chan int) { ... }
```

## Output

```markdown
## Completion Result

(model's response here)

---

## Routing Metadata

| Field | Value |
| --- | --- |
| **Model** | openai/gpt-4.1-mini |
| **Task type** | summarization |
| **Preference** | balanced |
| **Tokens** | 25 in / 68 out |
| **Cost** | $0.000082 |
| **Latency** | 650ms |
| **Alternatives** | anthropic/claude-3.5-haiku, google/gemini-2.0-flash-001 |

**Rationale**: Task type: summarization. Preference: balanced. Selected mid-tier model openai/gpt-4.1-mini.
```
