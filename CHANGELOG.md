# Changelog

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
