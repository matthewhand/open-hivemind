# Open Hivemind — Roadmap

> Status as of **2026-06-10**, derived from a per-feature code audit
> ([docs/FEATURE_STATUS.md](docs/FEATURE_STATUS.md)) re-verified row-by-row against `main`,
> a full git-history review, a dead-code reachability audit, and a mock-data route audit.
> Statuses reflect what the code actually does, not aspirations.
> `[x]` = verified working in code. Nested items show partial progress.

**Snapshot:** ~232 features complete · ~44 partial · ~20 stubs · 0 known-broken.
The platform core (multi-bot Discord/Slack/Mattermost, OpenAI/Flowise/Letta/OpenSwarm/OpenWebUI
LLM providers, 5-stage message pipeline, persona system, guard profiles, MCP tool execution
with HITL approval, SQLite/Postgres persistence, WebUI admin with 35+ pages, TOTP 2FA,
account lockout, session management, audit logging) is **shipped and verified**.

---

## 🔜 Now — quick wins (hours each)

Small, verified gaps where the surrounding feature is otherwise done.

- [ ] **Monitoring wiring**
  - [x] Start `AnomalyDetectionService` periodic loop (instantiated but `.start()` never called — `initServices.ts`)
  - [x] Bridge `pipeline:decision` bus events to the `pipeline_decision` WS event (ActivityPage listener never fires — `BroadcastService`)
  - [x] Call `shouldPause()` from Enrich/Inference/Send stages (pipeline debugger only pauses in DecisionStage)
  - [x] Wire `MetricsCollector.incrementMessages/recordResponseTime` from the real pipeline (currently only the demo simulator feeds it)
- [ ] **WebUI honesty**
  - [x] Remove fake `hivemind-plugin-weather` sample from marketplace route (leaks into real provider pages)
  - [x] Gate or implement Provider Health page (currently 100% fabricated SLO numbers in primary nav)
  - [x] Fix hot-reload path mismatch (client calls `/api/config/hot-reload/*`; backend mounts `/api/hot-reload`)
- [ ] **Guards / personas**
  - [x] Persist semantic-guard fields through guard-profile CRUD (sanitizer drops them on edit)
  - [x] Reconcile legacy `/api/agents/personas` store with `PersonaManager` (legacy store removed; `/api/personas` is canonical)
- [ ] **Messaging small fixes**
  - [x] Mattermost `getChannelOwnerId` (fetches channel info but never reads `creator_id`)
  - [x] Mattermost typing indicator via WebSocket channel (REST fallback when the WS is not open)
- [ ] **LLM routing small fixes**
  - [x] Allow OpenWebUI non-chat completion in `taskLlmRouter` (provider supports it; router throws)
  - [x] Accept implemented providers (flowise/letta/openwebui/openswarm) in the model-catalog route (static catalog 400s on them)
- [ ] **MCP small fixes**
  - [x] Add backends for MCPToolsPage's `GET /tools/preferences`, `POST /tools/history`, `POST /tools/:id/toggle` (UI calls them; silently caught)
- [ ] **Memory small fixes**
  - [x] Extend memory provider smoke test with `updateMemory` step (now exists for Postgres)
  - [x] Surface memory failures (currently silently debug-swallowed; add metric/log signal)

## 🚧 Next — medium items (days each)

- [ ] **Messaging platform completion**
  - [ ] Telegram: add to the messenger bootstrap load list (provider exists; never loaded) and implement receive (long-poll or webhook — currently send-only stub)
  - [x] Webhook messenger: implement real outgoing HTTP POST (returns fake id today); add to load list
  - [ ] Slack interactive actions: replace canned course-info demo handlers with generic action dispatch
  - [x] Mattermost: hot `addBot` into the running service (currently requires re-init)
  - [ ] Channel routing: extend `pickBestChannel` beyond Discord; decide default for `MESSAGE_CHANNEL_ROUTER_ENABLED`
- [ ] **LLM provider depth**
  - [x] OpenWebUI: preserve assistant roles in history (all turns sent as `user` today); honor per-bot config in `create()`
  - [ ] OpenWebUI knowledge-file RAG: per-bot/runtime knowledge upload (single startup file today)
  - [ ] Streaming for providers beyond OpenAI (only `llm-openai` implements `generateStreamingChatCompletion`)
- [ ] **Memory depth**
  - [ ] MemVault durable store (in-memory only; Postgres/pgvector store deferred)
  - [ ] Wire `ConversationSummaryService` into the pipeline (zero callers today)
- [ ] **MCP**
  - [ ] Auto-connect bot-assigned MCP servers at startup (only admin routes connect today)
  - [ ] Support non-stdio MCP server URLs in `/api/mcp/servers` connect path (stdio:// only)
- [ ] **Monitoring truth**
  - [x] Replace `mockSpans` + `Math.random()` bot stats in MonitoringDashboard with real data
  - [x] Implement `/api/activity/messages` and `/llm-usage` (return `[]` today) and real `/chart-data` (random series today)
  - [ ] Persist per-step pipeline telemetry for Message Flow Replay (UI infers steps today)
  - [ ] Feed the 7 deferred BusinessKpi metrics (cost/retention/churn/availability) or hide them
- [ ] **Auth/persistence robustness**
  - [ ] Durable refresh-token allow-list (in-memory Set; lost on restart, not multi-instance safe)
  - [ ] Widen `auditMiddleware` beyond config routers; persist the `enableAuditLogging` settings toggle
  - [x] Configurable CORS origins (`CORS_ORIGIN`/`CORS_ALLOWED_ORIGINS` env + stored `cors.origins` setting; localhost always allowed; `*` = allow-all without credentials)
  - [ ] Transactional config-backup restore; validation on main-config import
  - [ ] Harden `postgresWrapper.translateSql` (self-admittedly naive)
  - [ ] Persist scheduled bot tasks (`loadTasks()` is an empty stub — in-memory only)
  - [ ] Webhook scheduled messages: durable store + delivery scheduler (in-memory Map, never delivered)
- [ ] **Webhook events**
  - [x] Call `recordWebhookEvent()` from the ingress handlers + real retry re-dispatch (nav entry added)

## 🔭 Later — large items (weeks / needs design)

- [ ] **Pipeline/legacy parity, then sunset** — content filter, semantic guardrails, command handling, and maintenance mode live only in the legacy path; port them to pipeline stages, then remove `USE_LEGACY_HANDLER` and the legacy monolith
- [ ] **Unify the 3 (4 with `packages/tool-mcp`) parallel MCP connection stores** — `MCPService.clients`, `serverLifecycle` processes, `shared.ts` `connectedClients`, `McpToolProvider` never share state
- [ ] **Discord voice** — STT landed (Whisper, #2844) but `voiceChannelManager` join/leave is a no-op stub; restore voice-channel support or remove the UI affordances
- [ ] **Live Chat Monitor revival** — `/admin/chat` page was removed as dead code (depended on deleted `useProvidersCache`); PR #3025 fixed and re-registered it — restore from `e4e57d6d9` with its dependency chain if the feature is wanted
- [ ] **Vision (image input) support** — stub across providers
- [ ] **`transfer_to_bot` swarm-routing tool** — canned no-op today

## 🧹 Tech-debt decisions (each needs a yes/no, then ~a day)

- [x] `ProviderRegistry` scans a directory that no longer exists (always finds 0) — repointed at SyncProviderRegistry + PluginLoader
- [ ] Two parallel auth middlewares guard different route subsets (`src/auth/middleware.ts` vs `src/server/middleware/auth.ts`) — consolidate (security-review hazard)
- [x] Dead zustand stores alongside Redux (only `uiStore` is used) — deleted the rest
- [ ] Logger sprawl (7+ logger modules) — pick `@hivemind/shared-types` logger + `src/common/logger.ts`, migrate the rest
- [x] `WebSocketContext.tsx` imports a type from a nonexistent path (survives only because esbuild erases type imports) — fixed the import; dead `src/webui/` deleted
- [ ] Deploy-target thrash: `src/netlify/` stub app, `vercel.json`, `netlify.toml`, `fly.toml`, `pinokio.js`, `build:serverless` (copies a nonexistent file) — pick supported targets (Docker + bare node), delete the rest
- [ ] `package.json` `bin` + `_moduleAliases` point at unmaintained `dist/` — remove or replace with a tsx launcher
- [x] Feature-flag tables duplicated inside `startupDiagnostics.ts` and drifting from CLAUDE.md — merged into one `FEATURE_FLAGS` constant
- [ ] ~96 "test-only" modules (unreachable from entrypoints, kept green by unit tests — e.g. `AlertManager`, `HealthChecker`, `ConfigExporter/Importer`, `AnalyticsCalculator`) — per module: wire in or delete with its tests
- [ ] Alternate DI schema system (SchemaManager/ConnectionManager) intentionally off the live path — adopt or remove

## 🪦 Abandoned arcs (decide: revive or delete)

- [ ] **Enterprise multi-tenancy / RBAC** — 7 commits in Sep 2025, then silence; client code already purged; mock route removed. Decide if multi-tenancy is in scope at all
- [ ] **Python executor** — the project's founding feature (2023); survives only as a placeholder handler
- [ ] **Quivr / Zep memory handlers** — last touched Sep 2024

## 📦 FOSS release checklist

- [x] LICENSE (MIT) + licensing audit (one properly-attributed MIT vendored file; no GPL)
- [x] SECURITY.md with private vulnerability reporting
- [x] Document security-sensitive env flags in `.env.sample` (`ALLOW_TEST_BYPASS`, `DISABLE_ENCRYPTION`, `DISABLE_QUOTA`); comment out `ALLOW_LOCALHOST_ADMIN`
- [x] ROADMAP.md exists (this file — fixes the dangling README link)
- [x] Remove foreign/vestigial code (Python app at root, 155-file dead-code sweep, 19 unused deps)
- [ ] `package.json` metadata: real description, `repository`/`homepage`/`bugs`, keywords, un-obfuscated author, drop `dist/` bin
- [ ] Add `"license": "MIT"` to the 14 workspace packages missing it
- [ ] Rewrite CONTRIBUTING.md for external contributors (currently internal notes with broken references)
- [ ] docs/ sweep: archive ~14 one-off session reports + `docs/reports/` (13 files); merge the 4 mergeable ones
- [ ] CHANGELOG: cut a `1.0.0` section at release
- [ ] `.github/`: issue templates, PR template, CODE_OF_CONDUCT.md
- [ ] Implement or remove the `audit:secrets` stub script
- [ ] Verify the Docker Hub image + fix the badge link; reconcile Pinokio URLs
- [ ] Fold or delete ANNOUNCEMENT.md; move TEST_STRATEGY.md / TIPS.md into docs/

## ✅ E2E verification (the "confirm every feature via user stories" effort)

- [x] Journey-spec architecture: page objects, auth fixtures, `completeCreateBotWizard()` helper
- [x] `full-journey-auth-to-bot`, `full-journey-database-ops`, `full-journey-export-import` green (7/7)
- [x] Convert remaining journey specs to current UI (15/17 tests green)
  - [x] `bot-lifecycle` "creation to messaging flow" (fixed: wizard submitted profile label as llmProvider — CreateBotWizard `value: p.key`)
  - [x] `llm-integration` "add OpenAI provider and configure with bot" (fixed: validation accepts LLM profile keys; 4xx no longer masked as 500)
- [x] Run the full journey suite in CI (dedicated `journeys` job in playwright.yml)
- [x] Story-driven User Guide with auto-captured demo-data screenshots (`npm run test:journey:guide`, journey-01..11)
- [ ] Periodic axe-core WCAG audit + screenshot-doc regeneration cadence
