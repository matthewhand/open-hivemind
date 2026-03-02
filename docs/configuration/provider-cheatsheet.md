# Provider Configuration Cheat Sheet

Navigation: [Docs Index](../README.md) | [Configuration Overview](overview.md) | [Dynamic Model Fetching](dynamic-model-fetching.md)


## Quick Reference for All Providers

### LLM Providers

| Provider | Config Key | Required Env Vars | Supports Chat | Supports Text | Notes |
|----------|------------|-------------------|---------------|---------------|--------|
| **OpenAI** | `openai` | `OPENAI_API_KEY` | ✅ | ✅ | Full OpenAI API support |
| **Flowise** | `flowise` | `FLOWISE_BASE_URL` | ✅ | ❌ | Requires `channelId` in metadata |
| **OpenWebUI** | `openwebui` | `OPENWEBUI_BASE_URL` | ✅ | ❌ | Local instance only |

### Platform Services

| Platform | Service Class | Config Method | Multi-bot | Notes |
|----------|---------------|---------------|-----------|--------|
| **Discord** | `DiscordService` | `DISCORD_BOT_TOKEN` | ✅ | Comma-separated tokens |
| **Slack** | `SlackService` | Slack tokens | ✅ | OAuth setup required |
| **Mattermost** | `MattermostService` | Mattermost config | ✅ | Webhook-based |

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
# Required
OPENWEBUI_BASE_URL=http://localhost:8080
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
# List configured providers
node -e "console.log(require('./src/llm/getLlmProvider')().map(p => p.constructor.name))"

# Test OpenAI connection
node -e "require('./src/integrations/openai/openAiProvider').openAiProvider.generateChatCompletion('test', []).then(console.log)"

# Test Flowise connection
node -e "require('./src/integrations/flowise/flowiseProvider').default.generateChatCompletion('test', [], {channelId: 'test'}).then(console.log)"
```

### Check Discord Configuration
```bash
# List configured bots
node -e "const {Discord} = require('./src/integrations/discord/DiscordService'); console.log(Discord.DiscordService.getInstance().getAllBots().map(b => b.botUserName))"

# Test Discord connection
node -e "const {Discord} = require('./src/integrations/discord/DiscordService'); Discord.DiscordService.getInstance().initialize().then(() => console.log('Connected!'))"
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