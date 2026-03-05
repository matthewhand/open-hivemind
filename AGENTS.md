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
python3 force_merge.py 2>&1
```

`force_merge.py` logic per PR:
1. Try direct admin squash-merge
2. If rejected: checkout → rebase `--theirs` → force-push → retry

---

## 8. Automation Scripts

### `auto_improve_merge.py`
Continuous watcher. On each new Jules fleet PR: posts feedback → rebases → squash-merges.

```bash
python3 auto_improve_merge.py &
```

Exits after 30 idle rounds (~30 min).

### `force_merge.py`
Batch rebase + admin squash-merge all currently open PRs.

```bash
python3 force_merge.py 2>&1
```

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
