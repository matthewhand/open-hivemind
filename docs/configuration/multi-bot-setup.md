# Multi-Bot Configuration Guide

Navigation: [Docs Index](../README.md) | [Configuration Overview](overview.md) | [Multi-Instance Setup](multi-instance-setup.md)


This guide explains how to configure multiple bots using the new BOTS prefix system, while maintaining backward compatibility with the legacy comma-separated token approach.

## Overview

The new multi-bot configuration system allows you to:
- Configure multiple bots with individual settings
- Use different LLM providers per bot
- Set unique Discord tokens and settings per bot
- Maintain backward compatibility with existing configurations
- Use environment variables or configuration files

## New Configuration System (Recommended)

### Environment Variables

Use the `BOTS` environment variable to define bot names, then configure each bot individually:

```bash
# Define bot names
BOTS=max,sam,assistant

# Configure Max bot
BOTS_MAX_NAME=Max
BOTS_MAX_MESSAGE_PROVIDER=discord
BOTS_MAX_LLM_PROVIDER=flowise
BOTS_MAX_DISCORD_BOT_TOKEN=your-max-discord-token
BOTS_MAX_DISCORD_CLIENT_ID=your-max-client-id
BOTS_MAX_DISCORD_GUILD_ID=your-max-guild-id
BOTS_MAX_DISCORD_CHANNEL_ID=your-max-channel-id
BOTS_MAX_FLOWISE_API_KEY=your-max-flowise-key
BOTS_MAX_FLOWISE_API_BASE_URL=http://localhost:3000/api/v1

# Configure Sam bot
BOTS_SAM_NAME=Sam
BOTS_SAM_MESSAGE_PROVIDER=discord
BOTS_SAM_LLM_PROVIDER=openai
BOTS_SAM_DISCORD_BOT_TOKEN=your-sam-discord-token
BOTS_SAM_OPENAI_API_KEY=your-sam-openai-key
BOTS_SAM_OPENAI_MODEL=gpt-4

# Configure Assistant bot
BOTS_ASSISTANT_NAME=Assistant
BOTS_ASSISTANT_MESSAGE_PROVIDER=slack
BOTS_ASSISTANT_LLM_PROVIDER=openwebui
BOTS_ASSISTANT_OPENWEBUI_API_KEY=your-assistant-openwebui-key
```

### Configuration Files

You can also use individual JSON configuration files for each bot:

Create `config/bots/max.json`:
```json
{
  "name": "Max",
  "MESSAGE_PROVIDER": "discord",
  "LLM_PROVIDER": "flowise",
  "DISCORD_BOT_TOKEN": "your-max-discord-token",
  "DISCORD_CLIENT_ID": "your-max-client-id",
  "DISCORD_GUILD_ID": "your-max-guild-id",
  "DISCORD_CHANNEL_ID": "your-max-channel-id",
  "FLOWISE_API_KEY": "your-max-flowise-key",
  "FLOWISE_API_BASE_URL": "http://localhost:3000/api/v1"
}
```

Create `config/bots/sam.json`:
```json
{
  "name": "Sam",
  "MESSAGE_PROVIDER": "discord",
  "LLM_PROVIDER": "openai",
  "DISCORD_BOT_TOKEN": "your-sam-discord-token",
  "OPENAI_API_KEY": "your-sam-openai-key",
  "OPENAI_MODEL": "gpt-4"
}
```

## Legacy Configuration (Backward Compatible)

The system still supports the legacy comma-separated token approach:

```bash
# Single bot
DISCORD_BOT_TOKEN=your-discord-token
OPENAI_API_KEY=your-openai-key

# Multiple bots (comma-separated)
DISCORD_BOT_TOKEN=token1,token2,token3
OPENAI_API_KEY=your-openai-key
FLOWISE_API_KEY=your-flowise-key
```

## Configuration Priority

1. **BOTS environment variable** (highest priority)
2. **Individual bot configuration files** (config/bots/*.json)
3. **Legacy DISCORD_BOT_TOKEN** (lowest priority)

## Supported Providers

### Message Providers
- `discord` - Discord bot
- `slack` - Slack bot
- `mattermost` - Mattermost bot
- `webhook` - Webhook integration

### LLM Providers
- `openai` - OpenAI GPT models
- `flowise` - Flowise AI platform
- `openwebui` - OpenWebUI integration
- `perplexity` - Perplexity AI
- `replicate` - Replicate models
- `n8n` - n8n workflows

## Examples

### Example 1: Two Discord Bots with Different LLM Providers

```bash
# Bot configuration
BOTS=max,sam

# Max bot - Flowise
BOTS_MAX_MESSAGE_PROVIDER=discord
BOTS_MAX_LLM_PROVIDER=flowise
BOTS_MAX_DISCORD_BOT_TOKEN=discord-token-max
BOTS_MAX_FLOWISE_API_KEY=flowise-key-max

# Sam bot - OpenAI
BOTS_SAM_MESSAGE_PROVIDER=discord
BOTS_SAM_LLM_PROVIDER=openai
BOTS_SAM_DISCORD_BOT_TOKEN=discord-token-sam
BOTS_SAM_OPENAI_API_KEY=openai-key-sam
BOTS_SAM_OPENAI_MODEL=gpt-4
```

### Example 2: Mixed Providers

```bash
# Bot configuration
BOTS=discord-bot,slack-bot

# Discord bot
BOTS_DISCORD_BOT_MESSAGE_PROVIDER=discord
BOTS_DISCORD_BOT_LLM_PROVIDER=flowise
BOTS_DISCORD_BOT_DISCORD_BOT_TOKEN=discord-token
BOTS_DISCORD_BOT_FLOWISE_API_KEY=flowise-key

# Slack bot
BOTS_SLACK_BOT_MESSAGE_PROVIDER=slack
BOTS_SLACK_BOT_LLM_PROVIDER=openai
BOTS_SLACK_BOT_OPENAI_API_KEY=openai-key
```

### Example 3: Using Configuration Files

```bash
# Just define bot names
BOTS=max,sam

# Create individual files:
# config/bots/max.json
# config/bots/sam.json
```

## Migration Guide

### From Legacy to New System

1. **Identify your current setup**:
   ```bash
   # Check current configuration
   echo $DISCORD_BOT_TOKEN
   echo $OPENAI_API_KEY
   ```

2. **Create new configuration**:
   ```bash
   # Instead of:
   DISCORD_BOT_TOKEN=token1,token2
   
   # Use:
   BOTS=bot1,bot2
   BOTS_BOT1_DISCORD_BOT_TOKEN=token1
   BOTS_BOT2_DISCORD_BOT_TOKEN=token2
   ```

3. **Test the new configuration**:
   ```bash
   # Run with new configuration
   npm start
   ```

### Hybrid Approach During Migration

You can run both configurations simultaneously during migration. The system will:
- Use the new BOTS configuration if present
- Issue warnings about configuration conflicts
- Fall back to legacy configuration if BOTS is not defined

## Environment Variables Reference

### Bot Definition
- `BOTS` - Comma-separated list of bot names

### Per-Bot Configuration
Replace `{name}` with your bot name (case-insensitive):

#### Bot Identity
- `BOTS_{name}_NAME` - Bot display name

#### Message Provider
- `BOTS_{name}_MESSAGE_PROVIDER` - discord, slack, mattermost, webhook

#### LLM Provider
- `BOTS_{name}_LLM_PROVIDER` - openai, flowise, openwebui, perplexity, replicate, n8n

#### Discord Configuration
- `BOTS_{name}_DISCORD_BOT_TOKEN` - Discord bot token
- `BOTS_{name}_DISCORD_CLIENT_ID` - Discord client ID
- `BOTS_{name}_DISCORD_GUILD_ID` - Discord guild ID
- `BOTS_{name}_DISCORD_CHANNEL_ID` - Default channel ID
- `BOTS_{name}_DISCORD_VOICE_CHANNEL_ID` - Voice channel ID

#### OpenAI Configuration
- `BOTS_{name}_OPENAI_API_KEY` - OpenAI API key
- `BOTS_{name}_OPENAI_MODEL` - Model name (default: gpt-4)

#### Flowise Configuration
- `BOTS_{name}_FLOWISE_API_KEY` - Flowise API key
- `BOTS_{name}_FLOWISE_API_BASE_URL` - API base URL (default: http://localhost:3000/api/v1)

#### OpenWebUI Configuration
- `BOTS_{name}_OPENWEBUI_API_KEY` - OpenWebUI API key
- `BOTS_{name}_OPENWEBUI_API_URL` - API URL (default: http://localhost:3000/api/)

## Troubleshooting

### Common Issues

1. **No bots found**:
   - Check that `BOTS` environment variable is set
   - Verify individual bot tokens are provided
   - Check configuration file paths

2. **Configuration conflicts**:
   - Look for warnings in console output
   - Ensure only one configuration method is used

3. **Bot not responding**:
   - Verify Discord bot token is valid
   - Check bot permissions in Discord
   - Review application logs

### Debug Mode

Enable debug logging:
```bash
DEBUG=app:* npm start
```

### Configuration Validation

Test your configuration:
```bash
# Check loaded bots
node -e "const {BotConfigurationManager} = require('./dist/config/BotConfigurationManager'); console.log(BotConfigurationManager.getInstance().getAllBots())"
```

## API Reference

### BotConfigurationManager

```typescript
// Get singleton instance
const manager = BotConfigurationManager.getInstance();

// Get all bots
const bots = manager.getAllBots();

// Get Discord-specific bots
const discordBots = manager.getDiscordBotConfigs();

// Get specific bot
const bot = manager.getBot('max');

// Check if using legacy mode
const isLegacy = manager.isLegacyMode();

// Get configuration warnings
const warnings = manager.getWarnings();

// Reload configuration
manager.reload();
```

### DiscordService Integration

The DiscordService automatically uses the new configuration system:
- Loads bots from BotConfigurationManager
- Creates individual Discord clients per bot
- Maintains backward compatibility
- Provides bot-specific message handling