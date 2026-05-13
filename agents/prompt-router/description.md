Smart model picker that classifies a task and routes to the optimal LLM via OpenRouter.

Give it a prompt and an optional preference (cheapest, fastest, best-quality, or
balanced). It classifies the task type, checks current model pricing and
capabilities, selects the best-fit model, runs the completion, and returns the
result along with routing rationale and cost.

Defaults to balanced routing when no preference is specified.

Example inputs:

- "Summarize this changelog into three bullet points: ..."
- "preference: cheapest | Translate this paragraph to Spanish: ..."
- "preference: best-quality | Review this Go function for concurrency bugs: ..."
