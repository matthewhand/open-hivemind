# Swarm Mode Troubleshooting Guide

Navigation: [Docs Index](../README.md) | [Configuration Overview](overview.md) | [Multi-Bot Setup](multi-bot-setup.md)

---

## Overview

Swarm Mode enables running multiple bot instances within a single Open-Hivemind deployment. This guide helps diagnose and resolve common issues with Swarm Mode configuration.

## What is Swarm Mode?

Swarm Mode is automatically enabled when you configure multiple Discord bot tokens (comma-separated). Each token runs as an independent bot instance with its own configuration.

```bash
# Enable Swarm Mode with 3 bots
DISCORD_BOT_TOKEN=token1,token2,token3
```

## Quick Diagnostics

Run this command to check Swarm Mode status:
```bash
node -e "
const {SwarmModeManager} = require('./dist/config/SwarmModeManager');
console.log('Swarm Mode Enabled:', SwarmModeManager.isSwarmModeEnabled());
"
```

---

## Common Issues

### Issue: Bots Not Starting

**Symptoms**: Only one bot starts, or no bots connect.

**Diagnostic Steps**:
1. Check token format:
   ```bash
   # Correct - comma-separated without spaces
   DISCORD_BOT_TOKEN=token1,token2,token3
   
   # Incorrect - spaces will cause issues
   DISCORD_BOT_TOKEN=token1, token2, token3
   ```

2. Verify each token is valid:
   ```bash
   # Test each token separately
   DISCORD_BOT_TOKEN=token1 npm run dev
   DISCORD_BOT_TOKEN=token2 npm run dev
   ```

3. Check logs for specific errors:
   ```bash
   DEBUG=app:discordService npm run dev
   ```

**Solutions**:
- Ensure tokens are comma-separated without spaces
- Verify each token has the required intents (GUILD_MESSAGES, DIRECT_MESSAGES)
- Check Discord Developer Portal for proper bot permissions

---

### Issue: Bots Responding to Wrong Channels

**Symptoms**: Bot1 responds in Bot2's channels, or messages get mixed up.

**Cause**: Incorrect per-bot configuration or missing channel routing.

**Diagnostic Steps**:
1. Check per-bot configuration:
   ```bash
   # Environment variables should match bot index
   DISCORD_BOT_TOKEN=token1,token2,token3
   
   # Bot 1 config
   BOT1_DISCORD_CHANNEL_IDS=channel1a,channel1b
   BOT1_LLM_PROVIDER=openai
   
   # Bot 2 config
   BOT2_DISCORD_CHANNEL_IDS=channel2a
   BOT2_LLM_PROVIDER=flowise
   ```

2. Verify channel routing in WebUI:
   - Navigate to **Bots** → Select Bot → **Channels** tab
   - Confirm channel assignments

**Solutions**:
- Use per-bot environment variables: `BOT1_*`, `BOT2_*`, etc.
- Configure channel routing in WebUI for each bot
- Ensure unique channel assignments across bots

---

### Issue: Rate Limiting Across Bots

**Symptoms**: Bots hit Discord rate limits frequently, responses are delayed.

**Cause**: Multiple bots sending messages to the same channels or guilds.

**Diagnostic Steps**:
1. Check rate limit configuration:
   ```bash
   # Default is unlimited - set per-channel limits
   MESSAGE_RATE_LIMIT_PER_CHANNEL=10
   ```

2. Review bot distribution:
   ```bash
   # Check which bots are in which channels
   DEBUG=app:channelRouter npm run dev
   ```

**Solutions**:
- Distribute bots across different channels/guilds
- Increase `MESSAGE_RATE_LIMIT_PER_CHANNEL`
- Use channel routing to separate bot traffic
- Consider using different message providers for high-load scenarios

---

### Issue: Configuration Not Applied Per-Bot

**Symptoms**: All bots use the same LLM provider or persona.

**Cause**: Using global config instead of per-bot config.

**Diagnostic Steps**:
```bash
# Check if using global (wrong for swarm)
LLM_PROVIDER=openai  # This applies to ALL bots

# Should use per-bot config
BOT1_LLM_PROVIDER=openai
BOT2_LLM_PROVIDER=flowise
BOT3_LLM_PROVIDER=openwebui
```

**Solutions**:
- Use `BOT1_*`, `BOT2_*`, etc. prefix for per-bot configuration
- Configure bots individually in WebUI
- Check that bot names match in configuration

---

### Issue: OpenSwarm Installation Fails

**Symptoms**: Swarm Mode won't start, Python/pip errors.

**Diagnostic Steps**:
```bash
# Check prerequisites
python3 --version
pip --version

# Try manual installation
pip install open-swarm
swarm-cli --version
```

**Solutions**:
1. Install Python 3.8+ if not present
2. Install pip if not available
3. Use virtual environment:
   ```bash
   python3 -m venv swarm-venv
   source swarm-venv/bin/activate
   pip install open-swarm
   ```
4. Check system PATH for pip

---

### Issue: Memory/Resource Exhaustion

**Symptoms**: Server crashes, bots disconnect randomly, high CPU usage.

**Cause**: Too many bots or resource-intensive configurations.

**Diagnostic Steps**:
```bash
# Check system resources
htop  # Linux
top   # macOS

# Check Node.js memory
node --inspect -e "console.log(process.memoryUsage())"
```

**Solutions**:
1. Reduce number of concurrent bots
2. Use lighter LLM providers (avoid large local models)
3. Enable message batching
4. Increase server resources (RAM, CPU)
5. Use swap space:
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   ```

---

## Decision Tree

```
Bot won't start?
├── Check token format (comma-separated, no spaces)
│   └── Fix: Remove spaces from DISCORD_BOT_TOKEN
├── Verify token validity
│   └── Fix: Test each token separately
└── Check Discord intents
    └── Fix: Enable GUILD_MESSAGES, DIRECT_MESSAGES in Discord Portal

Bot responds in wrong channel?
├── Check per-bot config prefix
│   └── Fix: Use BOT1_*, BOT2_* prefixes
└── Verify channel routing
    └── Fix: Configure in WebUI Channels tab

Rate limiting issues?
├── Check channel distribution
│   └── Fix: Spread bots across channels
└── Adjust rate limits
    └── Fix: Set MESSAGE_RATE_LIMIT_PER_CHANNEL

Swarm Mode won't enable?
├── Check token count
│   └── Fix: Need 2+ tokens for swarm
└── Check SwarmModeManager
    └── Fix: Run diagnostics above
```

---

## Configuration Reference

### Environment Variables for Swarm Mode

| Variable | Description | Example |
|----------|-------------|---------|
| `DISCORD_BOT_TOKEN` | Comma-separated bot tokens | `token1,token2,token3` |
| `BOT{n}_LLM_PROVIDER` | Per-bot LLM provider | `BOT1_LLM_PROVIDER=openai` |
| `BOT{n}_PERSONA` | Per-bot persona | `BOT1_PERSONA=helpful` |
| `BOT{n}_DISCORD_CHANNEL_IDS` | Per-bot channel restriction | `BOT1_CHANNEL_IDS=123,456` |
| `MESSAGE_RATE_LIMIT_PER_CHANNEL` | Global rate limit | `10` |

### Bot Naming Convention

Bots are named automatically based on index:
- First token → `bot1`
- Second token → `bot2`
- Third token → `bot3`

Or configure explicitly:
```bash
BOT1_NAME=helpful-bot
BOT2_NAME=code-bot
BOT3_NAME=general-bot
```

---

## Debugging Tips

### Enable Debug Logging

```bash
# All swarm-related debugging
DEBUG=app:swarm* npm run dev

# Specific components
DEBUG=app:swarmModeManager
DEBUG=app:botManager
DEBUG=app:discordService
```

### Check Bot Status via API

```bash
# Get all bot statuses
curl http://localhost:3028/api/bots | jq

# Get specific bot
curl http://localhost:3028/api/bots/bot1 | jq
```

### View Real-Time Logs

```bash
# Follow Docker logs
docker logs -f open-hivemind

# Follow PM2 logs
pm2 logs open-hivemind

# Follow Node.js logs
npm run dev 2>&1 | grep -E "(bot|swarm|error)"
```

---

## Best Practices

1. **Start Small**: Begin with 2-3 bots before scaling
2. **Use Different Providers**: Distribute load across LLM providers
3. **Monitor Resources**: Keep an eye on CPU/Memory usage
4. **Separate Channels**: Assign unique channels to each bot
5. **Use Descriptive Names**: Name bots by function (e.g., `code-bot`, `support-bot`)
6. **Test Incrementally**: Add one bot at a time and verify stability
7. **Configure Rate Limits**: Prevent Discord rate limiting
8. **Log Appropriately**: Use bot-specific debug namespaces

---

## Getting Help

If issues persist after trying these solutions:

1. Collect diagnostic information:
   ```bash
   # Environment
   node -v
   npm -v
   
   # Configuration (sanitized)
   node -e "console.log(JSON.stringify({tokens: process.env.DISCORD_BOT_TOKEN?.split(',').map(() => '***')}))"
   
   # Logs
   npm run dev 2>&1 > debug.log
   ```

2. Check [GitHub Issues](https://github.com/matthewhand/open-hivemind/issues)
3. Review [Discord Community](https://discord.gg/open-hivemind)
