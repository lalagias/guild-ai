# dkountanis~model-eval

Multi-model evaluator that compares LLM outputs side-by-side via OpenRouter.

## What it does

1. Parses the input for a prompt, optional model list, and optional evaluation criteria.
2. If no models are specified, defaults to a curated set spanning price tiers (frontier, mid, budget).
3. Runs the prompt against each model via the OpenRouter integration.
4. Fetches per-generation stats (token counts, cost, latency) from the OpenRouter generation API.
5. Builds a structured comparison table and recommends the cheapest, fastest, and most detailed model.

## Integration dependency

This agent requires the `dkountanis/openrouter` custom integration to be installed in the workspace with valid OpenRouter API credentials.

The integration proxies requests to `https://openrouter.ai/api/v1/` and handles authentication via Guild's credential vault.

## Tools used

- `send_chat_completion_request` -- Run a chat completion against any model
- `get_models` -- List available models with pricing and capabilities
- `get_generation` -- Fetch generation stats (tokens, cost, latency)

## Input format

Simple prompt (uses default models):

```
Explain the CAP theorem in three sentences
```

Specify models:

```
models: openai/gpt-4.1, anthropic/claude-sonnet-4, google/gemini-2.5-pro-preview | Write a Python function to merge two sorted lists
```

Add evaluation criteria:

```
models: openai/gpt-4.1, meta-llama/llama-4-maverick | Explain recursion to a beginner | criteria: clarity, accuracy, brevity
```

## Output

```markdown
## Model Evaluation Results

**Prompt**: Explain the CAP theorem in three sentences

### Comparison

| Model | Tokens (in/out) | Cost | Latency | Status |
| --- | --- | --- | --- | --- |
| openai/gpt-4.1 | 15/82 | $0.000245 | 1200ms | OK |
| anthropic/claude-sonnet-4 | 15/91 | $0.000318 | 980ms | OK |

### Outputs
(individual model outputs)

### Recommendation

- **Cheapest**: openai/gpt-4.1 ($0.000245)
- **Fastest**: anthropic/claude-sonnet-4 (980ms)
- **Most detailed output**: anthropic/claude-sonnet-4 (412 chars)
```
