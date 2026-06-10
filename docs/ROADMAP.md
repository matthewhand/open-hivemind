# Roadmap

Tiered TODO checkboxes for Open-Hivemind. Every item below is backed by the per-feature
audit in [FEATURE_STATUS.md](FEATURE_STATUS.md) (307 features across 10 domains:
209 ✅ complete · 64 🟡 partial · 20 🔲 stub · 5 📋 planned · 9 ❌ broken).
When a feature changes state, update both files.

**MVP gate-check:** `npm run test:journey` (golden-journey Playwright spec).

_Last updated: 2026-06-10._

## ✅ Shipped (MVP)

- [x] Bot management — create, configure, start/stop, toggle from the WebUI
- [x] Discord, Slack, Mattermost — two-way messaging (receive + send), threads, typing indicators, multi-bot instances
- [x] Inbound webhook ingress
- [x] LLM providers — OpenAI (with streaming + function calling), Flowise, OpenWebUI, Letta; live model listing
- [x] Persona management with usage tracking
- [x] MCP tool servers (SDK client, provider-test handshake)
- [x] Guard profiles, rate limiting, durable audit logging, duplicate-response suppression
- [x] Real-time monitoring, health checks, Prometheus-compatible metrics, trace export (console/file/OTLP)
- [x] Config import/export (JSON/YAML/CSV) and on-demand backups
- [x] Scheduled bot tasks
- [x] Conversation memory with summarization and retention/eviction
- [x] Demo mode and trusted-network login

## 🔧 In Progress / Known Broken (fix before claiming)

These are tracked as ❌ broken or notable 🟡 partial in FEATURE_STATUS.md:

- [ ] Letta per-bot config isolation (❌)
- [ ] OpenSwarm config wiring (❌)
- [ ] MCPProviderManager spawn error handling (❌)
- [ ] MCPToolsTestingPage client page (❌)
- [ ] MCPServerManager legacy component (❌)
- [ ] Persona create/clone/update HTTP responses (❌)
- [ ] Client ImportExportPage — `/api/admin/export|import` routes not mounted (❌)
- [ ] API Docs page — duplicate import breaks the module build (❌)
- [ ] Webhook events backend — list/detail/retry path/shape mismatch with the UI (❌)
- [ ] Activity REST API — `/messages` and `/llm-usage` return empty arrays; `/chart-data` fabricates its series (🟡)
- [ ] Webhook scheduled messages — API works but nothing delivers the scheduled messages (🟡)

## 🧪 Experimental / Stubbed (exists in code, not functional)

- [ ] Outbound webhook send (currently a no-op)
- [ ] Telegram receive/history (provider exists but is not in the live provider list)
- [ ] Discord slash-command/interaction handling
- [ ] Discord voice / speech-to-text
- [ ] Slack reactions handling
- [ ] Vision (image input) support
- [ ] Postgres memory backend (update path)
- [ ] Built-in `transfer_to_bot` swarm-routing tool
- [ ] `/api/mcp-tools` routes
- [ ] Standalone HealthChecker + AlertManager (placeholder metrics, not wired into routes)
- [ ] Security settings UI (2FA, lockout, session timeout, API-key auth toggles)
- [ ] Tenant isolation middleware
- [ ] Enterprise compliance / cloud-provider / governance APIs (mock responses)
- [ ] CI/CD deployment routes (mock responses)

## 💡 Proposed

- [ ] Two-factor authentication and account lockout (under security review, not yet enabled)
- [ ] Session manager with token rotation (under security review, not yet enabled)
- [ ] Business KPI collector wired into routes
- [ ] Marketplace plugin installation
- [ ] Multi-user roles & permissions UI
- [ ] Conversation history viewer
- [ ] Webhook event replay
- [ ] Native Ollama provider (today: point the OpenAI provider's `OPENAI_BASE_URL` at an OpenAI-compatible endpoint)
