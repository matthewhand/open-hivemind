# Troubleshooting Decision Trees

Navigation: [Docs Index](../README.md) | [FAQ](../getting-started/faq.md) | [Swarm Troubleshooting](../configuration/swarm-troubleshooting.md)

---

## Overview

This guide provides interactive decision trees to help diagnose and resolve complex configuration issues. Follow the paths based on your observed symptoms.

---

## Decision Tree 1: Bot Not Responding

```mermaid
flowchart TD
    A([BOT NOT RESPONDING]) --> B{Server running?}
    B -->|No| C["Start server\nnpm run dev"]
    B -->|Yes| D{Bot connected?}
    D -->|Yes| K[Check message permissions]
    D -->|No| E[Verify Discord Bot Token]
    E --> F{Token valid?}
    F -->|No| G["Get valid token from Discord Portal"]
    F -->|Yes| H{Intents enabled?}
    H -->|No| I["Enable GUILD_MESSAGES intent\nDiscord Portal → Bot → Privileged Intents"]
    H -->|Yes| J{Bot in channel?}
    J -->|No| L[Invite bot to server/channel]
    J -->|Yes| M([Check message handling])
```

---

## Decision Tree 2: LLM Provider Failures

```mermaid
flowchart TD
    A([LLM PROVIDER FAILURE]) --> B{Which provider is failing?}
    B --> OA[OpenAI]
    B --> FL[Flowise]
    B --> OW[OpenWebUI]
    B --> OS[OpenSwarm]
    B --> OT[Other]
    OA --> C1{API key valid?}
    FL --> C2{Flowise URL correct?}
    OW --> C3{Ollama running on correct port?}
    OS --> C4{Python 3.8+ & Swarm installed?}
    OT --> C5[Check Provider docs]
    C1 -->|Yes| D1[Check quota limits]
    C1 -->|No| FW[Check Network / Firewall]
    C2 -->|Yes| FW
    C2 -->|No| FW
    C3 -->|Yes| FW
    C3 -->|No| FW
    C4 -->|Yes| FW
    C4 -->|No| FW
    D1 --> FW
    C5 --> FW
```

---

## Decision Tree 3: Configuration Issues

```mermaid
flowchart TD
    A([CONFIGURATION NOT APPLYING]) --> B{.env file exists?}
    B -->|No| C["Copy from .env.sample\nthen start server"]
    B -->|Yes| D{Syntax valid?}
    D -->|No| E["Fix syntax errors:\n• No spaces around =\n• Quote values with spaces"]
    D -->|Yes| F[Restart server]
    F --> G{Config applied?}
    G -->|Yes| H([Done!])
    G -->|No| I["Check precedence:\n1. .env\n2. WebUI\n3. config/"]
```

---

## Decision Tree 4: Connection Issues

```mermaid
flowchart TD
    A([CONNECTION ISSUES]) --> B{Connection type?}
    B --> Discord
    B --> Slack
    B --> Mattermost
    B --> LLM[LLM Provider]
    B --> Database
    Discord --> C1[Check Bot Token]
    Slack --> C2[Check OAuth token]
    Mattermost --> C3[Check Webhook URL]
    LLM --> C4[Check URL & API key]
    Database --> C5[Check SQLite file]
    C1 & C2 & C3 & C4 & C5 --> Common["Common Steps\n1. Check firewall rules\n2. Verify network connectivity\n3. Check service status\n4. Review error logs\n5. Test with curl / telnet"]
```

---

## Decision Tree 5: Performance Problems

```mermaid
flowchart TD
    A([PERFORMANCE PROBLEMS]) --> B{Primary symptom?}
    B --> P1[Slow response time]
    B --> P2[High CPU usage]
    B --> P3[Memory leak]
    B --> P4[High latency]
    B --> P5[Bot disconnects]
    P1 --> A1[Check LLM provider] --> R1[Tune timeout settings]
    P2 --> A2[Reduce bot count] --> R2[Scale horizontally]
    P3 --> A3[Check message history] --> R3[Limit history size]
    P4 --> A4[Check network latency] --> R4[Use CDN]
    P5 --> A5[Check Discord rate limits] --> R5[Enable message queueing]
```

---

## Quick Reference: Common Fixes

### Bot Won't Start
```bash
# 1. Check token format (no spaces)
DISCORD_BOT_TOKEN=token1,token2

# 2. Verify intents enabled
# Discord Portal → Bot → Privileged Intents

# 3. Check logs
DEBUG=app:discordService npm run dev
```

### LLM Not Responding
```bash
# 1. Verify credentials
echo $OPENAI_API_KEY

# 2. Test connectivity
curl https://api.openai.com/v1/models

# 3. Check provider logs
DEBUG=app:openAiProvider npm run dev
```

### Configuration Not Applying
```bash
# 1. Restart server
# 2. Clear overrides
rm config/user/bot-overrides.json

# 3. Verify env file
cat .env | grep -v "^#"
```

### Rate Limiting
```bash
# 1. Set rate limits
MESSAGE_RATE_LIMIT_PER_CHANNEL=10

# 2. Add delays
MESSAGE_MIN_DELAY_MS=1000
```

---

## Diagnostic Commands

### Check Server Status
```bash
curl http://localhost:3028/api/health
```

### Check Bot Status
```bash
curl http://localhost:3028/api/bots \
  -H "Authorization: Bearer <token>"
```

### Check LLM Status
```bash
curl http://localhost:3028/api/config/llm-status \
  -H "Authorization: Bearer <token>"
```

### Enable Debug Logging
```bash
# All components
DEBUG=app:* npm run dev

# Specific component
DEBUG=app:getLlmProvider,app:discordService npm run dev
```

### Test Provider Connection
```bash
# OpenAI
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"

# Flowise
curl http://localhost:3000/api/v1/chatflows

# OpenWebUI
curl http://localhost:8080/api/models
```

---
