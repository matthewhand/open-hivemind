---
name: jules
description: Lists open PRs from the automated AI agent fleet (Jules, Bolt, Sentinel, Refiner, Docco) and tasks subagents to review, merge, or close them in parallel. Use when the user asks to process the PR queue, run jules, or wants to work through automated agent PRs.
compatibility: Requires gh CLI authenticated to the open-hivemind repo. Run from /mnt/models/open-hivemind.
allowed-tools: Bash(gh:*) Bash(git:*) Task
metadata:
  author: matthewhand
  version: "1.0"
---

# Jules — AI Agent PR Queue Processor

This skill manages the open PR queue from the automated AI agent fleet. It lists all open PRs, categorises them by source agent, and optionally tasks parallel subagents to process them.

## When to activate

- User says `/jules`, "run jules", "process the PR queue", "what PRs do we have"
- User wants to batch-process or review automated agent PRs

## Workflow

### Step 1 — List open PRs

```bash
gh pr list --state open --limit 50 --json number,title,headRefName,author,createdAt,labels \
  | python3 -c "
import sys, json
prs = json.load(sys.stdin)
for p in prs:
    print(f'#{p[\"number\"]:4d}  {p[\"author\"][\"login\"]:<20} {p[\"title\"][:70]}')
"
```

### Step 2 — Categorise by agent

Known agent authors and branch prefixes:
| Agent | Branch prefix / author |
|---|---|
| Jules (Google) | `jules-*` |
| Bolt | `bolt*`, `bolt/` |
| Sentinel | `sentinel-*` |
| Refiner | `refiner-*` |
| Docco | `docco-*` |
| Manual / Memo | anything else |

### Step 3 — Decide action per PR

For each PR, the default strategy is:
1. **Simple improvements** (perf, docs, tests, minor refactor) → squash merge immediately
2. **New features or behaviour changes** → review diff, check for regressions, then merge
3. **Potential regressions** (removes code, changes interfaces, conflicts with recent work) → close with comment explaining why
4. **Conflicts with main** → attempt rebase, or close if unresolvable

### Step 4 — Task parallel subagents

For batches of simple PRs, launch subagents in parallel:

```
Task(subagent_type="general-purpose", description="Merge PR #NNN", prompt="
  Review and squash merge PR #NNN in /mnt/models/open-hivemind.
  Use: gh pr view NNN to read it, gh pr diff NNN to check changes,
  then gh pr merge NNN --squash --delete-branch if safe.
  If it looks harmful or regressive, close it with gh pr close NNN --comment '...'
")
```

Launch multiple Task calls in a single message for parallel execution.

### Step 5 — Report

After all subagents complete, summarise:
- How many merged
- How many closed (with reasons)
- Any that need manual attention

## Key rules

- **Never force-push to main** without explicit user confirmation
- **Always rebase UI branches onto main** before merging to avoid reverting unrelated work
- PRs that remove implemented features or regress working functionality → close, don't merge
- PRs using `npm` instead of `pnpm` → fix the script before merging, or note it
- Check for divergence: if a PR was branched before a recent major merge, rebase it first

## Quick reference

```bash
# List open PRs
gh pr list --state open

# View a PR
gh pr view <number>

# See diff
gh pr diff <number>

# Squash merge
gh pr merge <number> --squash --subject "<title>" --delete-branch

# Close with reason
gh pr close <number> --comment "Closed: <reason>"

# Rebase branch onto main
git fetch origin && git checkout <branch> && git rebase origin/main && git push --force-with-lease
```
