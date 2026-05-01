# Documenter agent requirements

## Overview

The documenter agent takes a GitHub pull request as input, analyzes the code changes, reviews existing public documentation, and implements any necessary documentation updates to keep docs accurate and in sync with the codebase.

## Input

- A GitHub pull request URL or reference, for example `owner/repo#123`.
- Optional documentation repository target, for example `docs: owner/docs`.
- If no docs repository is specified, default to `guildaidev/docs`.

## Workflow

### 1. Retrieve and analyze PR changes

- Fetch the full PR details and changed files using GitHub tools.
- Retrieve PR title, description, changed files, and any linked issues for additional context.
- Identify categories of changes:
  - New features or endpoints.
  - Modified behavior of existing features.
  - Removed or deprecated functionality.
  - Configuration changes.
  - API changes.
  - UI changes that affect user-facing workflows.

### 2. Determine documentation impact

- Classify each change by documentation relevance:
  - **Docs-required**: new features, breaking changes, API changes, configuration changes, new UI flows.
  - **Docs-optional**: minor behavior tweaks, performance improvements, internal refactors with user-visible side effects.
  - **No docs needed**: internal refactors, test changes, CI changes, dependency bumps with no behavior change.
- Produce a structured impact summary before proceeding to edits.

### 3. Locate existing documentation

- Identify the documentation source from the user input or default to `guildaidev/docs`.
- Search for docs related to changed function names, API endpoints, CLI commands, component names, and configuration keys.
- Check navigation config such as `docs.json`, `mint.json`, or sidebar files.
- Read relevant documentation pages in full before proposing changes.

### 4. Plan documentation changes

For each docs-required change, produce a plan:

- Which files to modify or create.
- What to add, update, or remove.
- Where in the page the change belongs.

For new pages:

- Determine the appropriate navigation group.
- Draft frontmatter when required by the docs framework.
- Identify where to add the page in navigation.

For removals or deprecations:

- Identify all pages that reference the removed or deprecated item.
- Plan whether to remove content, add deprecation notices, or redirect.

### 5. Implement documentation changes

- Edit existing pages to reflect code changes.
- Prefer the smallest accurate change.
- Do not introduce duplicate content unless strategically justified.

### 6. Validate changes

- Verify internal links where possible.
- Confirm code blocks have language tags.
- Confirm frontmatter is complete on any new or modified pages when required.
- Check new pages are included in navigation config when required.
- Verify formatting matches existing pages.

## Output

- The set of documentation file changes.
- What changed and why.
- PR changes with no doc impact, with justification.
- Areas of uncertainty that need human review.

## Constraints

- Never fabricate information.
- Prefer the smallest accurate change.
- Do not add promotional or editorial language.
- Do not modify documentation unrelated to the PR.
- Ask for clarification rather than making assumptions about intended behavior.
- Respect the target docs repo's workflow.
