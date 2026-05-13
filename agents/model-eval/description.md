Compares LLM model outputs side-by-side via OpenRouter.

Give it a prompt and an optional list of models. It runs the prompt against each
model, fetches per-generation cost and token stats, and produces a structured
comparison table with output excerpts and a recommendation.

If no models are specified, defaults to a curated set spanning price tiers:
a frontier model, a mid-tier model, and a budget model.

Example inputs:

- "Compare models on: Explain the CAP theorem in three sentences"
- "Evaluate openai/gpt-4.1, anthropic/claude-sonnet-4, google/gemini-2.5-pro-preview on: Write a Python function to merge two sorted lists"
- "Cheapest model that can write a working React component for a date picker"
