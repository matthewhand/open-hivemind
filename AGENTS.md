# AGENTS.md — Open Hivemind Agent Guide

This file is for all coding agents (human or automated) working in this repo.
It defines architecture, conventions, and the proven PR iteration workflow.

---

## 1. Repository Architecture

### Folder Structure

```
open-hivemind/
├── src/
│   ├── client/          # React SPA (Vite + DaisyUI + Tailwind)
│   │   └── src/
│   │       ├── components/
│   │       │   ├── DaisyUI/      # Shared UI primitives (Input, Modal, etc.)
│   │       │   ├── BotManagement/
│   │       │   ├── MCP/
│   │       │   ├── ProviderConfiguration/
│   │       │   └── Settings/
│   │       ├── pages/            # Route-level components
│   │       ├── hooks/            # Custom React hooks
│   │       ├── services/         # apiService (REST calls)
│   │       └── types/            # Frontend-only types
│   ├── server/          # Express backend
│   │   ├── routes/       # REST endpoints
│   │   ├── services/     # Business logic (ConfigurationValidator, etc.)
│   │   └── middleware/   # Auth, rate limit, validation
│   ├── types/           # CANONICAL shared types — always import from here
│   │   ├── config.ts     # BotConfig, PlatformConfig, LlmProviderConfig
│   │   ├── mcp.ts        # MCPTool, MCPResource, MCPDescriptor
│   │   └── IProvider.ts  # LLM provider interface
│   ├── mcp/             # MCP server integration
│   ├── auth/            # Authentication logic
│   └── integrations/    # openwebui, flowise, etc.
├── packages/            # Monorepo adapters + providers
│   ├── adapter-discord/
│   ├── adapter-slack/
│   ├── adapter-mattermost/
│   ├── provider-openai/
│   ├── provider-flowise/
│   ├── provider-openwebui/
│   └── shared-types/    # Cross-package type contracts
├── tests/
│   ├── unit/            # Jest unit tests
│   ├── e2e/             # Playwright end-to-end tests
│   └── integration/
├── .github/workflows/   # CI/CD
├── netlify.toml         # Netlify build + redirect config
└── AGENTS.md            # This file
```

### Type Ownership Rule

**Always import from `src/types/` — never redefine locally.**

```typescript
// ✅ Correct
import { BotConfig, isBotConfig } from '../types/config';

// ❌ Wrong — creates divergence
interface BotConfig { name: string; ... }
```

---

## 2. Key Interfaces

### BotConfig (`src/types/config.ts`)
```typescript
interface BotConfig {
  name: string;
  messageProvider: string;  // 'discord' | 'slack' | 'mattermost' | ...
  llmProvider?: string;
  persona?: string;
  systemInstruction?: string;
  mcpGuardProfile?: string;
}
```

### LLM Provider (`src/types/IProvider.ts`)
All LLM packages implement:
```typescript
interface IProvider {
  generateResponse(prompt: string, context?: ChatMessage[]): Promise<LLMResponse>;
  getModels(): Promise<string[]>;
  testConnection(): Promise<boolean>;
}
```

### Monorepo Adapter Contract
Each `packages/adapter-*` must export:
```typescript
export class XAdapter implements MessageAdapter {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendMessage(channel: string, content: string): Promise<void>;
  onMessage(handler: (msg: IncomingMessage) => void): void;
}
```

### MCP Types (`src/types/mcp.ts`)
```typescript
interface MCPTool     { name: string; description: string; inputSchema: object; }
interface MCPResource { uri: string; name: string; mimeType?: string; }
```

---

## 3. DaisyUI Component Conventions

- All shared UI lives in `src/client/src/components/DaisyUI/`
- Always export from the barrel: `src/client/src/components/DaisyUI/index.ts`
- **Modals** must use native `<dialog>` + `showModal()` / `close()` — not `div.modal-open`
- **Form inputs** use `Input`, `Select`, `Textarea` wrappers — never raw `<input>`/`<select>`
- Error state: `variant="error"` on Input/Select; `textarea-error` class on textarea

---

## 4. Testing

### Unit tests (`tests/unit/` or `src/**/__tests__/`)
- Backend: **Jest** | Frontend: **Vitest**
- Cover: type guards, validators, utility functions, hook logic
- Min: happy path + null/empty input + error case

```bash
npm test                   # all unit tests
npx vitest run             # frontend only
```

### E2E tests (`tests/e2e/`)
- Framework: **Playwright**
- One spec file per feature domain, named `feature-name.spec.ts`

```bash
npm run test:e2e:playwright
npx playwright test tests/e2e/login.spec.ts   # single spec
npx playwright show-report
```

### Screenshot-as-Documentation

After any visible UI change, update `docs/screenshots/`:

```bash
npx playwright test tests/e2e/screenshot-*.spec.ts --update-snapshots
git add docs/screenshots/
git commit -m "docs(screenshots): update after <feature> change"
```

Screenshots are living documentation — include before/after in PR bodies.

---

## 5. API Contract

`src/openapi.ts` is the **single source of truth** for all REST routes and shapes.
When adding a route: define it in `openapi.ts` → implement in `src/server/routes/` → add frontend call in `src/client/src/services/api.ts`.

---

## 6. Validation Pattern (Guard-Driven)

- Validation runs **on blur and Enter** — not on every keystroke (prevents cursor-jump bugs)
- `commitInput()` tokenises and de-duplicates before calling `onChange`
- Guard profiles stored as comma-separated strings, rendered as chips
- Server-side guards: `src/server/middleware/formValidation.ts`

---

## 7. PR Iteration Workflow

The proven pattern for working alongside the Jules fleet:

```
Open PRs (N)
  ├─ Post scope-widening feedback on N-1  → tasks the fleet
  └─ Locally improve + squash-merge 1    → immediate progress
              ↓
  Fleet pushes improved commits
              ↓
  Review + batch squash-merge all
```

### Step 1 — List open PRs

```bash
gh pr list --state open --limit 30 \
  --json number,title,headRefName \
  --jq '.[] | "\(.number) \(.headRefName[:50]) — \(.title[:50])"' | sort -n
```

### Step 2 — Post feedback on N-1 PRs

```bash
cat > /tmp/fb_PRNUM.md << 'EOF'
## 🚀 Scope Widening Feedback

**Idea 1 — ...:** description
**Idea 2 — ...:** description
**Idea 3 — ...:** description

_Please broaden the changes and push — we want to merge the fullest version!_
EOF

gh pr comment PRNUM --body-file /tmp/fb_PRNUM.md
```

**Topic-aware ideas:**

| Area | Idea 1 | Idea 2 | Idea 3 |
|------|--------|--------|--------|
| Modal | Audit all `div.modal-open` → `<dialog>` | Focus trap Playwright test | Backdrop + Escape dismissal |
| Form/input | Audit raw `<input>` → DaisyUI wrappers | Blur-only validation | aria-describedby on errors |
| WebSocket | Exponential backoff reconnect | JSDoc on emit/on | useEffect cleanup |
| Types | Consolidate to `src/types/` | Zod type guard | Remove local duplicates |
| CI | `npm ci --dry-run` check | Lockfile integrity workflow | Document build strategy |
| Screenshots | `--update-snapshots` after UI change | Before/after in PR body | Playwright screenshot spec |

### Step 3 — Locally improve + squash-merge 1 PR

```bash
git checkout -B improve-PRNUM origin/BRANCH_NAME

# make improvements (tests, docs, fixes)...

git rebase origin/main --strategy-option=theirs
git push origin HEAD:BRANCH_NAME --force
gh pr merge PRNUM --squash --admin \
  --subject "fix(scope): description (#PRNUM)"
git checkout main && git pull origin main --ff-only
```

### Step 4 — Check if fleet responded

```bash
FEEDBACK_TIME="2026-03-05T01:40:00Z"   # time you posted feedback
gh pr list --state open --limit 30 \
  --json number,title,updatedAt \
  --jq --arg ft "$FEEDBACK_TIME" \
  '.[] | "\(.number) \(if .updatedAt > $ft then "✅ YES" else "⏳ no" end) \(.title[:50])"'
```

### Step 5 — Batch merge all fleet responses

```bash
python3 scripts/force_merge.py 2>&1
```

`scripts/force_merge.py` logic per PR:
1. Try direct admin squash-merge
2. If rejected: checkout → rebase `--theirs` → force-push → retry

### Scaling to fill the fleet (~30 concurrent Jules sessions)

When there are many open PRs, process in rolling batches:
- Post feedback on **all currently open PRs minus 1**
- Locally improve + merge that 1
- While fleet responds, fetch the **next batch** of new PRs and repeat
- Use `scripts/auto_improve_merge.py` as background watcher to catch new arrivals

The fleet can handle ~30 concurrent sessions — always keep the feedback queue saturated.

---

## 8. Automation Scripts

All scripts live in `scripts/` — tracked in git, portable, no hardcoded paths.

### `scripts/auto_improve_merge.py`
Continuous watcher. On each new Jules fleet PR: posts topic-aware feedback → rebases → squash-merges.

```bash
# From repo root:
python3 scripts/auto_improve_merge.py &
```

Exits after 30 idle rounds (~30 min with no new PRs).

### `scripts/force_merge.py`
Batch rebase + admin squash-merge all currently open PRs. Use after fleet responds to feedback.

```bash
python3 scripts/force_merge.py 2>&1
```

**Both scripts auto-detect `REPO_PATH` and `REPO`** via `git rev-parse` and `git remote get-url` — no hardcoded paths.

---

## 9. Netlify Deploy Strategy

Production deploys are **tag-triggered**, not branch-triggered.

```bash
git tag v1.2.3
git push origin v1.2.3
# → .github/workflows/netlify-tag-deploy.yml resets `release` branch to tag
# → Netlify auto-deploys from `release`
```

**One-time Netlify setup:** Site settings → Build & deploy → Production branch: `release`

---

## 10. Conventions

| Item | Convention |
|------|-----------|
| Commit style | `fix(scope):` / `feat(scope):` / `test(scope):` / `docs(scope):` |
| Squash merge title | `Original PR title (#PRNUM)` |
| PR body / comments | Always `--body-file`, never inline string (shell escaping) |
| Types | Always from `src/types/` — no local redefinitions |
| Modals | `<dialog>` + `showModal()` — never `div.modal-open` |
| Screenshots | Update `docs/screenshots/` after any visible UI change |
| Branch push | Always `--force-with-lease` or `--force` when rebasing |
| Main branch | Never push directly — always PR + squash merge |
| Scripts | Always in `scripts/` — never in `/tmp/` or home directory |

---

## 11. Anti-Patterns (Don't Do This)

Real sins observed and committed during development. Each one has bit us at least once.

### 🚫 1. Hardcoded absolute paths in scripts
```python
# ❌ Breaks on any other machine
REPO_PATH = "/mnt/models/open-hivemind"

# ✅ Portable
REPO_PATH = subprocess.check_output(
    ["git", "rev-parse", "--show-toplevel"], text=True
).strip()
```

### 🚫 2. Duplicate imports after patch edits
When patching a file, always check for existing imports before adding new ones.
```python
# ❌ Left by a patch that added portable paths
import subprocess, json, time, os
import subprocess as _sp, os as _os   # duplicate!

# ✅ One import block, consistent aliases
import subprocess, json, time, os, re
```

### 🚫 3. Scratch/debug files committed to main
Files like `scratch.js`, `patch.js`, `update-discord.js`, `verify.py` have all landed in `main` via unreviewed PRs.
- Add these patterns to `.gitignore`: `scratch*.js`, `patch.js`, `debug-*.py`
- Always check `git ls-files | grep -E "scratch|patch|debug"` before merging a batch

### 🚫 4. Pushing directly to main
```bash
# ❌ Skips review, breaks linear PR history
git push origin main

# ✅ Always via PR
git push origin HEAD:my-branch
gh pr create ... && gh pr merge ... --squash --admin
```
Every commit to main should have a PR number in its subject line.

### 🚫 5. Blind `--theirs` during rebase
`--strategy-option=theirs` silently discards the branch's changes in conflicts. Only use it for binary files (images, lock files) or when you've explicitly decided the branch content is wrong.
```bash
# ❌ Silently drops branch changes
git rebase origin/main --strategy-option=theirs

# ✅ Resolve conflicts explicitly; use --theirs only for specific files
git checkout --theirs -- package-lock.json
git checkout --theirs -- "docs/screenshots/*.png"
git add -u
```

### 🚫 6. Not validating empty `gh` API responses
`gh pr list` returns empty stdout (not an error) when rate-limited or auth fails. Treating empty as "0 PRs" causes silent failures.
```bash
# ✅ Always check for empty + error
OUT=$(gh pr list --state open --limit 30 --json number --jq 'length' 2>&1)
if [ -z "$OUT" ] || echo "$OUT" | grep -q "error\|rate\|auth"; then
  echo "gh API error: $OUT" >&2; exit 1
fi
```

### 🚫 7. Non-persisted state in long-running scripts
The `SEEN` set in `auto_improve_merge.py` is lost on restart — the script will re-post feedback to every open PR.
```python
# ✅ Persist seen PRs to a temp file
SEEN_FILE = os.path.join(REPO_PATH, ".seen_prs.json")
SEEN = set(json.load(open(SEEN_FILE)) if os.path.exists(SEEN_FILE) else [])
# ... on exit: json.dump(list(SEEN), open(SEEN_FILE, "w"))
```

### 🚫 8. Scripts written outside the repo
Scripts in `/tmp/` or `~/` are lost on git checkout or machine restart.
Always write automation scripts to `scripts/` and commit them.

### 🚫 9. `.gitignore` yo-yo
Adding a file, removing it from gitignore, committing it, then removing it again creates noisy history.
**Check `.gitignore` before `git add`:**
```bash
git check-ignore -v FILENAME   # shows which rule matches, if any
```

### 🚫 10. Merging feedback + merge in the same pass without waiting
Posting scope-widening feedback and then immediately rebasing + merging the PR defeats the purpose — the fleet never gets to act on the feedback.
**Correct pattern:** post feedback → locally merge 1 PR → wait for fleet → then batch-merge responses.
