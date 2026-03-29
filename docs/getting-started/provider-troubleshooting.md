# Provider Troubleshooting Guide

Common issues and solutions when setting up and using providers in Open Hivemind.

## Table of Contents

- [Authentication Issues](#authentication-issues)
- [Connection Problems](#connection-problems)
- [Permission Errors](#permission-errors)
- [Rate Limiting](#rate-limiting)
- [Configuration Issues](#configuration-issues)
- [Provider-Specific Issues](#provider-specific-issues)

---

## Authentication Issues

### Invalid API Key

**Symptoms:**
- "Invalid API key" or "Authentication failed" errors
- 401 Unauthorized responses

**Solutions:**

1. **Verify Key Format**
   - OpenAI: Should start with `sk-`
   - Anthropic: Should start with `sk-ant-`
   - Slack Bot Token: Should start with `xoxb-`
   - Check for extra spaces or line breaks

2. **Check Key Status**
   - Log into provider dashboard
   - Verify key hasn't been revoked
   - Regenerate key if necessary

3. **Environment Variables**
   ```bash
   # Check if environment variable is set correctly
   echo $OPENAI_API_KEY

   # Verify no trailing spaces
   printenv | grep API_KEY
   ```

4. **Key Permissions**
   - Ensure key has necessary scopes/permissions
   - Some providers have different key types (read-only vs full access)

### Token Expired

**Symptoms:**
- "Token expired" errors
- Previously working setup now fails

**Solutions:**

1. Generate new token from provider dashboard
2. Update configuration in Open Hivemind
3. For OAuth tokens (Slack), re-authorize the app

---

## Connection Problems

### Cannot Reach Provider

**Symptoms:**
- "Connection timeout" errors
- "Unable to connect to service" messages
- ECONNREFUSED errors

**Solutions:**

1. **Verify Service URL**
   ```bash
   # Test connectivity
   curl -I https://api.openai.com/v1

   # For local services
   curl -I http://localhost:3000/api
   ```

2. **Check Service Status**
   - Verify the service is running
   - For local services: `docker ps` or `systemctl status`
   - For cloud services: Check provider status page

3. **Firewall Rules**
   ```bash
   # Check if port is accessible
   telnet localhost 3000

   # Or use nc
   nc -zv localhost 3000
   ```

4. **Network Configuration**
   - Check if VPN is required
   - Verify DNS resolution
   - Test from same network as Open Hivemind

5. **Proxy Settings**
   - Configure HTTP_PROXY/HTTPS_PROXY if needed
   - Check corporate proxy requirements

### SSL/TLS Errors

**Symptoms:**
- "SSL certificate problem" errors
- "Unable to verify certificate" messages

**Solutions:**

1. **Update Certificates**
   ```bash
   # Ubuntu/Debian
   sudo apt-get update
   sudo apt-get install ca-certificates

   # Update cert store
   sudo update-ca-certificates
   ```

2. **For Self-Signed Certificates**
   - Add certificate to system trust store
   - Use `NODE_TLS_REJECT_UNAUTHORIZED=0` (dev only!)

3. **Check System Time**
   ```bash
   # Incorrect time can cause SSL errors
   date
   sudo ntpdate -s time.nist.gov
   ```

---

## Permission Errors

### Discord: Missing Permissions

**Symptoms:**
- "Missing Access" errors
- Bot can't read/send messages
- "Unknown Channel" errors

**Solutions:**

1. **Check Bot Permissions**
   - Go to Server Settings > Roles
   - Find bot role and verify permissions:
     - Read Messages/View Channels
     - Send Messages
     - Read Message History

2. **Enable Privileged Intents**
   - Discord Developer Portal > Bot
   - Enable:
     - Presence Intent
     - Server Members Intent
     - Message Content Intent

3. **Channel Permissions**
   - Right-click channel > Edit Channel > Permissions
   - Add bot role with appropriate permissions

4. **Re-invite Bot**
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=YOUR_PERMISSIONS&scope=bot%20applications.commands
   ```

### Slack: Missing Scopes

**Symptoms:**
- "missing_scope" errors
- "not_allowed_token_type" errors

**Solutions:**

1. **Add Required Scopes**
   - Slack API > OAuth & Permissions > Scopes
   - Add Bot Token Scopes:
     - `chat:write`
     - `channels:read`
     - `channels:history`
     - `im:history`
     - `im:write`

2. **Reinstall App**
   - After adding scopes, reinstall app to workspace
   - Get new Bot Token

3. **Socket Mode**
   - Enable Socket Mode for real-time features
   - Generate App-Level Token with `connections:write`

### Telegram: Bot Not Responding

**Symptoms:**
- Bot doesn't respond to messages
- "Bot not found" errors

**Solutions:**

1. **Check Bot Status**
   ```bash
   # Verify bot token
   curl https://api.telegram.org/bot<YOUR_TOKEN>/getMe
   ```

2. **Privacy Settings**
   - By default, bots in groups only see messages that:
     - Start with `/`
     - Mention the bot
     - Are replies to bot messages
   - Disable privacy mode: `/setprivacy` in BotFather

3. **Add Bot to Chat**
   - Ensure bot is added to group/channel
   - Check bot has necessary permissions

---

## Rate Limiting

### Hitting Rate Limits

**Symptoms:**
- "Rate limit exceeded" errors
- 429 Too Many Requests
- Temporary service unavailable

**Solutions:**

1. **Implement Backoff**
   - Open Hivemind has built-in rate limit handling
   - Check logs for rate limit warnings

2. **Reduce Request Frequency**
   - Lower polling intervals
   - Batch requests where possible
   - Cache responses

3. **Upgrade Plan**
   - OpenAI: Check [rate limits by tier](https://platform.openai.com/account/limits)
   - Anthropic: Contact sales for higher limits
   - Discord: Use gateway events instead of polling

4. **Check Current Usage**
   ```bash
   # OpenAI
   curl https://api.openai.com/v1/usage \
     -H "Authorization: Bearer $OPENAI_API_KEY"
   ```

### Provider-Specific Limits

| Provider | Limit | Solution |
|----------|-------|----------|
| OpenAI | Varies by tier | Upgrade tier or optimize usage |
| Anthropic | Per-model limits | Distribute across models |
| Discord | 50 requests/second | Use gateway events |
| Slack | Varies by method | Use Socket Mode |
| Telegram | 30 messages/second | Implement queue |

---

## Configuration Issues

### Invalid Configuration

**Symptoms:**
- "Invalid configuration" errors
- Missing required fields
- Type validation errors

**Solutions:**

1. **Check Required Fields**
   - Anthropic: `maxTokens` is required
   - Discord: Need both `token` and `clientId`
   - Slack Socket Mode: Need both `botToken` and `appToken`

2. **Validate Field Types**
   - Temperature: Should be number (0-2 for OpenAI, 0-1 for Anthropic)
   - URLs: Must include protocol (http:// or https://)
   - IDs: Must be valid format for provider

3. **Review Examples**
   ```json
   {
     "openai": {
       "apiKey": "sk-...",
       "model": "gpt-4",
       "temperature": 0.7,
       "maxTokens": 1000
     }
   }
   ```

### Environment Variable Override Issues

**Symptoms:**
- UI changes not taking effect
- "Environment Override" indicator shown

**Solutions:**

1. **Check Environment Variables**
   ```bash
   # List all provider-related env vars
   printenv | grep -E '(OPENAI|DISCORD|SLACK|TELEGRAM)'
   ```

2. **Priority Order**
   - Environment variables override UI configuration
   - To use UI: unset or remove environment variables
   - To enforce env vars: Keep them set (recommended for production)

3. **Restart Service**
   ```bash
   # After changing environment variables
   systemctl restart open-hivemind
   # or
   docker-compose restart
   ```

---

## Provider-Specific Issues

### OpenAI: Model Not Available

**Symptoms:**
- "Model not found" errors
- "The model does not exist" errors

**Solutions:**

1. Check [available models](https://platform.openai.com/docs/models)
2. Verify your account has access to the model
3. Use correct model name (case-sensitive):
   - `gpt-4`
   - `gpt-4-turbo-preview`
   - `gpt-3.5-turbo`

### Anthropic: Max Tokens Required

**Symptoms:**
- "max_tokens is required" error

**Solutions:**

1. Set `maxTokens` in configuration
2. Recommended values:
   - Small responses: 1024
   - Medium responses: 4096
   - Large responses: 8192

### Discord: Sharding Required

**Symptoms:**
- Bot in many servers becomes unresponsive
- "Sharding required" errors

**Solutions:**

1. Implement sharding (for 2500+ servers)
2. Check Discord's [sharding guide](https://discord.com/developers/docs/topics/gateway#sharding)

### Slack: Socket Mode vs HTTP

**Symptoms:**
- Events not received
- Bot doesn't respond

**Solutions:**

1. **Choose Right Mode**
   - Socket Mode: Easier, no public URL needed
   - HTTP Mode: Better for high traffic

2. **Socket Mode Setup**
   - Enable Socket Mode in app settings
   - Generate App-Level Token
   - Use `xapp-...` token in configuration

3. **HTTP Mode Setup**
   - Need public URL with HTTPS
   - Configure Event Subscriptions URL
   - Verify Request URL in Slack

### Flowise: Chatflow Not Found

**Symptoms:**
- "Chatflow not found" errors
- "Invalid chatflow ID"

**Solutions:**

1. **Get Correct ID**
   - Open chatflow in Flowise UI
   - Check URL: `/canvas/<CHATFLOW_ID>`
   - Or use API: `GET /api/v1/chatflows`

2. **Verify API Access**
   ```bash
   curl http://localhost:3000/api/v1/chatflows \
     -H "Authorization: Bearer YOUR_API_KEY"
   ```

### Mattermost: Websocket Connection Failed

**Symptoms:**
- "Websocket connection failed"
- Bot doesn't receive messages

**Solutions:**

1. **Check Server Configuration**
   - Ensure WebSocket is enabled
   - Verify reverse proxy allows WebSocket

2. **Update Connection URL**
   - Use `wss://` for HTTPS
   - Use `ws://` for HTTP

---

## Debugging Tips

### Enable Debug Logging

```bash
# Set log level
export LOG_LEVEL=debug

# Restart service
systemctl restart open-hivemind
```

### Test Provider Manually

```bash
# OpenAI
curl https://api.openai.com/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-4",
    "messages": [{"role": "user", "content": "Hello"}]
  }'

# Discord
curl -H "Authorization: Bot $DISCORD_TOKEN" \
  https://discord.com/api/v10/users/@me

# Slack
curl -X POST https://slack.com/api/chat.postMessage \
  -H "Authorization: Bearer $SLACK_BOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"channel":"C1234","text":"Test"}'
```

### Check System Resources

```bash
# Memory usage
free -h

# Disk space
df -h

# CPU usage
top

# Network connections
netstat -tulpn | grep node
```

### Review Logs

```bash
# System logs
journalctl -u open-hivemind -f

# Docker logs
docker logs -f open-hivemind

# Application logs
tail -f /var/log/open-hivemind/app.log
```

---

## Getting Help

If you're still experiencing issues:

1. **Gather Information**
   - Error messages (full text)
   - Configuration (redact sensitive data)
   - Logs (relevant portions)
   - Steps to reproduce

2. **Check Resources**
   - [Provider Setup Guide](./provider-setup-guide.md)
   - [API Keys Reference](../reference/api-keys-quick-reference.md)
   - Provider documentation

3. **Community Support**
   - GitHub Issues: Report bugs and request features
   - Discussions: Ask questions and share solutions
   - Discord/Slack: Real-time community help

4. **Provider Support**
   - [OpenAI Help Center](https://help.openai.com/)
   - [Anthropic Support](https://support.anthropic.com/)
   - [Discord Developer Support](https://discord.gg/discord-developers)
   - [Slack API Community](https://slackcommunity.com/)
   - [Telegram Bot Support](https://t.me/BotSupport)
