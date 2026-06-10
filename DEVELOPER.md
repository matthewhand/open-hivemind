# Developer Guide

Technical orientation for contributors. For contribution process and etiquette see
[CONTRIBUTING.md](CONTRIBUTING.md); for what the product does see the
[README](README.md) and [User Guide](docs/USER_GUIDE.md).

## Stack at a glance

Ordered by significance — languages first, then runtime/frameworks, then major libraries.

| Layer | Technology | Where / notes |
|---|---|---|
| Language | **TypeScript** (strict) | Entire codebase — server, client, and all workspace packages |
| Runtime | **Node.js ≥ 22** | Executed directly via `tsx` in development; no maintained `dist/` |
| Backend framework | **Express 4** | HTTP server, REST API (`src/server/`), session & auth middleware |
| Frontend framework | **React 19** | Admin WebUI single-page app (`src/client/`) |
| Build / dev server | **Vite 7** | Client build + hot-reload middleware mounted inside the server process |
| Styling / UI kit | **Tailwind CSS 4 + DaisyUI 5** | All WebUI components |
| Monorepo tooling | **pnpm workspaces** | 16 packages under `packages/*` (`@hivemind/*`) + `src/client` |
| State management | **Redux Toolkit** (primary), **zustand** (`uiStore` only) | `src/client/src/store/` |
| Persistence | **SQLite** via `better-sqlite3` (default), **PostgreSQL** via `pg` (optional) | `src/database/`, umzug-style migrations in `src/database/migrations/` |
| Realtime | **Socket.IO** | WebSocket events to the WebUI (activity feed, pipeline events) |
| Messenger SDKs | **discord.js 14**, Slack Web API, Mattermost REST/WS, Telegram Bot API (plain `fetch`) | `packages/message-*` / `packages/adapter-*` |
| LLM / tools | **@modelcontextprotocol/sdk** (MCP, stdio/HTTP/SSE), provider clients for OpenAI, Flowise, OpenWebUI, Letta, OpenSwarm | `packages/llm-*`, `src/mcp/` |
| Configuration | **convict** | Schema-validated config (`config/`, `src/config/`), env-overridable |
| Testing | **Jest 29** (server unit/integration), **Vitest 3** (client), **Playwright** (e2e + screenshot capture) | `tests/`, `src/client/src/**/__tests__`, `tests/e2e/` |

## Day-to-day commands

| Task | Command |
|---|---|
| Run the app (server + WebUI hot reload) | `npm run dev` — wait for `🎉 Open Hivemind Server startup complete!` |
| Type-check | `npm run check-types` |
| Server tests | `npm test -- <pattern>` (jest, serial) |
| Client tests | `cd src/client && npx vitest run` |
| E2E (smoke/journeys) | `npx playwright test --grep "smoke\|core-pages" --project=chromium` |
| Regenerate guide screenshots | `npm run test:journey:guide` |
| Lint + warning gate (CI-enforced) | `npm run lint:json && node scripts/ci/eslint-warning-gate.js` |

Important conventions live in [CLAUDE.md](CLAUDE.md) (feature flags, env vars,
screenshot rules) — they apply to humans too.

## Architecture in one paragraph

A single Node process hosts the Express API + WebUI and a fleet of bot instances.
Messenger services (Discord/Slack/Mattermost/Telegram/Webhook) receive platform
events and feed a 5-stage message pipeline (Receive → Decision → Enrich →
Inference → Send) that consults personas, guard profiles, memory providers, and
MCP tools before replying through the originating platform. Configuration comes
from convict schemas + the WebUI (persisted via SQLite); everything is
observable through the activity feed, metrics, and pipeline traces. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the full picture.
