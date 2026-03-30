# Provider Setup Guide

This guide walks you through setting up various providers for Open Hivemind. Each provider type has specific requirements and setup steps.

## Table of Contents

- [LLM Providers](#llm-providers)
  - [OpenAI](#openai)
  - [Anthropic (Claude)](#anthropic-claude)
  - [Flowise](#flowise)
  - [OpenWebUI](#openwebui)
  - [OpenSwarm](#openswarm)
- [Messenger Providers](#messenger-providers)
  - [Discord](#discord)
  - [Slack](#slack)
  - [Telegram](#telegram)
  - [Mattermost](#mattermost)

---

## LLM Providers

### OpenAI

OpenAI provides access to GPT models through their API.

#### Step 1: Get Your API Key

1. Visit [OpenAI Platform](https://platform.openai.com/api-keys)
2. Sign in or create an account
3. Navigate to API Keys section
4. Click "Create new secret key"
5. Copy the key (it starts with `sk-`)

#### Step 2: Configure in Open Hivemind

1. Go to Admin Panel > LLM Providers
2. Click "Add Provider"
3. Select "OpenAI" as the provider type
4. Enter the following:
   - **API Key**: Your OpenAI API key
   - **Model**: `gpt-4` or `gpt-3.5-turbo` (see [available models](https://platform.openai.com/docs/models))
   - **Temperature**: 0-2 (0 = deterministic, 2 = creative)
   - **Max Tokens**: Leave empty for default or set a limit

#### Troubleshooting

- **Invalid API Key**: Ensure you copied the full key including the `sk-` prefix
- **Rate Limits**: Check your [usage limits](https://platform.openai.com/account/limits)
- **Model Not Available**: Verify you have access to the model in your account

---

### Anthropic (Claude)

Anthropic provides access to Claude models through their API.

#### Step 1: Get Your API Key

1. Visit [Anthropic Console](https://console.anthropic.com/settings/keys)
2. Sign in or create an account
3. Click "Create Key"
4. Copy the key (it starts with `sk-ant-`)

#### Step 2: Configure in Open Hivemind

1. Go to Admin Panel > LLM Providers
2. Click "Add Provider"
3. Select "Anthropic (Claude)" as the provider type
4. Enter the following:
   - **API Key**: Your Anthropic API key
   - **Model**: `claude-3-5-sonnet-20241022` or other [available models](https://docs.anthropic.com/en/docs/models-overview)
   - **Temperature**: 0-1 (0 = deterministic, 1 = creative)
   - **Max Tokens**: Required (e.g., 4096)

#### Important Notes

- Max Tokens is **required** for Anthropic API calls
- Claude models have different context windows and capabilities

---

### Flowise

Flowise is an open-source UI visual tool to build LLM apps.

#### Step 1: Set Up Flowise

1. Follow the [Flowise installation guide](https://docs.flowiseai.com/getting-started)
2. Access your Flowise instance (default: `http://localhost:3000`)
3. Create a chatflow in the Flowise UI
4. Enable API authentication in Flowise settings

#### Step 2: Get Your Configuration

1. In Flowise, go to Settings > API Keys
2. Create an API key
3. Note your chatflow ID from the URL when viewing a chatflow

#### Step 3: Configure in Open Hivemind

1. Go to Admin Panel > LLM Providers
2. Click "Add Provider"
3. Select "Flowise" as the provider type
4. Enter the following:
   - **API Key**: Your Flowise API key
   - **API URL**: Your Flowise base URL (e.g., `http://localhost:3000/api/v1`)
   - **Chatflow ID**: The ID of your chatflow

---

### OpenWebUI

OpenWebUI is a self-hosted web UI for large language models.

#### Step 1: Set Up OpenWebUI

1. Follow the [OpenWebUI installation guide](https://docs.openwebui.com/getting-started/)
2. Access your OpenWebUI instance

#### Step 2: Get Your API Key

1. In OpenWebUI, go to Settings > API Keys
2. Generate a new API key

#### Step 3: Configure in Open Hivemind

1. Go to Admin Panel > LLM Providers
2. Click "Add Provider"
3. Select "OpenWebUI" as the provider type
4. Enter the following:
   - **API Key**: Your OpenWebUI API key
   - **API URL**: Your OpenWebUI base URL (e.g., `http://localhost:3000/api`)
   - **Model**: The model name from OpenWebUI

---

### OpenSwarm

OpenSwarm enables multi-agent collaboration.

#### Step 1: Set Up OpenSwarm

1. Follow the [OpenSwarm documentation](https://openswarm.ai/docs/getting-started)
2. Start your OpenSwarm instance

#### Step 2: Configure in Open Hivemind

1. Go to Admin Panel > LLM Providers
2. Click "Add Provider"
3. Select "OpenSwarm" as the provider type
4. Enter the following:
   - **API Key**: `dummy-key` for local development
   - **API URL**: Your OpenSwarm base URL (e.g., `http://localhost:8000/v1`)
   - **Team**: Your team name
   - **Swarm ID**: Your swarm identifier

---

## Messenger Providers

### Discord

Connect your bot to Discord servers.

#### Step 1: Create a Discord Application

1. Visit [Discord Developer Portal](https://discord.com/developers/applications)
2. Click "New Application"
3. Give it a name and click "Create"

#### Step 2: Create a Bot

1. In your application, go to "Bot" section
2. Click "Add Bot" and confirm
3. Under "Token", click "Reset Token" and copy it
4. Enable these Privileged Gateway Intents:
   - Presence Intent
   - Server Members Intent
   - Message Content Intent

#### Step 3: Get Your IDs

1. Enable Developer Mode in Discord:
   - User Settings > Advanced > Developer Mode
2. Get your Application/Client ID:
   - Go to "General Information" in Developer Portal
   - Copy the "Application ID"
3. Get Server (Guild) ID:
   - Right-click your server in Discord
   - Click "Copy Server ID"
4. Get Channel ID:
   - Right-click the channel in Discord
   - Click "Copy Channel ID"

#### Step 4: Invite Bot to Server

1. In Developer Portal, go to "OAuth2" > "URL Generator"
2. Select scopes: `bot`, `applications.commands`
3. Select bot permissions you need
4. Copy the generated URL and open it in browser
5. Select your server and authorize

#### Step 5: Configure in Open Hivemind

1. Go to Admin Panel > Messenger Providers
2. Click "Add Provider"
3. Select "Discord" as the provider type
4. Enter the following:
   - **Bot Token**: Your bot token from Step 2
   - **Client ID**: Your application ID
   - **Guild ID**: Your server ID
   - **Channel ID**: Your default channel ID
   - **Voice Channel ID**: (Optional) For voice features

---

### Slack

Connect your bot to Slack workspaces.

#### Step 1: Create a Slack App

1. Visit [Slack API](https://api.slack.com/apps)
2. Click "Create New App"
3. Choose "From scratch"
4. Give it a name and select workspace
5. Click "Create App"

#### Step 2: Configure Your App

1. Go to "OAuth & Permissions"
2. Add these Bot Token Scopes:
   - `chat:write`
   - `channels:read`
   - `channels:history`
   - `im:history`
   - `im:write`
   - `users:read`
3. Click "Install to Workspace"
4. Copy the "Bot User OAuth Token" (starts with `xoxb-`)

#### Step 3: Enable Socket Mode

1. Go to "Socket Mode" in your app settings
2. Enable Socket Mode
3. Generate an App-Level Token with `connections:write` scope
4. Copy the token (starts with `xapp-`)

#### Step 4: Get Additional Info

1. Go to "Basic Information"
2. Copy the "Signing Secret"
3. Get Channel IDs:
   - Right-click channel > View channel details > Copy link
   - The ID is in the URL (e.g., `C08BC0X4DFD`)

#### Step 5: Configure in Open Hivemind

1. Go to Admin Panel > Messenger Providers
2. Click "Add Provider"
3. Select "Slack" as the provider type
4. Enter the following:
   - **Bot Token**: Your Bot User OAuth Token (`xoxb-...`)
   - **App Token**: Your App-Level Token (`xapp-...`)
   - **Signing Secret**: From Basic Information
   - **Default Channel ID**: Your default channel
   - **Mode**: Select "Socket Mode" (recommended)
   - **Channels to Join**: Comma-separated channel IDs

---

### Telegram

Connect your bot to Telegram.

#### Step 1: Create a Bot with BotFather

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Start a chat and send `/newbot`
3. Follow the prompts:
   - Choose a name for your bot
   - Choose a username (must end in 'bot')
4. Copy the bot token (format: `123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11`)

#### Step 2: Configure Bot Settings (Optional)

Send these commands to BotFather:
- `/setdescription` - Set bot description
- `/setabouttext` - Set about text
- `/setuserpic` - Set profile picture
- `/setcommands` - Set command list

#### Step 3: Get Chat ID (Optional)

To get a chat ID:
1. Send a message to your bot
2. Visit: `https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates`
3. Look for `"chat":{"id":...}` in the response

#### Step 4: Configure in Open Hivemind

1. Go to Admin Panel > Messenger Providers
2. Click "Add Provider"
3. Select "Telegram" as the provider type
4. Enter the following:
   - **Bot Token**: Your bot token from BotFather
   - **Chat ID**: (Optional) Default chat ID
   - **Webhook URL**: (Optional) For webhook mode instead of polling

#### Additional Resources

- [Telegram Bot API Reference](https://core.telegram.org/bots/api)
- [Bot Tutorial](https://core.telegram.org/bots/tutorial)

---

### Mattermost

Connect your bot to Mattermost servers.

#### Step 1: Create a Bot Account

1. Log in to your Mattermost server as a System Admin
2. Go to **System Console** > **Integrations** > **Bot Accounts**
3. Enable bot accounts if not already enabled
4. Click **Add Bot Account**
5. Fill in bot details:
   - Username
   - Display Name
   - Description
6. Create the bot

#### Step 2: Create Personal Access Token

1. Go to **Main Menu** > **Account Settings** > **Security** > **Personal Access Tokens**
2. Click **Create Token**
3. Enter a description
4. Click **Save**
5. Copy the token immediately (you won't see it again)

#### Step 3: Get Team and Channel IDs

1. Navigate to your team
2. The Team ID is in the URL: `https://mattermost.example.com/team-id/channels/...`
3. For Channel ID, go to channel and click the channel name
4. Select "View Info" - the ID may be visible, or check browser developer tools

#### Step 4: Configure in Open Hivemind

1. Go to Admin Panel > Messenger Providers
2. Click "Add Provider"
3. Select "Mattermost" as the provider type
4. Enter the following:
   - **Server URL**: Your Mattermost server URL
   - **Access Token**: Your personal access token
   - **Team ID**: The team ID
   - **Default Channel**: Channel name
   - **Channel ID**: Channel ID

---

## Common Issues

### All Providers

**Issue**: "Connection failed" or "Authentication failed"
- Verify all credentials are correct
- Check that the service is running and accessible
- Ensure firewall rules allow connections
- Check service logs for detailed error messages

**Issue**: "Provider not responding"
- Verify the URL/endpoint is correct
- Check if the service requires a VPN or specific network
- Ensure the service is not rate-limiting your requests

### Security Best Practices

1. **Never commit credentials** to version control
2. **Use environment variables** for sensitive data
3. **Rotate API keys** regularly
4. **Limit bot permissions** to only what's needed
5. **Monitor usage** to detect unauthorized access
6. **Enable 2FA** on provider accounts where available

---

## Getting Help

If you encounter issues not covered here:

1. Check the [Open Hivemind Discussions](https://github.com/yourusername/open-hivemind/discussions)
2. Review provider-specific documentation linked throughout this guide
3. Open an issue on [GitHub](https://github.com/yourusername/open-hivemind/issues)
4. Join our community chat (if available)

For provider-specific issues, also consult:
- [OpenAI Community](https://community.openai.com/)
- [Anthropic Support](https://support.anthropic.com/)
- [Discord Developer Community](https://discord.gg/discord-developers)
- [Slack API Community](https://slackcommunity.com/)
- [Telegram Bot Support](https://t.me/BotSupport)
