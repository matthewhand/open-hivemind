# Agent Collaboration Workflow

This document defines how human agents (Antigravity) and bot agents (Jules fleet) collaborate on PRs in this repo. It is the source of truth for the iteration rhythm.

---

## Overview

The workflow alternates between two modes:

1. **Fleet mode** — post scope-widening feedback on N-1 PRs to task Jules agents with improvements
2. **Local mode** — pick 1 PR, improve it directly, squash-merge immediately

Then wait for the fleet to respond → review their work → batch squash-merge.

```
Open PRs (N) → Post feedback on N-1 → Locally improve+merge #1
                         ↓
              Fleet pushes improved commits
                         ↓
         Review all responses → Batch squash-merge
```

---

## Step-by-Step Iteration

### 1. Check open PRs

```bash
gh pr list --state open --limit 30 --json number,title,headRefName \
  --jq '.[] | "\(.number) \(.headRefName[:50]) — \(.title[:50])"' | sort -n
```

### 2. Post scope-widening feedback on all but one

Use `--body-file` to avoid shell escaping issues:

```bash
cat > /tmp/fb_1234.md << 'EOF'
## 🚀 Scope Widening Feedback

**Idea 1 — ...:** description
**Idea 2 — ...:** description  
**Idea 3 — ...:** description

_Please broaden the changes and push — we want to merge the fullest version of this fix!_
EOF

gh pr comment 1234 --body-file /tmp/fb_1234.md
```

**Topic-aware feedback ideas by PR area:**

| Area | Idea 1 | Idea 2 | Idea 3 |
|---|---|---|---|
| Modal/dialog | Audit all modals for `div.modal-open` → native `<dialog>` | Focus trap Playwright test | Backdrop click + Escape dismissal |
| Form/input | Full field audit for missing DaisyUI wrappers | Inline validation on blur | Accessibility: label + aria-describedby |
| WebSocket | Exponential backoff reconnect | JSDoc on all emit/on | useEffect cleanup on unmount |
| Config/type | BotConfig consolidation audit | Zod schema for validation | Export canonical type from `src/types/` |
| Tests | 5+ edge case unit tests | Jest snapshot | strict tsconfig |
| CI/Netlify | lockfile integrity check | `npm ci --dry-run` step | Docs explaining build strategy |

### 3. Locally improve + squash-merge the chosen PR

```bash
# Checkout the branch
git checkout -B improve-PRNUM origin/BRANCH_NAME

# Make improvements (tests, docs, fixes)
# ...

# Rebase onto current main
git rebase origin/main --strategy-option=theirs

# Force push
git push origin HEAD:BRANCH_NAME --force

# Squash merge via admin
gh pr merge PRNUM --squash --admin \
  --subject "fix(scope): short description (#PRNUM)"

# Return to main
git checkout main && git pull origin main --ff-only
```

### 4. Check if fleet has responded to feedback

```bash
for PR in 1186 1187 1188 1189 1190 1191 1192; do
  UPDATED=$(gh pr view $PR --json updatedAt --jq '.updatedAt')
  LAST=$(gh api repos/matthewhand/open-hivemind/pulls/$PR/commits \
    --jq '.[-1].commit.message[:60]' 2>/dev/null)
  echo "#$PR updated=$UPDATED | last_commit: $LAST"
done
```

**Interpretation:**
- `updatedAt` after the feedback timestamp → fleet responded
- New commit message different from original PR title → improvement pushed

### 5. Batch squash-merge all fleet responses

Use `force_merge.py` which handles rebase + force push + admin merge:

```bash
python3 force_merge.py 2>&1
```

The script iterates all open PRs:
1. Tries direct API merge first (`gh pr merge --squash --admin`)
2. If rejected: checks out branch, rebases onto main (resolving conflicts with `--theirs`), force-pushes, retries merge
3. Prints `✅ merged` or `❌ failed` for each

---

## Automation Scripts

### `auto_improve_merge.py` (continuous watcher)

Polls every 60s. On each new PR from the Jules fleet:
1. Posts 3-idea scope-widening feedback comment
2. Rebases the branch onto main
3. Squash-merges via admin API

```bash
# Run in background from repo root
python3 /home/chatgpt/open-hivemind/auto_improve_merge.py 2>&1 &
```

Exits after 30 idle rounds (~30 min with no new PRs).

### `force_merge.py` (batch merge)

Rebase + force push + admin squash-merge all currently open PRs.

```bash
python3 /mnt/models/open-hivemind/force_merge.py 2>&1
```

---

## Netlify Deploy Strategy

Production deploys are **tag-triggered**, not branch-triggered:

- Netlify watches the `release` branch (set in Netlify dashboard)
- `.github/workflows/netlify-tag-deploy.yml` hard-resets `release` on every `v*` tag push

```bash
# Create a new release
git tag v1.2.3
git push origin v1.2.3
# → Netlify auto-deploys from the `release` branch
```

This prevents broken `main`/feature-branch commits from triggering Netlify CI.

---

## Conventions

- **Commit style:** `fix(scope): short description` / `feat(scope): ...` / `test(scope): ...`
- **Squash merge title:** `Original PR title (#PRNUM)` 
- **Branch naming:** Jules fleet uses auto-generated names; hotfixes use `hotfix/short-name`
- **Never merge directly to main** — always via PR + squash merge (preserves linear history)
- **`--body-file`** for all `gh pr comment` and `gh pr create` to avoid shell escaping bugs
