import { Agent, type SDKMessage } from "@cursor/sdk";

const SYSTEM_INSTRUCTIONS = [
  "You are a PR analysis agent. Your job is to explain a pull request clearly and concisely.",
  "",
  "When given a PR number, do the following:",
  "1. Use your tools to find and read the relevant changed files in this repository.",
  "2. Look at the git log and recent commits to understand the PR context.",
  "3. Produce a structured summary in this exact format:",
  "",
  "## Summary",
  "One paragraph explaining what this PR does and why.",
  "",
  "## Changes",
  "Bullet list of the key changes, grouped by area (e.g. API, UI, tests, config).",
  "",
  "## Risk Areas",
  "Anything that could break, needs careful review, or has edge cases.",
  "",
  "## Testing Suggestions",
  "What a reviewer should test or verify before merging.",
  "",
  "Be specific about file names and function names. Do not be generic.",
].join("\n");

function parseArgs(argv: string[]): {
  repo: string;
  pr: number;
  model: string;
} {
  let repo = "";
  let pr = 0;
  let model = process.env.CURSOR_MODEL ?? "composer-2";

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === "--repo" || arg === "-r") && argv[i + 1]) {
      repo = argv[++i];
    } else if ((arg === "--pr" || arg === "-p") && argv[i + 1]) {
      pr = parseInt(argv[++i], 10);
    } else if ((arg === "--model" || arg === "-m") && argv[i + 1]) {
      model = argv[++i];
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: cursor-pr-explainer --repo <github-url> --pr <number> [--model <id>]\n" +
          "       cursor-pr-explainer owner/repo#123\n\n" +
          "Examples:\n" +
          "  cursor-pr-explainer --repo https://github.com/vercel/next.js --pr 42\n" +
          "  cursor-pr-explainer vercel/next.js#42\n"
      );
      process.exit(0);
    } else if (!repo && !pr) {
      const shorthand = arg.match(
        /^(?:https?:\/\/github\.com\/)?([^/]+\/[^/#]+)#(\d+)$/
      );
      if (shorthand) {
        repo = `https://github.com/${shorthand[1]}`;
        pr = parseInt(shorthand[2], 10);
      }
    }
  }

  if (!repo || !pr) {
    console.error(
      "Error: --repo and --pr are required (or use shorthand owner/repo#123)"
    );
    process.exit(1);
  }

  if (!repo.startsWith("https://")) {
    repo = `https://github.com/${repo}`;
  }

  return { repo, pr, model };
}

function logEvent(event: SDKMessage) {
  switch (event.type) {
    case "assistant":
      for (const block of event.message.content) {
        if (block.type === "text") {
          process.stdout.write(block.text);
        }
      }
      break;
    case "thinking":
      process.stderr.write(`[thinking] ${event.text.slice(0, 120)}\n`);
      break;
    case "tool_call":
      if (event.status === "running") {
        process.stderr.write(`[tool] ${event.name} ...\n`);
      }
      break;
    case "status":
      process.stderr.write(`[status] ${event.status}\n`);
      break;
  }
}

async function main() {
  const { repo, pr, model } = parseArgs(process.argv);
  const apiKey = process.env.CURSOR_API_KEY;

  if (!apiKey) {
    console.error("Error: CURSOR_API_KEY environment variable is required");
    process.exit(1);
  }

  process.stderr.write(
    `\nPR Explainer: ${repo}#${pr} (model: ${model})\n\n`
  );

  let agent;
  try {
    agent = await Agent.create({
      apiKey,
      name: `PR Explainer: ${repo.split("/").slice(-2).join("/")}#${pr}`,
      model: { id: model },
      cloud: {
        repos: [{ url: repo, startingRef: "main" }],
      },
    });

    process.stderr.write(`[agent] ${agent.agentId}\n`);

    const prompt = [
      SYSTEM_INSTRUCTIONS,
      "",
      `Analyze PR #${pr} in this repository (${repo}).`,
      "Look at the recent commits and changed files to understand what this PR does.",
      "Produce the structured summary as instructed above.",
    ].join("\n");

    const run = await agent.send(prompt);
    process.stderr.write(`[run] ${run.id}\n`);

    for await (const event of run.stream()) {
      logEvent(event);
    }

    const result = await run.wait();

    process.stderr.write(`\n[done] status=${result.status}`);
    if (result.durationMs) {
      process.stderr.write(` duration=${(result.durationMs / 1000).toFixed(1)}s`);
    }
    process.stderr.write("\n");

    if (result.status === "error") {
      process.exit(2);
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\nStartup error: ${message}`);
    process.exit(1);
  } finally {
    if (agent) {
      await agent[Symbol.asyncDispose]();
    }
  }
}

main();
