# Multi-Instance Setup Guide

This guide explains how to configure multiple bot instances for Discord, Slack, and Mattermost using the unified BotConfigurationManager system.

## Overview

The system now supports running multiple bot instances across different platforms using a unified configuration approach. Instead of platform-specific environment variables, you can now use the `BOTS_*` prefix pattern for all platforms.

## Configuration Pattern

All platforms use the same configuration pattern:

```
BOTS=<bot1_name>,<bot2_name>,<bot3_name>
BOTS_<BOT_NAME>_MESSAGE_PROVIDER=<discord|slack|mattermost>
BOTS_<BOT_NAME>_LLM_PROVIDER=<openai|flowise|openwebui>
```

## Discord Multi-Instance Configuration

### Environment Variables

```bash
# Enable multi-bot mode
BOTS=discord-bot-1,discord-bot-2

# Bot 1 Configuration
BOTS_DISCORD_BOT_1_NAME=DiscordBot1
BOTS_DISCORD_BOT_1_MESSAGE_PROVIDER=discord
BOTS_DISCORD_BOT_1_LLM_PROVIDER=openai
BOTS_DISCORD_BOT_1_DISCORD_BOT_TOKEN=your_bot_token_1
BOTS_DISCORD_BOT_1_DISCORD_CLIENT_ID=your_client_id_1
BOTS_DISCORD_BOT_1_DISCORD_GUILD_ID=your_guild_id_1
BOTS_DISCORD_BOT_1_DISCORD_CHANNEL_ID=your_channel_id_1

# Bot 2 Configuration
BOTS_DISCORD_BOT_2_NAME=DiscordBot2
BOTS_DISCORD_BOT_2_MESSAGE_PROVIDER=discord
BOTS_DISCORD_BOT_2_LLM_PROVIDER=flowise
BOTS_DISCORD_BOT_2_DISCORD_BOT_TOKEN=your_bot_token_2
BOTS_DISCORD_BOT_2_DISCORD_CLIENT_ID=your_client_id_2
BOTS_DISCORD_BOT_2_DISCORD_GUILD_ID=your_guild_id_2
BOTS_DISCORD_BOT_2_DISCORD_CHANNEL_ID=your_channel_id_2
```

### Legacy Configuration (Still Supported)

```bash
# Legacy single bot
DISCORD_BOT_TOKEN=your_bot_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_guild_id
DISCORD_CHANNEL_ID=your_channel_id
```

## Slack Multi-Instance Configuration

### Environment Variables

```bash
# Enable multi-bot mode
BOTS=slack-bot-1,slack-bot-2

# Bot 1 Configuration
BOTS_SLACK_BOT_1_NAME=SlackBot1
BOTS_SLACK_BOT_1_MESSAGE_PROVIDER=slack
BOTS_SLACK_BOT_1_LLM_PROVIDER=openai
BOTS_SLACK_BOT_1_SLACK_BOT_TOKEN=xoxb-your-bot-token-1
BOTS_SLACK_BOT_1_SLACK_SIGNING_SECRET=your-signing-secret-1
BOTS_SLACK_BOT_1_SLACK_APP_TOKEN=xapp-your-app-token-1
BOTS_SLACK_BOT_1_SLACK_DEFAULT_CHANNEL_ID=C1234567890
BOTS_SLACK_BOT_1_SLACK_JOIN_CHANNELS=C1234567890,C0987654321
BOTS_SLACK_BOT_1_SLACK_MODE=socket

# Bot 2 Configuration
BOTS_SLACK_BOT_2_NAME=SlackBot2
BOTS_SLACK_BOT_2_MESSAGE_PROVIDER=slack
BOTS_SLACK_BOT_2_LLM_PROVIDER=flowise
BOTS_SLACK_BOT_2_SLACK_BOT_TOKEN=xoxb-your-bot-token-2
BOTS_SLACK_BOT_2_SLACK_SIGNING_SECRET=your-signing-secret-2
BOTS_SLACK_BOT_2_SLACK_APP_TOKEN=xapp-your-app-token-2
BOTS_SLACK_BOT_2_SLACK_DEFAULT_CHANNEL_ID=C0987654321
BOTS_SLACK_BOT_2_SLACK_JOIN_CHANNELS=C0987654321
BOTS_SLACK_BOT_2_SLACK_MODE=rtm
```

### Legacy Configuration (Still Supported)

```bash
# Legacy single bot
SLACK_BOT_TOKEN=xoxb-your-bot-token
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_APP_TOKEN=xapp-your-app-token
SLACK_DEFAULT_CHANNEL_ID=C1234567890
SLACK_MODE=socket
```

## Mattermost Multi-Instance Configuration

### Environment Variables

```bash
# Enable multi-bot mode
BOTS=mattermost-bot-1,mattermost-bot-2

# Bot 1 Configuration
BOTS_MATTERMOST_BOT_1_NAME=MattermostBot1
BOTS_MATTERMOST_BOT_1_MESSAGE_PROVIDER=mattermost
BOTS_MATTERMOST_BOT_1_LLM_PROVIDER=openai
BOTS_MATTERMOST_BOT_1_MATTERMOST_SERVER_URL=https://your-mattermost-server.com
BOTS_MATTERMOST_BOT_1_MATTERMOST_TOKEN=your-access-token-1
BOTS_MATTERMOST_BOT_1_MATTERMOST_CHANNEL=your-channel-1

# Bot 2 Configuration
BOTS_MATTERMOST_BOT_2_NAME=MattermostBot2
BOTS_MATTERMOST_BOT_2_MESSAGE_PROVIDER=mattermost
BOTS_MATTERMOST_BOT_2_LLM_PROVIDER=flowise
BOTS_MATTERMOST_BOT_2_MATTERMOST_SERVER_URL=https://your-mattermost-server.com
BOTS_MATTERMOST_BOT_2_MATTERMOST_TOKEN=your-access-token-2
BOTS_MATTERMOST_BOT_2_MATTERMOST_CHANNEL=your-channel-2
```

### Legacy Configuration (Still Supported)

```bash
# Legacy single bot
MATTERMOST_SERVER_URL=https://your-mattermost-server.com
MATTERMOST_TOKEN=your-access-token
MATTERMOST_CHANNEL=your-channel
```

## Mixed Platform Configuration

You can run bots across different platforms simultaneously:

```bash
# Enable multi-bot mode with mixed platforms
BOTS=discord-bot,slack-bot,mattermost-bot

# Discord Bot
BOTS_DISCORD_BOT_NAME=MyDiscordBot
BOTS_DISCORD_BOT_MESSAGE_PROVIDER=discord
BOTS_DISCORD_BOT_LLM_PROVIDER=openai
BOTS_DISCORD_BOT_DISCORD_BOT_TOKEN=discord_token

# Slack Bot
BOTS_SLACK_BOT_NAME=MySlackBot
BOTS_SLACK_BOT_MESSAGE_PROVIDER=slack
BOTS_SLACK_BOT_LLM_PROVIDER=flowise
BOTS_SLACK_BOT_SLACK_BOT_TOKEN=slack_token
BOTS_SLACK_BOT_SLACK_SIGNING_SECRET=slack_secret

# Mattermost Bot
BOTS_MATTERMOST_BOT_NAME=MyMattermostBot
BOTS_MATTERMOST_BOT_MESSAGE_PROVIDER=mattermost
BOTS_MATTERMOST_BOT_LLM_PROVIDER=openwebui
BOTS_MATTERMOST_BOT_MATTERMOST_SERVER_URL=https://mattermost.example.com
BOTS_MATTERMOST_BOT_MATTERMOST_TOKEN=mattermost_token
```

## Configuration Validation

### Check Current Configuration

```bash
# Run configuration validation
node -e "
const BotConfigurationManager = require('./dist/config/BotConfigurationManager').default;
const config = BotConfigurationManager.getInstance();
console.log('Configured bots:', config.getAllBots().map(b => b.name));
console.log('Discord bots:', config.getAllBots().filter(b => b.messageProvider === 'discord').length);
console.log('Slack bots:', config.getAllBots().filter(b => b.messageProvider === 'slack').length);
console.log('Mattermost bots:', config.getAllBots().filter(b => b.messageProvider === 'mattermost').length);
"
```

### Debug Configuration Issues

```bash
# Enable debug logging
DEBUG=app:BotConfigurationManager node your-app.js

# Check for warnings
node -e "
const BotConfigurationManager = require('./dist/config/BotConfigurationManager').default;
const config = BotConfigurationManager.getInstance();
const warnings = config.getWarnings();
if (warnings.length > 0) {
  console.warn('Configuration warnings:', warnings);
}
"
```

## Migration Guide

### From Legacy to Multi-Instance

1. **Identify your current configuration**
   ```bash
   # Check current environment variables
   env | grep -E "(DISCORD|SLACK|MATTERMOST)"
   ```

2. **Create new configuration**
   ```bash
   # Example: Migrating from legacy Discord
   # Old: DISCORD_BOT_TOKEN=token123
   # New:
   BOTS=mydiscordbot
   BOTS_MYDISCORDBOT_NAME=MyDiscordBot
   BOTS_MYDISCORDBOT_MESSAGE_PROVIDER=discord
   BOTS_MYDISCORDBOT_LLM_PROVIDER=openai
   BOTS_MYDISCORDBOT_DISCORD_BOT_TOKEN=token123
   ```

3. **Test the new configuration**
   ```bash
   # Run with debug logging
   DEBUG=app:* npm start
   ```

### Platform-Specific Migration Examples

#### Discord Migration
```bash
# Before
DISCORD_BOT_TOKEN=your_token
DISCORD_CLIENT_ID=your_client_id
DISCORD_GUILD_ID=your_guild_id

# After
BOTS=mybot
BOTS_MYBOT_NAME=MyBot
BOTS_MYBOT_MESSAGE_PROVIDER=discord
BOTS_MYBOT_LLM_PROVIDER=openai
BOTS_MYBOT_DISCORD_BOT_TOKEN=your_token
BOTS_MYBOT_DISCORD_CLIENT_ID=your_client_id
BOTS_MYBOT_DISCORD_GUILD_ID=your_guild_id
```

#### Slack Migration
```bash
# Before
SLACK_BOT_TOKEN=xoxb-token
SLACK_SIGNING_SECRET=secret
SLACK_APP_TOKEN=xapp-token

# After
BOTS=mybot
BOTS_MYBOT_NAME=MyBot
BOTS_MYBOT_MESSAGE_PROVIDER=slack
BOTS_MYBOT_LLM_PROVIDER=flowise
BOTS_MYBOT_SLACK_BOT_TOKEN=xoxb-token
BOTS_MYBOT_SLACK_SIGNING_SECRET=secret
BOTS_MYBOT_SLACK_APP_TOKEN=xapp-token
```

## Advanced Configuration

### Per-Bot LLM Configuration

Each bot can use a different LLM provider:

```bash
# Bot 1 uses OpenAI
BOTS_BOT1_LLM_PROVIDER=openai
BOTS_BOT1_OPENAI_API_KEY=sk-...
BOTS_BOT1_OPENAI_MODEL=gpt-4

# Bot 2 uses Flowise
BOTS_BOT2_LLM_PROVIDER=flowise
BOTS_BOT2_FLOWISE_API_KEY=your-flowise-key
BOTS_BOT2_FLOWISE_API_BASE_URL=http://localhost:3000/api/v1

# Bot 3 uses OpenWebUI
BOTS_BOT3_LLM_PROVIDER=openwebui
BOTS_BOT3_OPENWEBUI_API_KEY=your-openwebui-key
BOTS_BOT3_OPENWEBUI_API_URL=http://localhost:3000/api/
```

### Bot-Specific Configuration Files

You can also use JSON configuration files:

```json
// config/bots/discord-bot-1.json
{
  "name": "DiscordBot1",
  "messageProvider": "discord",
  "llmProvider": "openai",
  "discord": {
    "token": "your_bot_token_1",
    "clientId": "your_client_id_1",
    "guildId": "your_guild_id_1",
    "channelId": "your_channel_id_1"
  },
  "openai": {
    "apiKey": "sk-...",
    "model": "gpt-4"
  }
}
```

## Troubleshooting

### Common Issues

1. **"No bot configuration found"**
   - Check that BOTS environment variable is set
   - Verify all required variables are present

2. **"Invalid configuration"**
   - Check for typos in environment variable names
   - Ensure all required fields are provided

3. **"Bot not connecting"**
   - Verify tokens and credentials are correct
   - Check network connectivity
   - Enable debug logging: `DEBUG=app:*`

### Debug Commands

```bash
# Check configuration
node -e "
const BotConfigurationManager = require('./dist/config/BotConfigurationManager').default;
const config = BotConfigurationManager.getInstance();
console.log('All bots:', config.getAllBots());
console.log('Discord:', config.getDiscordBotConfigs());
"

# Test individual bot
node -e "
const BotConfigurationManager = require('./dist/config/BotConfigurationManager').default;
const config = BotConfigurationManager.getInstance();
const bot = config.getBot('mybot');
console.log('Bot config:', bot);
"
```

## API Endpoints

### Slack Webhooks

When using multi-instance Slack configuration, webhooks are automatically registered at:

- `/slack/<bot-name>/action-endpoint`
- `/slack/<bot-name>/interactive-endpoint`
- `/slack/<bot-name>/help`

### Example URLs

```bash
# For bot named "slack-bot-1"
https://your-app.com/slack/slack-bot-1/action-endpoint
https://your-app.com/slack/slack-bot-1/interactive-endpoint
https://your-app.com/slack/slack-bot-1/help
```

## Best Practices

1. **Use descriptive bot names** that indicate their purpose
2. **Separate configuration** for different environments (dev, staging, prod)
3. **Use bot-specific channels** to avoid conflicts
4. **Monitor resource usage** when running multiple instances
5. **Test each bot individually** before enabling all instances
6. **Use different LLM providers** for different use cases
7. **Implement proper logging** for each bot instance