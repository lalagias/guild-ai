# GitHub Tracking For Guild Agents

Guild remains the deployment source of truth for agents. GitHub should be used as a private mirror and portfolio/history tracker only.

## Recommended Shape

Use one private GitHub repository per Guild agent:

| Guild agent | Local path | GitHub mirror | Status |
| --- | --- | --- |
| `dkountanis/documenter` | `agents/documenter` | [lalagias/guild-documenter](https://github.com/lalagias/guild-documenter) | Created and mirrored |
| `dkountanis/pr-doc-impact` | `agents/pr-doc-impact` | [lalagias/guild-pr-doc-impact](https://github.com/lalagias/guild-pr-doc-impact) | Created and mirrored |

Keep the Guild remote as `origin`. Do not replace it. For now, the mirrors were created and updated through the GitHub MCP rather than by adding local git remotes.

## Why This Shape

- Guild CLI remains responsible for `guild agent save`, validation, and publish.
- GitHub gives you a familiar audit trail and portfolio surface.
- Each agent remains independently reviewable.
- The root `guild-ai` workspace can keep strategy docs and demo logs separately.

## Current Mirror Method

The initial mirrors were created with the GitHub MCP:

- `create_repository` for each private repo.
- `push_files` for source snapshots.

Mirrored files intentionally exclude:

- `guild.json`
- `.git/`
- `node_modules/`
- `dist/`
- `package-lock.json`
- `tsconfig.tsbuildinfo`

## Optional Git Remote Setup

If GitHub CLI/auth is fixed later and you want normal local git pushes too, add GitHub as a secondary remote:

```powershell
git -C agents/documenter remote add github https://github.com/lalagias/guild-documenter.git
git -C agents/pr-doc-impact remote add github https://github.com/lalagias/guild-pr-doc-impact.git
```

This has not been done locally yet. `origin` still points to Guild.

## Ongoing Workflow

For Guild deployment:

```powershell
guild agent save --message "Describe Guild agent change" --wait
```

For GitHub tracking after a Guild save, use one of:

- GitHub MCP `push_files` for a clean source snapshot.
- `git push github master` only if the optional GitHub remote has been added.

Do not replace `origin`; it should continue pointing to `https://app.guild.ai/git/...`.
