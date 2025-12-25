# Open-Hivemind Agent Architecture

## Overview
Open-Hivemind is a multi-agent bot framework; see [PACKAGE.md](PACKAGE.md) for specs.

## Multi-Agent Modes
- **Solo:** `DISCORD_BOT_TOKEN=token1`
- **Swarm:** `DISCORD_BOT_TOKEN=token1,token2,token3` (auto-numbered instances like `Bot1`, `Bot2`, or `Discord Bot N` for auto-created providers)

## Agent Configuration
- **Personas & system prompts:** Managed via WebUI or `config/personas/`
- **MCP servers:** Tool discovery + execution across multiple servers
- **MCP tool guards:** Owner-only or allowlist-based access

## Coordination & Identity
- **Sender identity:** Display name (no hardcoded `*AgentName*:` prefix in message text)
- **History:** Shared per-channel history (default 30; Discord hard-caps at 10 by default)
- **Coordination:** In-process only (no cross-process sync by default)
- **LLM access:** Unified provider access across agents

## Instance Management
- Automatic token validation on startup
- Per-instance connection handling
- Graceful error recovery

## Configuration Sources
- Personas + system prompts (WebUI / `config/personas/`)
- `MESSAGE_USERNAME_OVERRIDE` affects display name only
- Environment-specific tuning

## Platform Support
- **Discord:** Multi-instance support
- **Slack:** Socket Mode supported
- **Mattermost:** Experimental REST integration

## WebUI + Unified Server
- **WebUI:** Configure providers, personas, MCP servers, tool guards, and view status; OpenAPI export at `/webui/api/openapi`
- **Unified server:** Backend serves the compiled frontend on one port
- **Dev/build:** `dev` starts the backend; `build:frontend` compiles the React/Vite app
- **Static serving:** `resolveFrontendDistPath` selects the frontend dist directory

## Development Roadmap
See [TODO.md](TODO.md) for upcoming features.
