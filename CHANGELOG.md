# Changelog

## 1.4.0 - 2026-07-20

### 🔒 Security

- **Authz hardening**: `AuthManager.updateUser` now applies an allowlist of safe/admin-managed fields, preventing mass-assignment of secrets (`passwordHash`, `twoFactor*`) and identity keys (`id`, `createdAt`).
- **Live role enforcement**: `AuthMiddleware` derives permissions from the user's *current* role (not the stale JWT claim) and rejects `isActive === false` users, closing a privilege-escalation window after demotion.
- **Profile schema isolation**: self-service profile updates use a dedicated schema that strips `role`/`isActive`; `validateRequest` now strips unknown body keys so handlers never see unauthorized fields.
- **Secure config access**: `/webui/api/secure-config` routes now require admin.
- **Dangerous-flag refusal**: `FORCE_TRUSTED_LOGIN` and `DISABLE_ENCRYPTION` are rejected in production, even under `ALLOW_INSECURE_PRODUCTION`.
- **Trusted proxy default**: trusted proxies now default to loopback only (no RFC1918), mitigating `X-Forwarded-For` spoofing.
- Password change accepts `currentPassword` with `oldPassword` fallback.

### ✨ Added

- **Swarm modes**: `DecisionStage` supports `SWARM_MODE` (`exclusive`/`broadcast`/`rotating`/`priority`/`collaborative`) with atomic claim acquisition and `SwarmCoordinator.decide` for non-exclusive turn/broadcast logic.
- **Multi-provider send routing**: `MessageSenderAdapter` routes outbound replies to the correct messenger by platform, forwarding thread/reply args; `createPipeline` wires all `messengerServices`.
- **Tool-augmented inference**: `LlmInvokerAdapter` prefers `toolAugmentedCompletion` (MCP/tools) with a plain-completion fallback.
- **Swarm claim release**: claims are released on empty/error inference and empty/failed send so another bot can retry.

### 🧪 Tests

- Added coverage for authz hardening, swarm atomic-claim races, tool-augmented inference fallback, thread/reply send, and provider-map routing.
- Gated real-Neon Postgres integration suites behind `ALLOW_REAL_SECRETS` so they skip (rather than fail) in DB-less/CI environments.

## Unreleased

### ⚠️ Breaking Changes

- **Webhook IP Whitelist is now default-deny**: `WEBHOOK_IP_WHITELIST` being empty previously allowed all IPs. It now blocks all requests with a 403. Set `WEBHOOK_IP_WHITELIST=0.0.0.0/0` to restore open access, or list specific IPs. See `.env.sample` for examples.

### ✨ Added

- **Messaging — two-way platforms**: Mattermost now receives incoming messages over WebSocket (plus typing indicators); Slack receives messages via RTM with native typing indicators. Webhook providers gained an inbound ingress route for incoming messages.
- **LLM capabilities**: Response streaming for OpenAI; function/tool calling via the `ILlmProvider` abstraction; live model listing. Postgres memory backend can now fetch a memory by id.
- **Memory**: Conversation summarization, retention/eviction policies, and a MemVault hybrid-scoring backend.
- **MCP**: MCP SDK client wired up via dynamic import, and a provider-test handshake for validating MCP server connections.
- **Scheduled bot tasks**: List and delete recurring bot prompt tasks from the dashboard/API.
- **Personas**: Usage-count tracking per persona.
- **Config management**: YAML and CSV round-trip import/export (alongside JSON).
- **Observability & monitoring**: Real health and detailed checks, Prometheus-compatible metrics (placeholders removed), trace export to console/file/OTLP, and wire-ups for the provider-metrics collector, integration anomaly detector, and business-KPI collector. Pipeline now records activity (feed + scoring).
- **Persistence**: Durable user persistence and durable audit log.
- **WebUI**: Bot toggle (start/stop) route, Specs "Create" UI, and a Guards settings UI.
- **Security/Networking**: Webhook IP whitelist enforcement.

### 🔧 Configuration

- New environment variables: `SESSION_SECRET`, `SESSION_MAX_AGE`, `SESSION_IDLE_TIMEOUT`, `SESSION_COOKIE_NAME`, `SESSION_STORE_MAX_SESSIONS`, `SESSION_STORE_CLEANUP_INTERVAL_MS`, `TRACE_LOG_FILE` (enables JSON trace export to file), `OTEL_EXPORTER_OTLP_ENDPOINT` (enables OTLP trace export), `SLACK_FAKE_TYPING` (set to `false` to disable Slack typing simulation), and `WEBHOOK_IP_WHITELIST`. See `.env.sample`.

### 🚧 Still Pending

- Two-factor authentication, account lockout, and the session manager remain under security review and are not yet enabled. Discord voice / speech-to-text is not implemented.
