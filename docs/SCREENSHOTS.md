# Screenshot Index

A single tracking index of **every screenshot in the repository** — both the current set in
[`docs/screenshots/`](screenshots/) and the previous versions in [`archive/screenshots/`](../archive/screenshots/).

- **Regeneration:** the `journey-01…11` set is regenerated with `npm run test:journey:guide`
  (demo-mode data, Playwright); `hivemind-showcase.png` with `npm run test:journey:showcase`;
  other screenshots come from `tests/e2e/screenshot-*.spec.ts` via `npm run generate-docs`.
- **Convention:** naming and archival rules (plain kebab-case, current vs. archived directories,
  no suffixes) are documented in [CLAUDE.md](../CLAUDE.md).
- **"Used by"** is determined by grepping these docs for each filename:
  [USER_GUIDE.md](USER_GUIDE.md), [GUIDED_TOUR.md](GUIDED_TOUR.md),
  [docs/screenshots/README.md](screenshots/README.md),
  [archive/screenshots/README.md](../archive/screenshots/README.md), and the root
  [README.md](../README.md).

Non-image files in `docs/screenshots/` not tracked below: `index.html`, `mcp-tools-testing.txt`, `README.md`.

## Current screenshots (`docs/screenshots/`)

| Filename | Location | Used by | Description |
|---|---|---|---|
| `activity-monitor.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Real-time activity monitor showing live system events |
| `activity-page-filters.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Activity page with filter controls applied |
| `activity-page.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | Activity page overview with event timeline |
| `admin-health-page.png` | current | USER_GUIDE.md, docs/screenshots/README.md | System health page with service status overview |
| `ai-assist-button.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | AI assist button component |
| `ai-button-hover-full.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | AI button hover state (full context) |
| `ai-button-hover.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | AI button hover state |
| `ai-button-loading.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | AI button loading/spinner state |
| `analytics-dashboard.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Analytics dashboard with bot performance metrics |
| `api-docs-page.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Interactive API documentation page |
| `api-rate-limit.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | API rate limiting configuration |
| `audit-governance-filtered.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Audit and governance page with filters applied |
| `audit-governance-initial.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Audit and governance page in initial state |
| `backup-retention-baseline.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | Backup retention settings in baseline state |
| `backup-retention-enforced.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | Backup retention with enforcement policy active |
| `bot-create-page.png` | current | USER_GUIDE.md, docs/screenshots/README.md, archive/screenshots/README.md | Bot creation page |
| `bot-create-validation.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | Bot creation form showing validation errors |
| `bot-details-modal.png` | current | USER_GUIDE.md, docs/screenshots/README.md, archive/screenshots/README.md | Bot details modal with configuration summary |
| `bot-search-filtered.png` | current | docs/screenshots/README.md | Bots page with search filter applied |
| `bot-templates-page.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Bot templates page for quick bot creation |
| `bot-wizard-validation.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | Bot creation wizard showing validation state |
| `bots-page.png` | current | USER_GUIDE.md, docs/screenshots/README.md, archive/screenshots/README.md | Main bots listing page |
| `button-loading-after-light.png` | current | none | Button loading state after fix, light theme variant |
| `button-loading-real-app.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | Button loading state in production context |
| `button-loading.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | Generic button loading state |
| `chat-monitor.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Chat monitoring view for live message tracking |
| `chatpage-latency.png` | current | docs/screenshots/README.md | Chat page showing latency indicators |
| `chatpage-offline.png` | current | docs/screenshots/README.md | Chat page in offline/disconnected state |
| `chatpage-optimistic.png` | current | docs/screenshots/README.md | Chat page with optimistic message sending |
| `chatpage-rollback.png` | current | docs/screenshots/README.md | Chat page showing message rollback after failure |
| `clone-bot-modal.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Modal dialog for cloning an existing bot |
| `command-palette-search.png` | current | USER_GUIDE.md | Command palette with a search query filtering results |
| `command-palette.png` | current | USER_GUIDE.md | Command palette overlay (Ctrl+K) with navigation results |
| `config-rollback-available.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | Configuration rollback with available restore points |
| `config-rollback-empty.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | Configuration rollback page with no restore points |
| `config-rollback-modal.png` | current | docs/screenshots/README.md | Configuration rollback confirmation modal |
| `config-rollback-success.png` | current | docs/screenshots/README.md | Configuration rollback success state |
| `config-test-helper.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | Configuration test helper utility |
| `configuration.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Main configuration page |
| `create-backup-modal.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Modal for creating a configuration backup |
| `create-bot-modal.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | Modal dialog for creating a new bot |
| `demo-mode-banner.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Demo mode banner indicating the app is running in demonstration mode |
| `demo-mode-dashboard.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Dashboard view while running in demo mode |
| `distributed-trace-waterfall.png` | current | docs/screenshots/README.md | Distributed tracing waterfall view for request debugging |
| `env-sample-completeness.png` | current | docs/screenshots/README.md | Environment sample file completeness check |
| `export-page.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Data export page |
| `guard-profiles-coverage.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | Guard profiles coverage report |
| `guards-concurrent-test.png` | current | none | Guards page state during a concurrent guard test |
| `guards-modal-enhanced.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | Enhanced guards modal with additional options |
| `guards-modal.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Guards configuration modal |
| `guards-page.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Guards page with guardrail profiles |
| `health-dashboard.png` | current | none | Health dashboard view with service status |
| `help-page-expanded.png` | current | USER_GUIDE.md | Help & FAQ page with a section expanded |
| `help-page.png` | current | USER_GUIDE.md | Help & FAQ main page |
| `hivemind-showcase.png` | current | README.md (root), GUIDED_TOUR.md, docs/screenshots/README.md | Multiple AI personas (SupportBot + DevOpsBot) answering one user in one channel — selective engagement in the Activity page's Conversations view |
| `integrations-llm.png` | current | USER_GUIDE.md, docs/screenshots/README.md | LLM integrations overview panel |
| `journey-01-onboarding.png` | current | USER_GUIDE.md, GUIDED_TOUR.md, docs/screenshots/README.md, archive/screenshots/README.md | The admin dashboard after first sign-in. |
| `journey-02-discord-add.png` | current | USER_GUIDE.md, GUIDED_TOUR.md, docs/screenshots/README.md, archive/screenshots/README.md | The Message Providers page after creating a Discord profile. |
| `journey-03-openai-add.png` | current | USER_GUIDE.md, GUIDED_TOUR.md, docs/screenshots/README.md, archive/screenshots/README.md | The LLM Providers page after creating an OpenAI profile. |
| `journey-04-bot-create.png` | current | USER_GUIDE.md, GUIDED_TOUR.md, docs/screenshots/README.md, archive/screenshots/README.md | The Bots page after wiring a bot to Discord + OpenAI. |
| `journey-05-bot-chat.png` | current | USER_GUIDE.md, GUIDED_TOUR.md, docs/screenshots/README.md, archive/screenshots/README.md | The bot detail drawer open on the Test Drive tab after exchanging a message. |
| `journey-06-activity.png` | current | USER_GUIDE.md, GUIDED_TOUR.md, docs/screenshots/README.md, archive/screenshots/README.md | The Activity page rendering after the exchange. |
| `journey-07-personas.png` | current | USER_GUIDE.md, GUIDED_TOUR.md, docs/screenshots/README.md | The Personas library with the demo persona presets. |
| `journey-08-guards.png` | current | USER_GUIDE.md, GUIDED_TOUR.md, docs/screenshots/README.md | The Guards page with guard profiles (rate limit, content filter, tool access). |
| `journey-09-memory.png` | current | USER_GUIDE.md, GUIDED_TOUR.md, docs/screenshots/README.md | The Memory Providers configuration page. |
| `journey-10-monitoring.png` | current | USER_GUIDE.md, GUIDED_TOUR.md, docs/screenshots/README.md | The monitoring view with demo-mode metrics. |
| `journey-11-export.png` | current | USER_GUIDE.md, GUIDED_TOUR.md, docs/screenshots/README.md | The configuration Export page. |
| `letta-cloud-config.png` | current | none | Letta cloud provider configuration form |
| `letta-localhost-health.png` | current | none | Letta localhost provider health check result |
| `letta-provider-list.png` | current | docs/screenshots/README.md | Letta provider instances list |
| `letta-provider-selection.png` | current | docs/screenshots/README.md | Letta provider selection interface |
| `llm-add-profile-modal.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Modal for adding a new LLM profile |
| `llm-add-profile-ollama-modal.png` | current | docs/screenshots/README.md | Modal for adding an Ollama LLM profile |
| `llm-providers-list.png` | current | USER_GUIDE.md, docs/screenshots/README.md | LLM providers list page |
| `marketplace-install-modal.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Plugin installation modal |
| `marketplace-page.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Plugin marketplace page |
| `mcp-add-server-modal.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Modal for adding a new MCP server |
| `mcp-guard-ux.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | MCP guard UX for tool usage controls |
| `mcp-servers-list.png` | current | USER_GUIDE.md, docs/screenshots/README.md | MCP servers list page |
| `mcp-tool-run-modal.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Modal for running an MCP tool |
| `mcp-tools-list.png` | current | USER_GUIDE.md, docs/screenshots/README.md | MCP tools list view |
| `mcp-tools-modal.png` | current | docs/screenshots/README.md | MCP tools detail modal |
| `memory-providers-list.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Memory providers list page (Redis, Pinecone, etc.) |
| `message-add-provider-modal.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Modal for adding a new message provider |
| `message-providers-list.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Message providers list page |
| `monitoring-dashboard.png` | current | USER_GUIDE.md, docs/screenshots/README.md | System monitoring dashboard with health metrics |
| `onboarding-page.png` | current | USER_GUIDE.md, docs/screenshots/README.md | First-run onboarding flow for new users |
| `openwebui.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | OpenWebUI provider configuration |
| `pagination-accessible.png` | current | docs/screenshots/README.md | Pagination with accessibility enhancements |
| `pagination-after-accessible.png` | current | none | Reworked pagination with accessibility enhancements |
| `pagination-after.png` | current | none | Pagination component after rework |
| `pagination.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | Pagination component |
| `personas-page.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Personas management page |
| `plugin-security-dashboard.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Plugin security dashboard |
| `plugin-security-filtered.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Plugin security dashboard with filters applied |
| `providers-api-memory.png` | current | none | Memory providers page backed by live providers API |
| `providers-api-tool.png` | current | none | Tool providers page backed by live providers API |
| `response-profile-add-modal.png` | current | USER_GUIDE.md | Modal for adding a response profile |
| `response-profile-edit-modal.png` | current | none | Modal for editing an existing response profile |
| `response-profiles-list.png` | current | USER_GUIDE.md | Response profiles list page |
| `settings-general-loading.png` | current | USER_GUIDE.md, docs/screenshots/README.md | General settings page in loading state |
| `settings-general.png` | current | USER_GUIDE.md, docs/screenshots/README.md | General settings page |
| `settings-messaging-debug.png` | current | docs/screenshots/README.md | Messaging settings with debug mode |
| `settings-messaging.png` | current | docs/screenshots/README.md | Messaging settings page |
| `settings-security.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | Security settings page |
| `showcase-page.png` | current | docs/screenshots/README.md | DaisyUI component showcase page |
| `sitemap-page.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Initial loading splash shown before the sitemap renders — filename is misleading; image needs re-shooting (see docs/screenshots/README.md) |
| `specs-action-clicked.png` | current | none | Specifications page after clicking an action |
| `specs-baseline.png` | current | none | Specifications page baseline state |
| `specs-detail-page.png` | current | USER_GUIDE.md | Specification detail view rendered in Markdown |
| `specs-page.png` | current | USER_GUIDE.md, docs/screenshots/README.md | OpenAPI/spec catalog page |
| `static-pages.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Static pages overview |
| `system-management-config-tab.png` | current | docs/screenshots/README.md | System management configuration tab |
| `system-management-page.png` | current | USER_GUIDE.md, docs/screenshots/README.md | System management full page |
| `system-management.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | System management overview |
| `template-version-diff-viewer.png` | current | docs/screenshots/README.md | Template version diff viewer for comparing configs |
| `tool-providers-list.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Tool providers list page (GitHub, Jira, Google Search, etc.) |
| `tts-supertonic-ready.png` | current | docs/screenshots/README.md | The Voice [Experimental] settings tab with the Supertonic engine loaded and ready (WASM backend shown). |
| `verification-bots-search.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | Bot search verification view |
| `verification-personas-copy.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | Persona copy verification |
| `verification-personas.png` | current | docs/screenshots/README.md, archive/screenshots/README.md | Persona verification view |
| `webhook-integration.png` | current | USER_GUIDE.md, docs/screenshots/README.md | Webhook integration configuration |
| `widget-after-removal.png` | current | none | Widget dashboard after removing a widget |
| `widget-after-reset.png` | current | none | Widget dashboard after layout reset |
| `widget-dashboard.png` | current | docs/screenshots/README.md | Widget-driven dashboard layout with rearrangeable tiles |
| `widget-edit-mode.png` | current | none | Widget dashboard in edit mode |
| `widget-empty-state.png` | current | none | Widget dashboard empty state |
| `widget-palette.png` | current | none | Widget palette for adding dashboard tiles |
| `widget-three-added.png` | current | none | Widget dashboard with three widgets added |

## Archived screenshots (`archive/screenshots/`)

> Note: "Used by" matches are by filename. For archived files, a match in USER_GUIDE.md / GUIDED_TOUR.md / docs/screenshots/README.md actually refers to the **current** counterpart in `docs/screenshots/` (those docs embed `screenshots/<name>` paths); the only doc that indexes the archive copies themselves is `archive/screenshots/README.md`.

| Filename | Location | Used by | Description |
|---|---|---|---|
| `activity-page.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | Activity page (previous version) |
| `ai-assist-button.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | AI assist button (previous version) |
| `ai-button-hover-full.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | AI button hover full context (previous version) |
| `ai-button-hover.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | AI button hover state (previous version) |
| `ai-button-loading.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | AI button loading state (previous version) |
| `analytics-dashboard.png` | archived | USER_GUIDE.md, docs/screenshots/README.md | Analytics dashboard with bot performance metrics |
| `api-rate-limit.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | API rate limiting (previous version) |
| `backup-retention-baseline.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | Backup retention baseline (previous version) |
| `backup-retention-enforced.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | Backup retention enforced (previous version) |
| `bot-create-page.png` | archived | USER_GUIDE.md, docs/screenshots/README.md, archive/screenshots/README.md | Bot creation page (previous version) |
| `bot-create-validation.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | Bot creation validation (previous version) |
| `bot-details-modal.png` | archived | USER_GUIDE.md, docs/screenshots/README.md, archive/screenshots/README.md | Bot details modal (previous version) |
| `bot-wizard-validation.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | Bot wizard validation (previous version) |
| `bots-page.png` | archived | USER_GUIDE.md, docs/screenshots/README.md, archive/screenshots/README.md | Bots page (previous version) |
| `button-loading-real-app.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | Button loading in production (previous version) |
| `button-loading.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | Button loading state (previous version) |
| `config-rollback-available.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | Config rollback available (previous version) |
| `config-rollback-empty.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | Config rollback empty (previous version) |
| `config-test-helper.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | Config test helper (previous version) |
| `create-bot-modal.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | Create bot modal (previous version) |
| `guard-profiles-coverage.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | Guard profiles coverage (previous version) |
| `guards-modal-enhanced.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | Enhanced guards modal (previous version) |
| `journey-01-onboarding.png` | archived | USER_GUIDE.md, GUIDED_TOUR.md, docs/screenshots/README.md, archive/screenshots/README.md | Golden-journey onboarding step (previous version) |
| `journey-02-discord-add.png` | archived | USER_GUIDE.md, GUIDED_TOUR.md, docs/screenshots/README.md, archive/screenshots/README.md | Golden-journey Discord-add step (previous version) |
| `journey-03-openai-add.png` | archived | USER_GUIDE.md, GUIDED_TOUR.md, docs/screenshots/README.md, archive/screenshots/README.md | Golden-journey OpenAI-add step (previous version) |
| `journey-04-bot-create.png` | archived | USER_GUIDE.md, GUIDED_TOUR.md, docs/screenshots/README.md, archive/screenshots/README.md | Golden-journey bot-create step (previous version) |
| `journey-05-bot-chat.png` | archived | USER_GUIDE.md, GUIDED_TOUR.md, docs/screenshots/README.md, archive/screenshots/README.md | Golden-journey bot-chat step (previous version) |
| `journey-06-activity.png` | archived | USER_GUIDE.md, GUIDED_TOUR.md, docs/screenshots/README.md, archive/screenshots/README.md | Golden-journey activity step (previous version) |
| `mcp-guard-ux.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | MCP guard UX (previous version) |
| `openwebui.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | OpenWebUI configuration (previous version) |
| `pagination-expanded-scope.png` | archived | archive/screenshots/README.md | Pagination expanded scope (previous version) |
| `pagination.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | Pagination component (previous version) |
| `settings-security.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | Security settings (previous version) |
| `system-management.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | System management (previous version) |
| `verification-bots-search.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | Bot search verification (previous version) |
| `verification-personas-copy.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | Persona copy verification (previous version) |
| `verification-personas.png` | archived | docs/screenshots/README.md, archive/screenshots/README.md | Persona verification (previous version) |
| `widget-overlap-bug.png` | archived | none | Widget dashboard overlap rendering bug (archived bug evidence) |

## Findings

### Orphans (referenced by no checked doc)

Current set (18):

- `docs/screenshots/button-loading-after-light.png`
- `docs/screenshots/guards-concurrent-test.png`
- `docs/screenshots/health-dashboard.png`
- `docs/screenshots/letta-cloud-config.png`
- `docs/screenshots/letta-localhost-health.png`
- `docs/screenshots/pagination-after-accessible.png`
- `docs/screenshots/pagination-after.png`
- `docs/screenshots/providers-api-memory.png`
- `docs/screenshots/providers-api-tool.png`
- `docs/screenshots/response-profile-edit-modal.png`
- `docs/screenshots/specs-action-clicked.png`
- `docs/screenshots/specs-baseline.png`
- `docs/screenshots/widget-after-removal.png`
- `docs/screenshots/widget-after-reset.png`
- `docs/screenshots/widget-edit-mode.png`
- `docs/screenshots/widget-empty-state.png`
- `docs/screenshots/widget-palette.png`
- `docs/screenshots/widget-three-added.png`

Archived set (1):

- `archive/screenshots/widget-overlap-bug.png`

Orphans are candidates for either (a) adding to `docs/screenshots/README.md` with a description,
or (b) archiving/deleting if the feature state they captured is no longer worth tracking.

### Missing references (doc points at a file that does not exist)

None — every screenshot reference in the checked docs resolves to an existing file.

### Convention notes

- `archive/screenshots/analytics-dashboard.png` is listed in this index but **missing from `archive/screenshots/README.md`**.
- `archive/screenshots/widget-overlap-bug.png` is listed in this index but **missing from `archive/screenshots/README.md`**.
- `archive/screenshots/pagination-expanded-scope.png` has **no counterpart in `docs/screenshots/`** — per the convention an archive entry should be the previous version of a current screenshot.
- `archive/screenshots/widget-overlap-bug.png` has **no counterpart in `docs/screenshots/`** — per the convention an archive entry should be the previous version of a current screenshot.
- `docs/screenshots/` contains `*-after*` filenames (`pagination-after.png`, `pagination-after-accessible.png`, `button-loading-after-light.png`) — the convention forbids `-after` suffixes; these should be renamed or archived.
