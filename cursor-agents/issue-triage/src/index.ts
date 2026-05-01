import { Agent, type SDKMessage } from "@cursor/sdk";

const TRIAGE_PROMPT_TEMPLATE = (repoUrl: string, issueNumber: number) => `
You are a triage agent. Your job is to read a GitHub issue and produce a structured implementation plan.

Read GitHub issue #${issueNumber} from the repository at ${repoUrl}.
You can find the issue at: ${repoUrl}/issues/${issueNumber}

Use your tools to:
1. Read the issue title and body (use the shell to run: gh issue view ${issueNumber} --repo ${repoUrl.replace("https://github.com/", "")} --json title,body,labels,comments || curl -s https://api.github.com/repos/${repoUrl.replace("https://github.com/", "")}/issues/${issueNumber})
2. Explore the repository structure to understand the codebase.
3. Identify which files would need to change.

Then produce a plan in this exact format:

## Issue Summary
One paragraph restating the issue in engineering terms.

## Approach
Step-by-step description of how to implement the fix or feature.

## Files To Change
Bullet list of specific files that need modification, with a one-line description of what changes in each.

## Testing Strategy
How to verify the implementation works and doesn't break existing functionality.

## Risks
Anything that could go wrong or needs extra attention.

Be specific. Reference actual file paths and function names from the codebase.
`.trim();

const EXECUTE_PROMPT_TEMPLATE = (
  repoUrl: string,
  issueNumber: number,
  plan: string
) => `
You are an implementation agent. A triage agent has already analyzed a GitHub issue and produced a plan. Your job is to execute that plan carefully.

Repository: ${repoUrl}
Issue: #${issueNumber}

## Implementation Plan

${plan}

## Instructions

1. Follow the plan above step by step.
2. Make the code changes described in the plan.
3. Run any relevant tests or linters to verify your changes.
4. Keep changes minimal and focused on the issue.
5. Write clear commit messages.

If the plan has gaps or something doesn't work as expected, use your judgment to fill in details, but stay close to the plan's intent.
`.trim();

function parseArgs(argv: string[]): {
  repo: string;
  issue: number;
  model: string;
  triageOnly: boolean;
} {
  let repo = "";
  let issue = 0;
  let model = process.env.CURSOR_MODEL ?? "composer-2";
  let triageOnly = false;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === "--repo" || arg === "-r") && argv[i + 1]) {
      repo = argv[++i];
    } else if ((arg === "--issue" || arg === "-i") && argv[i + 1]) {
      issue = parseInt(argv[++i], 10);
    } else if ((arg === "--model" || arg === "-m") && argv[i + 1]) {
      model = argv[++i];
    } else if (arg === "--triage-only") {
      triageOnly = true;
    } else if (arg === "--help" || arg === "-h") {
      console.log(
        "Usage: cursor-issue-triage --repo <github-url> --issue <number> [--model <id>] [--triage-only]\n" +
          "       cursor-issue-triage owner/repo#42\n\n" +
          "Options:\n" +
          "  --repo, -r       GitHub repository URL\n" +
          "  --issue, -i      Issue number\n" +
          "  --model, -m      Model ID (default: composer-2)\n" +
          "  --triage-only    Only run the triage phase, skip execution\n\n" +
          "Examples:\n" +
          "  cursor-issue-triage --repo https://github.com/vercel/next.js --issue 42\n" +
          "  cursor-issue-triage vercel/next.js#42\n" +
          "  cursor-issue-triage vercel/next.js#42 --triage-only\n"
      );
      process.exit(0);
    } else if (!repo && !issue) {
      const shorthand = arg.match(
        /^(?:https?:\/\/github\.com\/)?([^/]+\/[^/#]+)#(\d+)$/
      );
      if (shorthand) {
        repo = `https://github.com/${shorthand[1]}`;
        issue = parseInt(shorthand[2], 10);
      }
    }
  }

  if (!repo || !issue) {
    console.error(
      "Error: --repo and --issue are required (or use shorthand owner/repo#42)"
    );
    process.exit(1);
  }

  if (!repo.startsWith("https://")) {
    repo = `https://github.com/${repo}`;
  }

  return { repo, issue, model, triageOnly };
}

function logEvent(event: SDKMessage, prefix = "") {
  switch (event.type) {
    case "assistant":
      for (const block of event.message.content) {
        if (block.type === "text") {
          process.stdout.write(block.text);
        }
      }
      break;
    case "thinking":
      process.stderr.write(
        `${prefix}[thinking] ${event.text.slice(0, 120)}\n`
      );
      break;
    case "tool_call":
      if (event.status === "running") {
        process.stderr.write(`${prefix}[tool] ${event.name} ...\n`);
      }
      break;
    case "status":
      process.stderr.write(`${prefix}[status] ${event.status}\n`);
      break;
  }
}

async function runTriage(
  apiKey: string,
  repo: string,
  issue: number,
  model: string
): Promise<string> {
  process.stderr.write("\n=== Phase 1: Triage ===\n\n");

  const triagePrompt = TRIAGE_PROMPT_TEMPLATE(repo, issue);

  const result = await Agent.prompt(triagePrompt, {
    apiKey,
    name: `Triage: ${repo.split("/").slice(-2).join("/")}#${issue}`,
    model: { id: model },
    local: { cwd: process.cwd() },
  });

  if (result.status === "error") {
    console.error("Triage phase failed");
    process.exit(2);
  }

  const plan = result.result ?? "";

  process.stderr.write(`\n[triage] status=${result.status}`);
  if (result.durationMs) {
    process.stderr.write(
      ` duration=${(result.durationMs / 1000).toFixed(1)}s`
    );
  }
  process.stderr.write("\n");

  return plan;
}

async function runExecution(
  apiKey: string,
  repo: string,
  issue: number,
  model: string,
  plan: string
): Promise<void> {
  process.stderr.write("\n=== Phase 2: Execute ===\n\n");

  const agent = await Agent.create({
    apiKey,
    name: `Issue #${issue}: ${repo.split("/").slice(-2).join("/")}`,
    model: { id: model },
    cloud: {
      repos: [{ url: repo, startingRef: "main" }],
      autoCreatePR: true,
    },
  });

  process.stderr.write(`[agent] ${agent.agentId}\n`);

  try {
    const executePrompt = EXECUTE_PROMPT_TEMPLATE(repo, issue, plan);
    const run = await agent.send(executePrompt);
    process.stderr.write(`[run] ${run.id}\n`);

    for await (const event of run.stream()) {
      logEvent(event, "[exec] ");
    }

    const result = await run.wait();

    process.stderr.write(`\n[exec] status=${result.status}`);
    if (result.durationMs) {
      process.stderr.write(
        ` duration=${(result.durationMs / 1000).toFixed(1)}s`
      );
    }
    process.stderr.write("\n");

    if (result.git?.branches?.length) {
      for (const branch of result.git.branches) {
        if (branch.prUrl) {
          process.stderr.write(`\n[PR] ${branch.prUrl}\n`);
        } else if (branch.branch) {
          process.stderr.write(`\n[branch] ${branch.branch} on ${branch.repoUrl}\n`);
        }
      }
    } else {
      process.stderr.write(
        "\n[info] No branch or PR info returned. Check the Cursor dashboard for agent status.\n"
      );
    }

    if (result.status === "error") {
      process.exit(2);
    }
  } finally {
    await agent[Symbol.asyncDispose]();
  }
}

async function main() {
  const { repo, issue, model, triageOnly } = parseArgs(process.argv);
  const apiKey = process.env.CURSOR_API_KEY;

  if (!apiKey) {
    console.error("Error: CURSOR_API_KEY environment variable is required");
    process.exit(1);
  }

  process.stderr.write(
    `\nIssue Triage: ${repo}#${issue} (model: ${model})${triageOnly ? " [triage-only]" : ""}\n`
  );

  try {
    const plan = await runTriage(apiKey, repo, issue, model);

    process.stdout.write("\n\n--- TRIAGE PLAN ---\n\n");
    process.stdout.write(plan);
    process.stdout.write("\n\n--- END PLAN ---\n\n");

    if (triageOnly) {
      process.stderr.write("[done] Triage-only mode; skipping execution.\n");
      return;
    }

    await runExecution(apiKey, repo, issue, model, plan);

    process.stderr.write("\n[done] Pipeline complete.\n");
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`\nStartup error: ${message}`);
    process.exit(1);
  }
}

main();
