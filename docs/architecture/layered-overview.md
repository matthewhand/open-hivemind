# Architecture Overview

Navigation: [Docs Index](../README.md) | [Agent Architecture](agents.md) | [Configuration Overview](../configuration/overview.md)


This document summarises how Open-Hivemind turns multiple bot tokens into a
coordinated digital consciousness that operates across Discord, Slack, and
Mattermost.

## Layered System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                     Experience Layer                        │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  WebUI (React) · REST API · CLI                         │ │
│ └─────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                Orchestration & Coordination                 │
│  ├─ BotConfigurationManager (multi-agent registry)         │
│  ├─ PersonaEngine (system instructions & personas)         │
│  ├─ ToolGuardService (MCP access policies)                 │
│  └─ ContextCache (per-channel shared history)              │
├─────────────────────────────────────────────────────────────┤
│                    Messaging Connectors                     │
│  ├─ DiscordService (solo & swarm)                          │
│  ├─ SlackService (Socket Mode)                             │
│  └─ MattermostService (REST, experimental)                 │
├─────────────────────────────────────────────────────────────┤
│                     Intelligence Providers                  │
│  ├─ OpenAIProvider                                         │
│  ├─ FlowiseProvider                                        │
│  ├─ OpenWebUIProvider                                      │
│  └─ OpenSwarm / MCP tool adapters                          │
├─────────────────────────────────────────────────────────────┤
│                  Foundations & Shared Utilities             │
│  ├─ Convict configuration schema                           │
│  ├─ Rate limiting and retry primitives                      │
│  ├─ Structured logging (pino + debug)                      │
│  └─ TypeScript domain models                               │
└─────────────────────────────────────────────────────────────┘
```

## Multi-Agent Coordination
- **Solo mode** – one token, one connection, still benefiting from the unified
  persona and context cache.
- **Swarm mode** – multiple tokens defined via `DISCORD_BOT_TOKEN` or the
  `BOTS_*` schema spin up auto-numbered instances (`BotName #1`, `BotName #2`, …).
- **Instance isolation** – each agent keeps its own gateway connection, rate
  limiter, and health checks while sharing configuration via the orchestrator.
- **Unified voice** – outbound responses are formatted as `*AgentName*: message`
  to present a single persona regardless of the responding instance.

## Context Sharing & Memory
- Up to ten recent messages per channel are cached in the `ContextCache` and
  replayed to every instance that handles a prompt.
- Mentions and wakewords (`!help`, `!ping`) trigger contextual lookups before the
  LLM request is built.
- History snapshots are platform-agnostic, so the same context can be reused on
  Discord, Slack, or Mattermost conversations.

## Persona & System Instructions
- Persona templates live in `config/personas/` and can be assigned per agent from
  the WebUI or via `BOTS_{NAME}_PERSONA` variables.
- Custom system prompts override persona defaults when present, enabling
  targeted behaviour for specific channels or tenants.
- The PersonaEngine merges persona, system instructions, channel hints, and
  recent history into a single prompt payload before calling the LLM provider.

## Model Context Protocol Integration
- Open-Hivemind can connect to one or more MCP servers using the WebUI or JSON
  configuration files.
- Tool discovery is automatic: once connected, available MCP tools show up in
  the agent’s execution plan.
- ToolGuardService enforces usage policies:
  - **Owner-only** – restrict calls to the message author who owns the channel.
  - **Custom allowlist** – grant access to specific user IDs.
  - Guards can be toggled per agent, per server, or per tool.

## WebUI & API Surface
- The combined Express + React dev server (`npm run dev`) serves the WebUI and
  REST API from a single port.
- Operators can:
  - View real-time instance health, connection status, and recent errors.
  - Manage personas, system instructions, and MCP server credentials.
  - Override configuration fields with visibility into which values are locked
    by environment variables (safely redacted).
  - Export the full API contract via `/webui/api/openapi` (JSON or YAML).

## Error Handling & Observability
- Startup validation catches missing or empty tokens before launching agents.
- The retry layer backs off gracefully on transient messaging or provider
  failures.
- Logs are tagged with the agent name and platform for quick triage, and DEBUG
  namespaces (`app:*`) surface deep diagnostics during development.

## Extensibility Points
- **New platforms** – implement the `IMessage`, `IMessageProvider`, and
  `IMessengerService` interfaces; register with the orchestrator.
- **New LLM providers** – implement `ILlmProvider` and register with
  `getLlmProvider()`.
- **Custom tooling** – extend MCC/MCP adapters or add bespoke REST/CLI tools
  through the same guard mechanism.

For a feature-by-feature validation matrix, see [`PACKAGE.md`](../../PACKAGE.md).
