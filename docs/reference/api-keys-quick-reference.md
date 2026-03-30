# API Keys Quick Reference

Quick links to get API keys and tokens for all supported providers.

## LLM Providers

| Provider | Get API Key | Documentation |
|----------|-------------|---------------|
| **OpenAI** | [Get API Key](https://platform.openai.com/api-keys) | [Docs](https://platform.openai.com/docs/api-reference) |
| **Anthropic** | [Get API Key](https://console.anthropic.com/settings/keys) | [Docs](https://docs.anthropic.com/en/api/getting-started) |
| **Flowise** | [Setup Guide](https://docs.flowiseai.com/getting-started) | [Docs](https://docs.flowiseai.com/) |
| **OpenWebUI** | [Setup Guide](https://docs.openwebui.com/getting-started/) | [Docs](https://docs.openwebui.com/) |
| **OpenSwarm** | [Setup Guide](https://openswarm.ai/docs/getting-started) | [Docs](https://openswarm.ai/docs) |

## Messenger Providers

| Provider | Get Started | Key Documentation |
|----------|-------------|-------------------|
| **Discord** | [Create Application](https://discord.com/developers/applications) | [Bot Setup](https://discord.com/developers/docs/topics/oauth2#bots) |
| **Slack** | [Create App](https://api.slack.com/apps) | [Quickstart](https://api.slack.com/start/quickstart) |
| **Telegram** | [BotFather](https://t.me/botfather) | [Tutorial](https://core.telegram.org/bots/tutorial) |
| **Mattermost** | [Bot Accounts](https://developers.mattermost.com/integrate/reference/bot-accounts/) | [Getting Started](https://developers.mattermost.com/integrate/getting-started/) |

## API Key Formats

Knowing the expected format helps validate your keys:

| Provider | Key Format | Example |
|----------|-----------|---------|
| OpenAI | `sk-...` | `sk-proj-abc123...` |
| Anthropic | `sk-ant-...` | `sk-ant-api03-abc123...` |
| Discord | 70+ characters | `MTk4NjIyNDgzNDc0MDY...` |
| Slack Bot Token | `xoxb-...` | `xoxb-1234-5678-abcd...` |
| Slack App Token | `xapp-...` | `xapp-1-A01B2C3D4-5678...` |
| Telegram | `<id>:<token>` | `123456789:ABCdefGHIjklMNOpqr...` |

## Common ID Locations

### Discord

- **Application/Client ID**: Developer Portal > General Information
- **Guild (Server) ID**: Right-click server > Copy Server ID
- **Channel ID**: Right-click channel > Copy Channel ID
- Enable Developer Mode: User Settings > Advanced > Developer Mode

### Slack

- **Channel ID**: From channel URL or right-click > View channel details
- **User ID**: From user profile
- **Workspace ID**: From workspace URL

### Telegram

- **Chat ID**: Send message to bot, then visit `https://api.telegram.org/bot<TOKEN>/getUpdates`
- **Bot Username**: From BotFather when creating bot

### Mattermost

- **Team ID**: From URL when viewing team
- **Channel ID**: Click channel name > View Info
- **User ID**: From user profile

## Security Reminders

- Never share or commit API keys
- Rotate keys regularly
- Use environment variables for production
- Limit permissions to minimum required
- Enable 2FA on provider accounts
- Monitor usage for anomalies

## Troubleshooting

### Invalid API Key Errors

1. Check the key format matches the expected pattern
2. Ensure you copied the entire key (no spaces/line breaks)
3. Verify the key hasn't been revoked
4. Check if the key has the required permissions

### Permission Errors

1. Review OAuth scopes (Slack, Discord)
2. Check bot permissions in server/workspace
3. Verify privileged intents are enabled (Discord)
4. Ensure bot is invited to correct channels

### Connection Issues

1. Verify URL endpoints are correct
2. Check service is running and accessible
3. Test with curl/Postman first
4. Review firewall/network settings

## Rate Limits

| Provider | Rate Limit | Documentation |
|----------|-----------|---------------|
| OpenAI | Varies by tier | [Limits](https://platform.openai.com/account/limits) |
| Anthropic | Varies by plan | [Contact Support](https://support.anthropic.com/) |
| Discord | Varies by endpoint | [Rate Limits](https://discord.com/developers/docs/topics/rate-limits) |
| Slack | Varies by method | [Rate Limits](https://api.slack.com/docs/rate-limits) |
| Telegram | 30 msg/second | [Limits](https://core.telegram.org/bots/faq#broadcasting-to-users) |

## Need More Help?

See the full [Provider Setup Guide](../getting-started/provider-setup-guide.md) for detailed instructions.
