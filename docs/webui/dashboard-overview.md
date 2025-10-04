# WebUI Dashboard Overview

Navigation: [Docs Index](../README.md) | [Configuration Overview](../configuration/overview.md) | [Monitoring Overview](../monitoring/overview.md)


The WebUI is the control centre for Open-Hivemind. It runs alongside the API in
both development (`npm run dev`) and production deployments and exposes
configuration, monitoring, and persona management without editing files by hand.

## Key Panels
- **Overview:** Real-time heartbeat for each bot instance, including connection
  status, last activity, and any rate-limit warnings.
- **Personas:** Create, edit, and delete persona templates. Assign personas and
  override system instructions per agent or per platform.
- **LLM Providers:** Configure provider credentials, model defaults, and routing
  rules. Fields locked by environment variables appear with redacted previews so
  operators know what is controlled elsewhere.
- **Messenger Providers:** Manage tokens, channel routing, and swarm sizing for
  Discord, Slack, and Mattermost instances.
- **MCP Servers:** Register Model Context Protocol endpoints, inspect available
  tools, and configure authentication.
- **Tool Guards:** Toggle owner-only or custom-allowlist access for MCP tools at
  the agent, server, or tool level.

## Override Storage
Changes made through the WebUI persist to `config/user/bot-overrides.json`. At
startup the overrides merge beneath environment variables, so production secrets
can remain in `.env` while operators adjust non-sensitive settings live.

## API Surface
The WebUI runs on the same Express app as the REST API. Download the full
OpenAPI specification at `/webui/api/openapi` (JSON or YAML). For individual
endpoint details, see [`monitoring/api.md`](../monitoring/api.md) and the
admin-route docs referenced in the development guide.
