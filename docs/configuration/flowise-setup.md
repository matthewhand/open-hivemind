# Flowise Setup Guide

Navigation: [Docs Index](../README.md) | [Configuration Overview](overview.md) | [Provider Cheat Sheet](provider-cheatsheet.md)

---

## Overview

Flowise is an open-source low-code platform for building AI agents and workflows. Open-Hivemind integrates with Flowise to provide LLM-powered responses using your custom Flowise chatflows.

## Prerequisites

- **Flowise Instance**: You need a running Flowise server
- **Network Access**: Your Flowise instance must be accessible from the Open-Hivemind server
- **Chatflow ID**: A published Flowise chatflow to use as the LLM backend

## Quick Setup

### Step 1: Start Flowise

```bash
# Using Docker
docker run -d --name flowise -p 3000:3000 flowiseai/flowise

# Or using npm
npm install -g flowise
flowise start
```

### Step 2: Create a Chatflow

1. Open Flowise at `http://localhost:3000`
2. Create a new chatflow or use an existing one
3. Configure your LLM (OpenAI, Anthropic, Ollama, etc.)
4. **Important**: Publish the chatflow and copy the Chatflow ID from the URL

### Step 3: Configure Open-Hivemind

#### Option A: Environment Variables

```bash
# Required
LLM_PROVIDER=flowise
FLOWISE_BASE_URL=http://localhost:3000

# REST Mode (simple, recommended for beginners)
FLOWISE_USE_REST=true

# SDK Mode (advanced, for complex flows)
FLOWISE_USE_REST=false
FLOWISE_CONVERSATION_CHATFLOW_ID=your-chatflow-id
```

#### Option B: WebUI Configuration

1. Navigate to **Bots** → **Create/Edit Bot**
2. Select **Flowise** as the LLM Provider
3. Enter the Flowise Base URL
4. Choose REST or SDK mode
5. For SDK mode, enter your Chatflow ID

## Configuration Options

### Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `FLOWISE_BASE_URL` | Yes | - | Base URL of your Flowise instance |
| `FLOWISE_USE_REST` | No | `true` | Use REST API instead of SDK |
| `FLOWISE_CONVERSATION_CHATFLOW_ID` | No* | - | Chatflow ID for SDK mode (*required if `FLOWISE_USE_REST=false`) |
| `FLOWISE_API_KEY` | No | - | Flowise API key (if enabled) |
| `FLOWISE_TIMEOUT` | No | `30000` | Request timeout in milliseconds |

### REST Mode vs SDK Mode

#### REST Mode (Recommended)

REST mode is simpler and works with any published chatflow:

```bash
FLOWISE_USE_REST=true
# No chatflow ID needed - the user/channel context is passed as metadata
```

The message context (channel ID, user ID) is automatically passed to Flowise as metadata.

#### SDK Mode

SDK mode gives you more control but requires a specific chatflow setup:

```bash
FLOWISE_USE_REST=false
FLOWISE_CONVERSATION_CHATFLOW_ID=abc123
```

Use this mode when you need to:
- Use specific Flowise conversation management
- Implement complex multi-turn conversation logic
- Access Flowise's internal memory systems

## Connecting to Remote Flowise

### Cloud Deployment

For Flowise Cloud:
```bash
FLOWISE_BASE_URL=https://your-instance.flowise.cloud
FLOWISE_API_KEY=your-api-key
```

### Self-Hosted with Authentication

```bash
FLOWISE_BASE_URL=https://flowise.yourdomain.com
FLOWISE_API_KEY=your-secret-key
```

### Docker Network

If running in the same Docker network:
```bash
FLOWISE_BASE_URL=http://flowise:3000
```

## Chatflow Best Practices

### Required Nodes

Ensure your chatflow includes:
1. **Chat Models** - OpenAI, Anthropic, Ollama, etc.
2. **Message History** - For conversation context
3. **Output Parser** - For structured responses

### Metadata Configuration

Open-Hivemind passes the following metadata to Flowise:

```json
{
  "channelId": "discord-channel-123",
  "userId": "user-456",
  "botName": "MyBot",
  "messageProvider": "discord",
  "timestamp": "2024-01-15T10:30:00Z"
}
```

Access these in your Flowise chatflow using the **Chat Messages** node's metadata input.

## Troubleshooting

### Error: "channelId is missing from metadata"

**Cause**: Using Flowise without proper channel context in SDK mode.

**Solution**:
- In REST mode: This should work automatically
- In SDK mode: Ensure `FLOWISE_CONVERSATION_CHATFLOW_ID` is set
- Check that your chatflow has a metadata input node

### Error: "Connection timeout"

**Cause**: Cannot reach Flowise server.

**Solution**:
1. Verify Flowise is running: `curl http://localhost:3000/api/v1/health`
2. Check network/firewall rules
3. Increase timeout: `FLOWISE_TIMEOUT=60000`

### Error: "Invalid API key"

**Cause**: Flowise API key is incorrect or missing.

**Solution**:
1. Verify API key in Flowise settings
2. Set `FLOWISE_API_KEY` environment variable
3. Check Flowise server logs for authentication errors

### Error: "Chatflow not found"

**Cause**: Invalid Chatflow ID or chatflow not published.

**Solution**:
1. Verify the Chatflow ID is correct
2. Ensure the chatflow is **published** (not draft)
3. Check that the Flowise API is accessible

## Advanced Configuration

### Multi-Provider Setup

For redundancy, combine with OpenAI:
```bash
LLM_PROVIDER=flowise,openai
FLOWISE_BASE_URL=http://localhost:3000
OPENAI_API_KEY=sk-your-key
```

Open-Hivemind will use Flowise as primary, falling back to OpenAI on failure.

### Custom Model Selection

Pass model preferences via metadata in your Flowise chatflow:
```javascript
// In Flowise JavaScript node
const model = $input.metadata.preferredModel || 'gpt-4';
return { model };
```

### Rate Limiting

Configure per-channel rate limits:
```bash
MESSAGE_RATE_LIMIT_PER_CHANNEL=10
```

## Security Considerations

1. **API Keys**: Store in environment variables, not in config files
2. **Network**: Use HTTPS for production Flowise instances
3. **Authentication**: Enable Flowise authentication for production
4. **Rate Limiting**: Configure appropriate limits to prevent abuse

## Performance Tips

- **Use REST mode** for simpler integration and better performance
- **Cache responses** at the Flowise level using their built-in caching
- **Optimize chatflows** - minimize node count for faster execution
- **Monitor latency** - target <2s response time for good UX
