# Provider Configuration Cheat Sheet

Navigation: [Docs Index](../README.md) | [Configuration Overview](overview.md) | [Dynamic Model Fetching](dynamic-model-fetching.md)


## Quick Reference for All Providers

### LLM Providers

| Provider | Config Key | Required Env Vars | Supports Chat | Supports Text | Notes |
|----------|------------|-------------------|---------------|---------------|--------|
| **OpenAI** | `openai` | `OPENAI_API_KEY` | ✅ | ✅ | Full OpenAI API support; native function calling and a streaming completion method (`generateStreamingChatCompletion`) |
| **Flowise** | `flowise` | `FLOWISE_BASE_URL` | ✅ | ❌ | Requires `channelId` in metadata |
| **OpenWebUI** | `openwebui` | `OPEN_WEBUI_API_URL` | ✅ | ❌ | Local instance; OpenAI-compatible API |
| **Letta** | `letta` | `LETTA_SERVER_PASSWORD` (auth) | ✅ | ❌ | Stateful agent backend; agent via `LETTA_AGENT_ID`; base URL/API key set through the LLM profile / Providers UI (`LETTA_BASE_URL`, `LETTA_API_KEY` schema fields) |
| **OpenSwarm** | `openswarm` | `OPENSWARM_BASE_URL` | ✅ | ❌ | Multi-agent team backend; `OPENSWARM_TEAM` selects the team/model |

> **Live model listing:** the admin endpoint `GET /api/admin/llm-providers/:type/models`
> serves a curated catalog for `openai`, `anthropic`, `google`, and `perplexity`,
> and supports live provider queries with `?live=true` for `openai` and
> `openwebui`. See [LLM Provider Models API](../api/llm-models-endpoint.md).

### Platform Services

| Platform | Service Class | Config Method | Multi-bot | Notes |
|----------|---------------|---------------|-----------|--------|
| **Discord** | `DiscordService` | `DISCORD_BOT_TOKEN` | ✅ | Comma-separated tokens |
| **Slack** | `SlackService` | Slack tokens | ✅ | OAuth setup required |
| **Mattermost** | `MattermostService` | Mattermost config | ✅ | Receives messages over WebSocket; shows typing indicator |

## Environment Variable Quick Setup

### Single Provider, Single Bot
```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key
DISCORD_BOT_TOKEN=your-token
```

### Multi-Provider, Multi-Bot
```bash
LLM_PROVIDER=openai,flowise
OPENAI_API_KEY=sk-openai-key
FLOWISE_BASE_URL=http://localhost:3000
DISCORD_BOT_TOKEN=token1,token2,token3
```

## Provider-Specific Configuration

### OpenAI Provider
```bash
# Required
OPENAI_API_KEY=sk-your-key

# Optional
OPENAI_MODEL=gpt-4o
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_TIMEOUT=10000
OPENAI_MAX_TOKENS=150
OPENAI_TEMPERATURE=0.7
```

### Flowise Provider
```bash
# Required
FLOWISE_BASE_URL=http://localhost:3000

# REST Mode (simple)
FLOWISE_USE_REST=true

# SDK Mode (advanced)
FLOWISE_USE_REST=false
FLOWISE_CONVERSATION_CHATFLOW_ID=your-chatflow-id
```

### OpenWebUI Provider
```bash
# Required (note: OPEN_WEBUI_*, underscore-separated)
OPEN_WEBUI_API_URL=http://localhost:3000/api/

# Auth — password (default) or apiKey
OPEN_WEBUI_AUTH_METHOD=password
OPEN_WEBUI_USERNAME=admin
OPEN_WEBUI_PASSWORD=your-password

# Optional
OPEN_WEBUI_MODEL=llama3.2
```

### Letta Provider
```bash
# Auth (read directly from env by the provider client)
LETTA_SERVER_PASSWORD=your-server-password   # used for cloud and self-hosted auth

# Default agent when none is supplied in message metadata
LETTA_AGENT_ID=agent-uuid
```

Base URL and API key are configured through the LLM profile / Providers UI
(schema fields `LETTA_BASE_URL`, `LETTA_API_KEY`), not as raw process env vars.
The provider also supports a per-bot session mode (`default`, `per-channel`,
`per-user`, `fixed`) so a bot can maintain isolated Letta conversations per
channel or per user.

### OpenSwarm Provider
```bash
# Required
OPENSWARM_BASE_URL=http://localhost:8000/v1

# Optional
OPENSWARM_API_KEY=your-key
OPENSWARM_TEAM=default-team      # team name used as the model identifier
```

## Common Configuration Patterns

### Development Setup
```bash
# Local development with OpenAI
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-dev-key
DISCORD_BOT_TOKEN=dev-bot-token
DEBUG=app:*

# Local development with Flowise
LLM_PROVIDER=flowise
FLOWISE_BASE_URL=http://localhost:3000
FLOWISE_USE_REST=true
DISCORD_BOT_TOKEN=dev-bot-token
```

### Production Setup
```bash
# Multi-provider for redundancy
LLM_PROVIDER=openai,flowise
OPENAI_API_KEY=sk-prod-key
FLOWISE_BASE_URL=https://flowise.yourdomain.com
DISCORD_BOT_TOKEN=prod-token1,prod-token2
```

### Testing Setup
```bash
# Test mode skips complex initialization
NODE_ENV=test
LLM_PROVIDER=openai
OPENAI_API_KEY=test-key
DISCORD_BOT_TOKEN=test-token
```

## Troubleshooting Commands

### Check Provider Configuration
```bash
# List configured LLM providers (server must be running: npm run dev)
curl -s http://localhost:3028/api/admin/llm-providers | npx fx .

# Test OpenAI connection via health endpoint
curl -s http://localhost:3028/api/health | npx fx .system

# View full server health including provider status
curl -s http://localhost:3028/api/health
```

### Check Discord Configuration
```bash
# List configured bots (server must be running: npm run dev)
curl -s http://localhost:3028/api/config/bots

# Check bot connection status
curl -s http://localhost:3028/api/health
```

## Error Messages and Solutions

| Error Message | Cause | Solution |
|---------------|--------|----------|
| "No valid LLM providers initialized" | Invalid LLM_PROVIDER or missing keys | Check LLM_PROVIDER value and required env vars |
| "No Discord bot tokens provided" | Missing DISCORD_BOT_TOKEN | Set DISCORD_BOT_TOKEN environment variable |
| "channelId is missing from metadata" | Using Flowise without channel context | Ensure metadata includes channelId |
| "Connection timeout" | Network issues | Check provider URLs and network connectivity |

## Debug Configuration

```bash
# Enable all debug logging
DEBUG=app:*

# Specific component debugging
DEBUG=app:getLlmProvider
DEBUG=app:openAiProvider
DEBUG=app:flowiseProvider
DEBUG=app:discordService

# Multiple specific debuggers
DEBUG=app:getLlmProvider,app:openAiProvider