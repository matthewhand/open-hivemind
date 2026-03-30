# Screenshots — Current State
This directory contains the canonical (current) screenshots of the Open Hivemind UI.
When a screenshot is updated, the previous version moves to `archive/screenshots/` under the same filename.
See [CLAUDE.md](/CLAUDE.md) for the screenshot naming and archival convention.
## How to Regenerate Screenshots
Screenshots are generated automatically using Playwright:
To add a new screenshot:
1. Create `tests/e2e/screenshot-<feature>.spec.ts`
2. Call `await page.screenshot({ path: 'docs/screenshots/<feature>.png', fullPage: true });`
3. Reference the image in this README and in `docs/USER_GUIDE.md`

---

## Activity & Monitoring

| Screenshot | Description |
|---|---|
| ![activity-monitor](activity-monitor.png) | Real-time activity monitor showing live system events |
| ![activity-page](activity-page.png) | Activity page overview with event timeline |
| ![activity-page-filters](activity-page-filters.png) | Activity page with filter controls applied |
| ![chat-monitor](chat-monitor.png) | Chat monitoring view for live message tracking |
| ![monitoring-dashboard](monitoring-dashboard.png) | System monitoring dashboard with health metrics |
| ![health-dashboard](health-dashboard.png) | Health dashboard page with service status overview |
| ![distributed-trace-waterfall](distributed-trace-waterfall.png) | Distributed tracing waterfall view for request debugging |

## Analytics & Metrics

| Screenshot | Description |
|---|---|
| ![analytics-dashboard](analytics-dashboard.png) | Analytics dashboard with bot performance metrics |
| ![audit-governance-initial](audit-governance-initial.png) | Audit and governance page in initial state |
| ![audit-governance-filtered](audit-governance-filtered.png) | Audit and governance page with filters applied |

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
| ![providers-api-memory](providers-api-memory.png) | Memory providers API listing page |
| ![providers-api-tool](providers-api-tool.png) | Tool providers API listing page |

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
| ![pagination-expanded-scope](pagination-expanded-scope.png) | Pagination with expanded page scope |
## Other Pages
| Screenshot | Description |
|---|---|
| ![export-page](export-page.png) | Data export page |
| ![showcase-page](showcase-page.png) | DaisyUI component showcase page |
| ![sitemap-page](sitemap-page.png) | Application sitemap page |
| ![static-pages](static-pages.png) | Static pages overview |
| ![webhook-integration](webhook-integration.png) | Webhook integration configuration |
| ![verification-bots-search](verification-bots-search.png) | Bot search verification view |
