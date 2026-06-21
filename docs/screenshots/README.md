# Screenshots — Current State
This directory contains the canonical (current) screenshots of the Open Hivemind UI.
When a screenshot is updated, the previous version moves to `archive/screenshots/` under the same filename.
See [CLAUDE.md](/CLAUDE.md) for the screenshot naming and archival convention, and
[docs/SCREENSHOTS.md](../SCREENSHOTS.md) for the full tracking index of every screenshot (current + archived) with where each one is used.
## How to Regenerate Screenshots
Screenshots are generated automatically using Playwright:
To add a new screenshot:
1. Create `tests/e2e/screenshot-<feature>.spec.ts`
2. Call `await page.screenshot({ path: 'docs/screenshots/<feature>.png', fullPage: true });`
3. Reference the image in this README and in `docs/USER_GUIDE.md`

---

## Golden Journey

The canonical end-to-end walkthrough — adding providers, wiring a bot, sending a message — as automated by `tests/e2e/golden-journey.spec.ts`.

Run `npm run test:journey:guide` to regenerate the full journey-01…11 set against demo-mode data (`tests/e2e/journey-user-guide.spec.ts`); `npm run test:journey` runs the golden-journey assertion spec. These screenshots are embedded in the [User Guide Quick Tour](../USER_GUIDE.md#quick-tour--your-first-session). See [ROADMAP.md](/ROADMAP.md).

| Step | Screenshot | What / Why / How |
|---|---|---|
| **01 — Onboarding** | ![journey-01-onboarding](journey-01-onboarding.png) | **What:** the admin dashboard after first sign-in. **Why:** proves the user can reach the admin surface. **How:** with `ALLOW_LOCALHOST_ADMIN=true` the trusted-network bypass auto-authenticates; otherwise the spec clicks the "Login as Admin (Trusted Network)" button. |
| **02 — Add Discord** | ![journey-02-discord-add](journey-02-discord-add.png) | **What:** the Message Providers page after creating a Discord profile. **Why:** the first messenger adapter is the entry point for receiving messages. **How:** `POST /api/admin/messenger-providers` with `type=discord` and a token; the page then lists the new profile. |
| **03 — Add OpenAI** | ![journey-03-openai-add](journey-03-openai-add.png) | **What:** the LLM Providers page after creating an OpenAI profile. **Why:** the LLM adapter handles inference for the bot's replies. **How:** `POST /api/admin/llm-providers` with `type=openai` and an `apiKey`. Mocked mode uses the sentinel key `sk-test-mock`. |
| **04 — Create Bot** | ![journey-04-bot-create](journey-04-bot-create.png) | **What:** the Bots page after wiring a bot to Discord + OpenAI. **Why:** the bot is the runtime object that ties messenger and LLM together. **How:** `POST /api/bots` with `messageProvider=discord` and `llmProvider=openai`. |
| **05 — Bot Chat** | ![journey-05-bot-chat](journey-05-bot-chat.png) | **What:** the bot detail drawer open on the Test Drive tab after exchanging a message. **Why:** validates the full request→LLM→response pipeline in the browser. **How:** click the bot card on `/admin/bots` to open the side drawer, switch to the Test Drive tab, type "Hello, bot.", click Send. In mocked mode the SSE handler at `**/api/admin/llm-providers/providers/**/test-stream` returns a canned chunk + done event. |
| **06 — Activity Log** | ![journey-06-activity](journey-06-activity.png) | **What:** the Activity page rendering after the exchange. **Why:** closes the loop — what the bot did is observable. **How:** navigate to `/admin/activity`; the page renders without error. Deeper assertions (a row referencing the test bot) are a follow-up. |
| **07 — Personas** | ![journey-07-personas](journey-07-personas.png) | **What:** the Personas library with the demo persona presets. **Why:** personas are how one bot token speaks as different characters. **How:** navigate to `/admin/personas` with demo data seeded. |
| **08 — Guards** | ![journey-08-guards](journey-08-guards.png) | **What:** the Guards page with guard profiles (rate limit, content filter, tool access). **Why:** demonstrates the safety layer applied per bot. **How:** navigate to `/admin/guards`. |
| **09 — Memory** | ![journey-09-memory](journey-09-memory.png) | **What:** the Memory Providers configuration page. **Why:** memory backends give bots cross-conversation context. **How:** navigate to `/admin/memory`. |
| **10 — Monitoring** | ![journey-10-monitoring](journey-10-monitoring.png) | **What:** the monitoring view with demo-mode metrics. **Why:** shows the observability surface operators rely on. **How:** navigate to the monitoring tab under `/admin/overview`. |
| **11 — Export** | ![journey-11-export](journey-11-export.png) | **What:** the configuration Export page. **Why:** closes the story — the whole setup can be snapshotted as JSON/YAML/CSV. **How:** navigate to `/admin/export`. |

### Smart mocks (no real keys needed)

The spec auto-detects sentinel API keys (`/^(test\|dummy\|mock\|fake\|sk-test)-/i`). With sentinels it installs a `page.route()` handler that returns a canned LLM reply. With real keys (`npm run test:journey:integration`), no handler installs — the spec becomes an integration test against the real provider.

---

## Activity & Monitoring

| Screenshot | Description |
|---|---|
| ![hivemind-showcase](hivemind-showcase.png) | The hivemind money shot: the Activity page's Conversations view showing one channel (`#community-support`) where a user's question is answered by two demo personas (SupportBot, then DevOpsBot adding the ops angle) over about a minute, with chronological timestamps and per-reply LLM latency — every other persona stays silent (selective engagement). Demo-mode data; regenerate with `npm run test:journey:showcase`. |
| ![activity-monitor](activity-monitor.png) | Real-time activity monitor showing live system events |
| ![activity-page](activity-page.png) | Activity page overview with event timeline |
| ![activity-page-filters](activity-page-filters.png) | Activity page with filter controls applied |
| ![chat-monitor](chat-monitor.png) | Chat monitoring view for live message tracking |
| ![monitoring-dashboard](monitoring-dashboard.png) | System monitoring dashboard with health metrics |
| ![admin-health-page](admin-health-page.png) | System health page with service status overview |
| ![distributed-trace-waterfall](distributed-trace-waterfall.png) | Distributed tracing waterfall view for request debugging |

## Analytics & Metrics

| Screenshot | Description |
|---|---|
| ![analytics-dashboard](analytics-dashboard.png) | Analytics dashboard with bot performance metrics |
| ![audit-governance-initial](audit-governance-initial.png) | Audit Log page — audit events table (/admin/audit)|
| ![audit-governance-filtered](audit-governance-filtered.png) | Audit Log page with a filter applied (/admin/audit) |

## Bot Management

| Screenshot | Description |
|---|---|
| ![bots-page](bots-page.png) | Main bots listing page |
| ![bot-create-page](bot-create-page.png) | Bot creation page |
| ![bot-create-validation](bot-create-validation.png) | Bot creation form showing validation errors |
| ![bot-details-modal](bot-details-modal.png) | Bot details modal with configuration summary |
| ![bot-search-filtered](bot-search-filtered.png) | Bots page with search filter applied |
| ![bot-templates-page](bot-templates-page.png) | Bot templates page for quick bot creation |
| ![bot-wizard-validation](bot-wizard-validation.png) | Bot creation wizard showing validation state |
| ![clone-bot-modal](clone-bot-modal.png) | Modal dialog for cloning an existing bot |
| ![create-bot-modal](create-bot-modal.png) | Modal dialog for creating a new bot |

## Chat

| Screenshot | Description |
|---|---|
| ![chatpage-latency](chatpage-latency.png) | Chat page showing latency indicators |
| ![chatpage-offline](chatpage-offline.png) | Chat page in offline/disconnected state |
| ![chatpage-optimistic](chatpage-optimistic.png) | Chat page with optimistic message sending |
| ![chatpage-rollback](chatpage-rollback.png) | Chat page showing message rollback after failure |

## Configuration

| Screenshot | Description |
|---|---|
| ![configuration](configuration.png) | Main configuration page |
| ![config-rollback-available](config-rollback-available.png) | Configuration rollback with available restore points |
| ![config-rollback-empty](config-rollback-empty.png) | Configuration rollback page with no restore points |
| ![config-rollback-modal](config-rollback-modal.png) | Configuration rollback confirmation modal |
| ![config-rollback-success](config-rollback-success.png) | Configuration rollback success state |
| ![config-test-helper](config-test-helper.png) | Configuration test helper utility |
| ![backup-retention-baseline](backup-retention-baseline.png) | Backup retention settings in baseline state |
| ![backup-retention-enforced](backup-retention-enforced.png) | Backup retention with enforcement policy active |
| ![create-backup-modal](create-backup-modal.png) | Modal for creating a configuration backup |
| ![env-sample-completeness](env-sample-completeness.png) | Environment sample file completeness check |
| ![template-version-diff-viewer](template-version-diff-viewer.png) | Template version diff viewer for comparing configs |

## LLM Providers

| Screenshot | Description |
|---|---|
| ![llm-providers-list](llm-providers-list.png) | LLM providers list page |
| ![llm-add-profile-modal](llm-add-profile-modal.png) | Modal for adding a new LLM profile |
| ![llm-add-profile-ollama-modal](llm-add-profile-ollama-modal.png) | Modal for adding an Ollama LLM profile |
| ![letta-provider-list](letta-provider-list.png) | Letta provider instances list |
| ![letta-provider-selection](letta-provider-selection.png) | Letta provider selection interface |
| ![openwebui](openwebui.png) | OpenWebUI provider configuration |
| ![integrations-llm](integrations-llm.png) | LLM integrations overview panel |

## Message Providers

| Screenshot | Description |
|---|---|
| ![message-providers-list](message-providers-list.png) | Message providers list page |
| ![message-add-provider-modal](message-add-provider-modal.png) | Modal for adding a new message provider |

## Providers API

| Screenshot | Description |
|---|---|
| ![memory-providers-list](memory-providers-list.png) | Memory providers list page (Redis, Pinecone, etc.) |
| ![tool-providers-list](tool-providers-list.png) | Tool providers list page (GitHub, Jira, Google Search, etc.) |

## MCP (Model Context Protocol)

| Screenshot | Description |
|---|---|
| ![mcp-servers-list](mcp-servers-list.png) | MCP servers list page |
| ![mcp-add-server-modal](mcp-add-server-modal.png) | Modal for adding a new MCP server |
| ![mcp-tools-list](mcp-tools-list.png) | MCP tools list view |
| ![mcp-tools-modal](mcp-tools-modal.png) | MCP tools detail modal |
| ![mcp-tool-run-modal](mcp-tool-run-modal.png) | Modal for running an MCP tool |
| ![mcp-guard-ux](mcp-guard-ux.png) | MCP guard UX for tool usage controls |

## Guards & Security

| Screenshot | Description |
|---|---|
| ![guards-page](guards-page.png) | Guards page with guardrail profiles |
| ![guards-modal](guards-modal.png) | Guards configuration modal |
| ![guards-modal-enhanced](guards-modal-enhanced.png) | Enhanced guards modal with additional options |
| ![guard-profiles-coverage](guard-profiles-coverage.png) | Guard profiles coverage report |
| ![api-rate-limit](api-rate-limit.png) | API rate limiting configuration |
| ![plugin-security-dashboard](plugin-security-dashboard.png) | Plugin security dashboard |
| ![plugin-security-filtered](plugin-security-filtered.png) | Plugin security dashboard with filters applied |

## Personas

| Screenshot | Description |
|---|---|
| ![personas-page](personas-page.png) | Personas management page |
| ![verification-personas](verification-personas.png) | Persona verification view |
| ![verification-personas-copy](verification-personas-copy.png) | Persona copy verification |

## Marketplace

| Screenshot | Description |
|---|---|
| ![marketplace-page](marketplace-page.png) | Plugin marketplace page |
| ![marketplace-install-modal](marketplace-install-modal.png) | Plugin installation modal |

## Settings

| Screenshot | Description |
|---|---|
| ![settings-general](settings-general.png) | General settings page |
| ![settings-general-loading](settings-general-loading.png) | General settings page in loading state |
| ![settings-messaging](settings-messaging.png) | Messaging settings page |
| ![settings-messaging-debug](settings-messaging-debug.png) | Messaging settings with debug mode |
| ![settings-security](settings-security.png) | Security settings page |

## System Management
| Screenshot | Description |
|---|---|
| ![system-management](system-management.png) | System management overview |
| ![system-management-page](system-management-page.png) | System management full page |
| ![system-management-config-tab](system-management-config-tab.png) | System management configuration tab |
## UI Components & Accessibility
| Screenshot | Description |
|---|---|
| ![ai-assist-button](ai-assist-button.png) | AI assist button component |
| ![ai-button-hover](ai-button-hover.png) | AI button hover state |
| ![ai-button-hover-full](ai-button-hover-full.png) | AI button hover state (full context) |
| ![ai-button-loading](ai-button-loading.png) | AI button loading/spinner state |
| ![button-loading](button-loading.png) | Generic button loading state |
| ![button-loading-real-app](button-loading-real-app.png) | Button loading state in production context |
| ![pagination](pagination.png) | Pagination component |
| ![pagination-accessible](pagination-accessible.png) | Pagination with accessibility enhancements |
## Voice Readout (Supertonic)

| Screenshot | Description |
|---|---|
| ![tts-supertonic-ready](tts-supertonic-ready.png) | **What:** the Voice [Experimental] settings tab with the Supertonic engine loaded and ready (WASM backend shown). **Why:** proves the browser-side ONNX TTS engine initializes against same-origin model files at `/tts/` — no third-party CDN, no CORS bypass. **How:** `npm run tts:download` (one-time, vendors ~400 MB of model weights), then enable the toggle, pick "Supertonic" in the Engine dropdown. The hook loads 4 ONNX models (duration predictor, text encoder, vector estimator, vocoder) and one voice preset (default F1). Test with `npm run test:tts`. |

## Demo Mode & Onboarding
| Screenshot | Description |
|---|---|
| ![demo-mode-banner](demo-mode-banner.png) | Demo mode banner indicating the app is running in demonstration mode |
| ![demo-mode-dashboard](demo-mode-dashboard.png) | Dashboard view while running in demo mode |
| ![onboarding-page](onboarding-page.png) | First-run onboarding flow for new users |

## Widgets
| Screenshot | Description |
|---|---|
| ![widget-dashboard](widget-dashboard.png) | Widget-driven dashboard layout with rearrangeable tiles |

## API & Specs
| Screenshot | Description |
|---|---|
| ![api-docs-page](api-docs-page.png) | Interactive API documentation page |
| ![specs-page](specs-page.png) | OpenAPI/spec catalog page |

## Other Pages
| Screenshot | Description |
|---|---|
| ![export-page](export-page.png) | Data export page |
| ![showcase-page](showcase-page.png) | DaisyUI component showcase page |
| ![sitemap-page](sitemap-page.png) | Initial loading splash ("Open-Hivemind / Initializing AI Network Dashboard / 30% Complete") shown before the sitemap renders. **Note:** filename is misleading — this is the splash, not the sitemap itself; image needs re-shooting. |
| ![static-pages](static-pages.png) | Static pages overview |
| ![webhook-integration](webhook-integration.png) | Webhook Events page — event log with source/status filters (/admin/webhooks) |
| ![verification-bots-search](verification-bots-search.png) | Bot search verification view |
