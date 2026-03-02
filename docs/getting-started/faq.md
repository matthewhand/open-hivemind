# Frequently Asked Questions (FAQ)

Navigation: [Docs Index](../README.md) | [Installation](installation.md) | [Troubleshooting](../configuration/swarm-troubleshooting.md)

---

## General Questions

### What is Open-Hivemind?

Open-Hivemind is a multi-agent orchestration framework that combines messaging platforms (Discord, Slack, Mattermost) with LLM providers to create AI-powered bots. It provides a unified WebUI for configuration and monitoring.

### What platforms does Open-Hivemind support?

Open-Hivemind supports:
- **Discord** - Full bot integration with voice, channels, and DMs
- **Slack** - Workspace apps, threads, and reactions
- **Mattermost** - Self-hosted team communication

### What LLM providers are supported?

| Provider | Status | Notes |
|----------|--------|-------|
| OpenAI | ✅ Stable | GPT-4, GPT-3.5 Turbo |
| Flowise | ✅ Stable | Low-code AI workflows |
| OpenWebUI | ✅ Stable | Local Ollama models |
| OpenSwarm | ✅ Stable | Multi-agent orchestration |
| Perplexity | ✅ Stable | Online search LLM |
| Replicate | ✅ Stable | Run open-source models |
| N8N | ✅ Stable | Workflow automation |

---

## Installation & Setup

### How do I get started quickly?

1. Clone the repository: `git clone https://github.com/matthewhand/open-hivemind.git`
2. Copy `.env.sample` to `.env`
3. Add your Discord bot token and OpenAI API key
4. Run `npm run dev`
5. Open `http://localhost:3028`

See [Installation Guide](installation.md) for detailed instructions.

### Which deployment method should I use?

| Method | Best For | Difficulty |
|--------|----------|------------|
| **Pinokio** | Quick local testing | Easiest |
| **Docker** | Production/Production-like | Easy |
| **Manual Node.js** | Development/Customization | Moderate |

### What are the minimum requirements?

- **Node.js**: 18+
- **RAM**: 4GB (8GB recommended)
- **Storage**: 1GB for application + logs
- **Network**: Internet access for LLM APIs

---

## Configuration

### How do I configure multiple bots?

Use comma-separated tokens in your environment:

```bash
DISCORD_BOT_TOKEN=token1,token2,token3
```

Then configure each bot with prefix:
```bash
BOT1_LLM_PROVIDER=openai
BOT2_LLM_PROVIDER=flowise
BOT3_LLM_PROVIDER=openwebui
```

See [Multi-Bot Setup](../configuration/multi-bot-setup.md) for details.

### How do I switch between LLM providers?

**Option 1**: Environment variable
```bash
LLM_PROVIDER=flowise
FLOWISE_BASE_URL=http://localhost:3000
```

**Option 2**: WebUI
1. Navigate to **Bots** → Select bot → **Settings**
2. Change **LLM Provider** dropdown
3. Save changes

### How do I create a custom persona?

1. Navigate to **Personas** in the WebUI
2. Click **Create New**
3. Fill in:
   - **Name**: Persona identifier
   - **Description**: Brief description
   - **System Instructions**: Behavior guidelines
4. Save and assign to a bot

---

## LLM Providers

### Why isn't my Flowise connection working?

Common issues:
1. **Wrong URL**: Ensure `FLOWISE_BASE_URL` is correct
2. **Chatflow not published**: Publish your chatflow in Flowise
3. **Missing channel ID**: REST mode requires proper metadata

See [Flowise Setup Guide](../configuration/flowise-setup.md) for troubleshooting steps.

### Can I use local models with OpenWebUI?

Yes! Install Ollama, start OpenWebUI with Docker, and configure:

```bash
LLM_PROVIDER=openwebui
OPENWEBUI_BASE_URL=http://localhost:8080
```

See [OpenWebUI Setup Guide](../configuration/openwebui-setup.md).

### How do I handle rate limits with OpenAI?

1. Set per-channel rate limits:
   ```bash
   MESSAGE_RATE_LIMIT_PER_CHANNEL=10
   ```
2. Use multiple API keys for redundancy
3. Consider caching frequent responses

---

## Messaging Platforms

### My Discord bot won't connect

1. **Check Token**: Verify `DISCORD_BOT_TOKEN` is correct
2. **Enable Intents**: Go to Discord Developer Portal → Bot → Privileged Intents
   - Enable: `MESSAGE CONTENT`, `GUILD MESSAGES`
3. **Check Permissions**: Bot needs:
   - Send Messages
   - Read Message History
   - Mention Everyone (optional)

### How do I set up Slack?

1. Create a Slack App at https://api.slack.com/apps
2. Enable **Socket Mode** for local development
3. Add Bot Token Scopes:
   - `chat:write`
   - `channels:read`
   - `groups:read`
4. Install app to workspace
5. Copy Bot User OAuth Token to `SLACK_BOT_TOKEN`

### How do I connect to Mattermost?

```bash
MESSAGE_PROVIDER=mattermost
MATTERMOST_URL=https://your-mattermost.com
MATTERMOST_BOT_TOKEN=your-bot-token
MATTERMOST_TEAM=your-team
```

---

## Error Messages

### "No valid LLM providers initialized"

**Cause**: No LLM provider configured or credentials missing.

**Solution**:
1. Check `LLM_PROVIDER` environment variable
2. Verify provider-specific credentials (e.g., `OPENAI_API_KEY`)
3. Check logs: `DEBUG=app:getLlmProvider npm run dev`

### "channelId is missing from metadata"

**Cause**: Flowise SDK mode without proper chatflow ID.

**Solution**:
- Use REST mode: `FLOWISE_USE_REST=true`
- Or set: `FLOWISE_CONVERSATION_CHATFLOW_ID=your-id`

### "Connection timeout" when calling LLM

**Cause**: Network issues or slow provider response.

**Solution**:
1. Increase timeout: `OPENAI_TIMEOUT=30000`
2. Check network connectivity
3. Try a different/smaller model

### "Rate limit exceeded" errors

**Cause**: Too many requests to Discord or LLM.

**Solution**:
1. Reduce message volume
2. Add delays between messages
3. Use `MESSAGE_RATE_LIMIT_PER_CHANNEL`

---

## Performance

### How many bots can I run?

Depends on:
- Message volume
- LLM provider response time
- Server resources

**Guidelines**:
- **1-3 bots**: Standard hardware (4GB RAM)
- **5-10 bots**: 8GB+ RAM, multi-core CPU
- **20+ bots**: Consider clustering or message queuing

### How do I improve response times?

1. **Use faster LLM providers**: OpenAI > Flowise > OpenWebUI (local)
2. **Enable caching**: At provider level
3. **Reduce message history**: Lower `MESSAGE_HISTORY_MAX_MESSAGES`
4. **Use streaming**: For better perceived latency

### Memory usage is too high

1. Limit concurrent bots
2. Reduce message history retention
3. Use lighter LLM models
4. Monitor with: `DEBUG=app:* npm run dev`

---

## Security

### How do I secure my deployment?

1. **Use HTTPS** in production
2. **Set ADMIN_PASSWORD** environment variable
3. **Enable authentication** on all endpoints
4. **Rotate API keys** regularly
5. **Restrict network access** with firewall

### Can I use environment variables for secrets?

Yes! Environment variables are the recommended way:
```bash
OPENAI_API_KEY=sk-...
DISCORD_BOT_TOKEN=...
```

Never commit secrets to version control.

---

## Troubleshooting

### Bot is responding slowly

1. Check LLM provider status
2. Review rate limits
3. Enable debug logging: `DEBUG=app:* npm run dev`
4. Check server resources: `htop` or `top`

### Bot isn't responding to messages

1. Verify bot is connected (check logs)
2. Check `MESSAGE_WAKEWORDS` includes your prefix
3. Verify `MESSAGE_ONLY_WHEN_SPOKEN_TO=false` for auto-reply
4. Check channel is in allowed channels list

### Configuration changes not taking effect

1. Restart the server: `npm run dev`
2. Check for syntax errors in `.env`
3. Clear WebUI overrides: `config/user/bot-overrides.json`
4. Use hot reload: POST to `/api/config/hot-reload`

---

## Advanced

### Can I run Open-Hivemind in Docker?

Yes! See [Docker Setup](../operations/docker-images.md):

```bash
docker run --rm \
  --env-file .env \
  -p 3028:3028 \
  matthewhand/open-hivemind:latest
```

### How do I set up MCP servers?

1. Navigate to **MCP Servers** in WebUI
2. Click **Add Server**
3. Enter server URL and API key
4. Click **Connect**
5. Configure tool guards (optional)

See [MCP Documentation](../mcp/overview.md) for details.

### Can I integrate with custom LLM providers?

Yes! Implement the `ILlmProvider` interface:

1. Create `src/integrations/your-provider/yourProvider.ts`
2. Implement required methods
3. Register in `src/llm/getLlmProvider.ts`

---

## Getting Help

### Where can I get more help?

1. **GitHub Issues**: https://github.com/matthewhand/open-hivemind/issues
2. **Discord Community**: https://discord.gg/open-hivemind
3. **Documentation**: https://docs.open-hivemind.com

### How do I report a bug?

1. Check existing issues first
2. Include:
   - Open-Hivemind version (`npm run start -- --version`)
   - Platform (Discord/Slack/Mattermost)
   - LLM Provider
   - Steps to reproduce
   - Relevant logs

### Can I contribute to Open-Hivemind?

Yes! See [Contributing Guide](../reference/contributing.md) for:
- Code style guidelines
- Pull request process
- Development setup
