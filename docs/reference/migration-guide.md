# Migration Guide: Legacy to Multi-Instance Configuration

Navigation: [Docs Index](../README.md) | [Configuration Overview](../configuration/overview.md) | [Multi-Instance Setup](../configuration/multi-instance-setup.md)


This guide helps you migrate from legacy single-bot configurations to the new multi-instance system.

## Overview

The new system uses a unified `BOTS_*` prefix pattern that works across all platforms (Discord, Slack, Mattermost). This provides:

- ✅ Consistent configuration across all platforms
- ✅ Support for multiple bot instances
- ✅ Per-bot LLM provider configuration
- ✅ Backward compatibility with legacy configs
- ✅ Better organization and scalability

## Quick Migration Tool

### Automated Migration Script

Save this as `migrate-config.js`:

```javascript
#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Legacy to new mapping
const legacyMappings = {
  discord: {
    prefix: 'DISCORD_',
    provider: 'discord',
    fields: {
      'DISCORD_BOT_TOKEN': 'DISCORD_BOT_TOKEN',
      'DISCORD_CLIENT_ID': 'DISCORD_CLIENT_ID',
      'DISCORD_GUILD_ID': 'DISCORD_GUILD_ID',
      'DISCORD_CHANNEL_ID': 'DISCORD_CHANNEL_ID',
      'DISCORD_VOICE_CHANNEL_ID': 'DISCORD_VOICE_CHANNEL_ID'
    }
  },
  slack: {
    prefix: 'SLACK_',
    provider: 'slack',
    fields: {
      'SLACK_BOT_TOKEN': 'SLACK_BOT_TOKEN',
      'SLACK_SIGNING_SECRET': 'SLACK_SIGNING_SECRET',
      'SLACK_APP_TOKEN': 'SLACK_APP_TOKEN',
      'SLACK_DEFAULT_CHANNEL_ID': 'SLACK_DEFAULT_CHANNEL_ID',
      'SLACK_JOIN_CHANNELS': 'SLACK_JOIN_CHANNELS',
      'SLACK_MODE': 'SLACK_MODE'
    }
  },
  mattermost: {
    prefix: 'MATTERMOST_',
    provider: 'mattermost',
    fields: {
      'MATTERMOST_SERVER_URL': 'MATTERMOST_SERVER_URL',
      'MATTERMOST_TOKEN': 'MATTERMOST_TOKEN',
      'MATTERMOST_CHANNEL': 'MATTERMOST_CHANNEL'
    }
  }
};

function detectLegacyConfig() {
  const env = process.env;
  const detected = {};

  for (const [platform, config] of Object.entries(legacyMappings)) {
    const hasConfig = Object.keys(config.fields).some(key => env[key]);
    if (hasConfig) {
      detected[platform] = true;
    }
  }

  return detected;
}

function generateNewConfig() {
  const env = process.env;
  const newConfig = {};
  let botCounter = 1;

  for (const [platform, config] of Object.entries(legacyMappings)) {
    const hasConfig = Object.keys(config.fields).some(key => env[key]);
    
    if (hasConfig) {
      const botName = `${platform}-bot-${botCounter}`;
      newConfig.BOTS = newConfig.BOTS ? `${newConfig.BOTS},${botName}` : botName;
      
      newConfig[`BOTS_${botName.toUpperCase()}_NAME`] = botName;
      newConfig[`BOTS_${botName.toUpperCase()}_MESSAGE_PROVIDER`] = config.provider;
      
      // Detect LLM provider
      if (env.OPENAI_API_KEY) {
        newConfig[`BOTS_${botName.toUpperCase()}_LLM_PROVIDER`] = 'openai';
        newConfig[`BOTS_${botName.toUpperCase()}_OPENAI_API_KEY`] = env.OPENAI_API_KEY;
        if (env.OPENAI_MODEL) {
          newConfig[`BOTS_${botName.toUpperCase()}_OPENAI_MODEL`] = env.OPENAI_MODEL;
        }
      } else if (env.FLOWISE_API_KEY) {
        newConfig[`BOTS_${botName.toUpperCase()}_LLM_PROVIDER`] = 'flowise';
        newConfig[`BOTS_${botName.toUpperCase()}_FLOWISE_API_KEY`] = env.FLOWISE_API_KEY;
        if (env.FLOWISE_API_BASE_URL) {
          newConfig[`BOTS_${botName.toUpperCase()}_FLOWISE_API_BASE_URL`] = env.FLOWISE_API_BASE_URL;
        }
      } else if (env.OPENWEBUI_API_KEY) {
        newConfig[`BOTS_${botName.toUpperCase()}_LLM_PROVIDER`] = 'openwebui';
        newConfig[`BOTS_${botName.toUpperCase()}_OPENWEBUI_API_KEY`] = env.OPENWEBUI_API_KEY;
        if (env.OPENWEBUI_API_URL) {
          newConfig[`BOTS_${botName.toUpperCase()}_OPENWEBUI_API_URL`] = env.OPENWEBUI_API_URL;
        }
      }

      // Map platform-specific fields
      for (const [legacyKey, newKey] of Object.entries(config.fields)) {
        if (env[legacyKey]) {
          const newFieldKey = `BOTS_${botName.toUpperCase()}_${newKey}`;
          newConfig[newFieldKey] = env[legacyKey];
        }
      }

      botCounter++;
    }
  }

  return newConfig;
}

function createEnvFile(newConfig) {
  const envContent = Object.entries(newConfig)
    .map(([key, value]) => `${key}=${value}`)
    .join('\n');

  const backupPath = path.join(process.cwd(), '.env.backup');
  const newPath = path.join(process.cwd(), '.env.new');

  // Create backup
  if (fs.existsSync('.env')) {
    fs.copyFileSync('.env', backupPath);
    console.log(`✅ Created backup: ${backupPath}`);
  }

  // Write new config
  fs.writeFileSync(newPath, envContent);
  console.log(`✅ Created new config: ${newPath}`);
  
  return { backupPath, newPath };
}

// Main execution
console.log('🔍 Detecting legacy configuration...');
const legacyConfig = detectLegacyConfig();

if (Object.keys(legacyConfig).length === 0) {
  console.log('❌ No legacy configuration detected');
  process.exit(0);
}

console.log('✅ Detected legacy configurations:', Object.keys(legacyConfig));
console.log('🔄 Generating new configuration...');

const newConfig = generateNewConfig();
const { backupPath, newPath } = createEnvFile(newConfig);

console.log('\n📋 Migration Summary:');
console.log('===================');
console.log(`📁 Backup created: ${backupPath}`);
console.log(`📁 New config created: ${newPath}`);
console.log('\n📝 Next steps:');
console.log('1. Review the new configuration in .env.new');
console.log('2. Copy the new variables to your .env file');
console.log('3. Test the new configuration');
console.log('4. Remove old variables once confirmed working');
console.log('\n⚠️  Important:');
console.log('- Keep the backup file until you confirm everything works');
console.log('- Update any deployment scripts to use the new format');
console.log('- Update webhook URLs if using Slack interactive features');
```

### Usage

```bash
# Make executable
chmod +x migrate-config.js

# Run migration
node migrate-config.js
```

## Platform-Specific Migration Examples

### Discord Migration

#### Before (Legacy)
```bash
DISCORD_BOT_TOKEN=your_bot_token_here
DISCORD_CLIENT_ID=your_client_id_here
DISCORD_GUILD_ID=your_guild_id_here
DISCORD_CHANNEL_ID=your_channel_id_here
OPENAI_API_KEY=your_openai_key
```

#### After (Multi-Instance)
```bash
BOTS=mydiscordbot
BOTS_MYDISCORDBOT_NAME=MyDiscordBot
BOTS_MYDISCORDBOT_MESSAGE_PROVIDER=discord
BOTS_MYDISCORDBOT_LLM_PROVIDER=openai
BOTS_MYDISCORDBOT_DISCORD_BOT_TOKEN=your_bot_token_here
BOTS_MYDISCORDBOT_DISCORD_CLIENT_ID=your_client_id_here
BOTS_MYDISCORDBOT_DISCORD_GUILD_ID=your_guild_id_here
BOTS_MYDISCORDBOT_DISCORD_CHANNEL_ID=your_channel_id_here
BOTS_MYDISCORDBOT_OPENAI_API_KEY=your_openai_key
```

### Slack Migration

#### Before (Legacy)
```bash
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here
SLACK_APP_TOKEN=xapp-your-app-token-here
SLACK_DEFAULT_CHANNEL_ID=your-channel-id-here
SLACK_MODE=socket
FLOWISE_API_KEY=your-flowise-key-here
```

#### After (Multi-Instance)
```bash
BOTS=myslackbot
BOTS_MYSLACKBOT_NAME=MySlackBot
BOTS_MYSLACKBOT_MESSAGE_PROVIDER=slack
BOTS_MYSLACKBOT_LLM_PROVIDER=flowise
BOTS_MYSLACKBOT_SLACK_BOT_TOKEN=xoxb-your-bot-token-here
BOTS_MYSLACKBOT_SLACK_SIGNING_SECRET=your-signing-secret-here
BOTS_MYSLACKBOT_SLACK_APP_TOKEN=xapp-your-app-token-here
BOTS_MYSLACKBOT_SLACK_DEFAULT_CHANNEL_ID=your-channel-id-here
BOTS_MYSLACKBOT_SLACK_MODE=socket
BOTS_MYSLACKBOT_FLOWISE_API_KEY=your-flowise-key-here
```

### Mattermost Migration

#### Before (Legacy)
```bash
MATTERMOST_SERVER_URL=https://chat.example.com
MATTERMOST_TOKEN=your_mattermost_token
MATTERMOST_CHANNEL=your_channel
OPENWEBUI_API_KEY=your_openwebui_key
```

#### After (Multi-Instance)
```bash
BOTS=mymattermostbot
BOTS_MYMATTERMOSTBOT_NAME=MyMattermostBot
BOTS_MYMATTERMOSTBOT_MESSAGE_PROVIDER=mattermost
BOTS_MYMATTERMOSTBOT_LLM_PROVIDER=openwebui
BOTS_MYMATTERMOSTBOT_MATTERMOST_SERVER_URL=https://chat.example.com
BOTS_MYMATTERMOSTBOT_MATTERMOST_TOKEN=your_mattermost_token
BOTS_MYMATTERMOSTBOT_MATTERMOST_CHANNEL=your_channel
BOTS_MYMATTERMOSTBOT_OPENWEBUI_API_KEY=your_openwebui_key
```

## Advanced Migration Scenarios

### Multiple Bots of Same Platform

#### Before (Legacy - Not Supported)
```bash
# This was not possible with legacy config
```

#### After (Multi-Instance)
```bash
BOTS=discord-bot-1,discord-bot-2,slack-bot-1

# Discord Bot 1
BOTS_DISCORD_BOT_1_NAME=DiscordBot1
BOTS_DISCORD_BOT_1_MESSAGE_PROVIDER=discord
BOTS_DISCORD_BOT_1_LLM_PROVIDER=openai
BOTS_DISCORD_BOT_1_DISCORD_BOT_TOKEN=token1
BOTS_DISCORD_BOT_1_DISCORD_CLIENT_ID=client1
BOTS_DISCORD_BOT_1_DISCORD_GUILD_ID=guild1

# Discord Bot 2
BOTS_DISCORD_BOT_2_NAME=DiscordBot2
BOTS_DISCORD_BOT_2_MESSAGE_PROVIDER=discord
BOTS_DISCORD_BOT_2_LLM_PROVIDER=flowise
BOTS_DISCORD_BOT_2_DISCORD_BOT_TOKEN=token2
BOTS_DISCORD_BOT_2_DISCORD_CLIENT_ID=client2
BOTS_DISCORD_BOT_2_DISCORD_GUILD_ID=guild2

# Slack Bot 1
BOTS_SLACK_BOT_1_NAME=SlackBot1
BOTS_SLACK_BOT_1_MESSAGE_PROVIDER=slack
BOTS_SLACK_BOT_1_LLM_PROVIDER=openwebui
BOTS_SLACK_BOT_1_SLACK_BOT_TOKEN=slack-token1
BOTS_SLACK_BOT_1_SLACK_SIGNING_SECRET=slack-secret1
```

### Mixed Platform Configuration

```bash
BOTS=discord-bot,slack-bot,mattermost-bot

# Discord
BOTS_DISCORD_BOT_NAME=MyDiscordBot
BOTS_DISCORD_BOT_MESSAGE_PROVIDER=discord
BOTS_DISCORD_BOT_LLM_PROVIDER=openai
BOTS_DISCORD_BOT_DISCORD_BOT_TOKEN=discord_token

# Slack
BOTS_SLACK_BOT_NAME=MySlackBot
BOTS_SLACK_BOT_MESSAGE_PROVIDER=slack
BOTS_SLACK_BOT_LLM_PROVIDER=flowise
BOTS_SLACK_BOT_SLACK_BOT_TOKEN=slack_token

# Mattermost
BOTS_MATTERMOST_BOT_NAME=MyMattermostBot
BOTS_MATTERMOST_BOT_MESSAGE_PROVIDER=mattermost
BOTS_MATTERMOST_BOT_LLM_PROVIDER=openwebui
BOTS_MATTERMOST_BOT_MATTERMOST_SERVER_URL=https://mattermost.example.com
BOTS_MATTERMOST_BOT_MATTERMOST_TOKEN=mattermost_token
```

## Testing Migration

### Step 1: Backup Current Config
```bash
cp .env .env.backup.$(date +%Y%m%d_%H%M%S)
```

### Step 2: Run Migration Tool
```bash
node migrate-config.js
```

### Step 3: Review Generated Config
```bash
cat .env.new
```

### Step 4: Test New Config
```bash
# Copy new config
cp .env.new .env

# Test with debug logging
DEBUG=app:* npm start

# Check bot registration
node -e "
const BotConfigurationManager = require('./dist/config/BotConfigurationManager').default;
const config = BotConfigurationManager.getInstance();
console.log('Configured bots:', config.getAllBots().map(b => ({name: b.name, provider: b.messageProvider})));
"
```

### Step 5: Update Webhook URLs (Slack Only)

If using Slack interactive features, update your webhook URLs:

```bash
# Old URL
https://your-app.com/slack/action-endpoint

# New URL (for bot named "myslackbot")
https://your-app.com/slack/myslackbot/action-endpoint
```

## Rollback Plan

If you need to rollback:

```bash
# Restore backup
cp .env.backup.* .env

# Restart application
npm start
```

## Support

For migration issues:

1. Check the [Multi-Instance Setup Guide](../configuration/multi-instance-setup.md)
2. Enable debug logging: `DEBUG=app:*`
3. Run configuration validation
4. Create an issue with your sanitized configuration
