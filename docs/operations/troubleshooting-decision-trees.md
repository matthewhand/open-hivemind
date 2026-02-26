# Troubleshooting Decision Trees

Navigation: [Docs Index](../README.md) | [FAQ](../getting-started/faq.md) | [Swarm Troubleshooting](../configuration/swarm-troubleshooting.md)

---

## Overview

This guide provides interactive decision trees to help diagnose and resolve complex configuration issues. Follow the paths based on your observed symptoms.

---

## Decision Tree 1: Bot Not Responding

```
┌─────────────────────────────────────────────────────────────────┐
│                    BOT NOT RESPONDING                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Is the server   │
                    │ running?         │
                    └─────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
               Yes                          No
                │                           │
                ▼                           ▼
        ┌───────────────┐          ┌──────────────┐
        │ Check bot     │          │ Start server │
        │ connection    │          │ npm run dev  │
        │ status        │          └──────────────┘
        └───────────────┘
                │
                ▼
        ┌───────────────┐
        │ Bot connected?│
        └───────────────┘
                │
       ┌────────┴────────┐
       │                 │
      Yes                No
       │                 │
       ▼                 ▼
┌─────────────┐   ┌──────────────────┐
│ Check       │   │ Verify Discord  │
│ message     │   │ Bot Token       │
│ permissions │   └──────────────────┘
└─────────────┘          │
                         ▼
                ┌─────────────────┐
                │ Token valid?     │
                └─────────────────┘
                         │
              ┌──────────┴───────────┐
              │                      │
             Yes                     No
              │                      │
              ▼                      ▼
       ┌────────────┐      ┌───────────────┐
       │ Check      │      │ Get valid     │
       │ intents   │      │ token from    │
       └────────────┘      │ Discord Portal│
              │            └───────────────┘
              ▼
       ┌────────────┐
       │ Intents    │
       │ enabled?   │
       └────────────┘
              │
     ┌────────┴────────┐
     │                 │
    Yes                No
     │                 │
     ▼                 ▼
┌──────────┐    ┌─────────────┐
│ Check   │    │ Enable      │
│ channel │    │ GUILD_      │
│ access  │    │ MESSAGES    │
└──────────┘    │ intent      │
     │          └─────────────┘
     ▼
┌──────────────┐
│ Bot in       │
│ channel?     │
└──────────────┘
     │
    Yes ───────────────► [END: Check message handling]
    No
     │
     ▼
┌──────────────────┐
│ Invite bot to    │
│ server/channel   │
└──────────────────┘
```

---

## Decision Tree 2: LLM Provider Failures

```
┌─────────────────────────────────────────────────────────────────┐
│                  LLM PROVIDER FAILURE                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Which provider  │
                    │ is failing?     │
                    └─────────────────┘
                              │
        ┌──────────┬──────────┼──────────┬──────────┐
        ▼          ▼          ▼          ▼          ▼
    ┌────────┐┌────────┐┌────────┐┌────────┐┌──────────┐
    │OpenAI  ││Flowise ││OpenWebUI││OpenSwarm││Other     │
    └────────┘└────────┘└────────┘└────────┘└──────────┘
        │          │          │          │          │
        ▼          ▼          ▼          ▼          ▼
    ┌────────┐┌────────┐┌────────┐┌────────┐┌──────────┐
    │Check   ││Check   ││Check   ││Check   ││Check     │
    │API key ││Flowise ││Ollama  ││Swarm   ││Provider  │
    │validity││URL     ││running ││install ││docs      │
    └────────┘└────────┘└────────┘└────────┘└──────────┘
        │          │          │          │          │
        ▼          ▼          ▼          ▼          ▼
    ┌────────┐┌────────┐┌────────┐┌────────┐┌──────────┐
    │Key     ││URL     ││Port    ││Python  ││Generic  │
    │correct?││correct?││correct?││3.8+    ││troublesh-│
    └────────┘└────────┘└────────┘└────────┘│ooting   │
        │          │          │          │    └──────────┘
    ┌───┴───┐  ┌───┴───┐  ┌───┴───┐  ┌───┴───┐
    │       │  │       │  │       │  │       │
   Yes No  Yes No  Yes No  Yes No
    │   │    │   │    │   │    │   │
    ▼   ▼    ▼   ▼    ▼   ▼    ▼   ▼
┌─────────┐  │   │    │   │    │   │    Check
│Check    │  │   │    │   │    │   │    provider
│quota    │  │   │    │   │    │   │    status
│limits   │  │   │    │   │    │   │
└─────────┘  │   │    │   │    │   │
             │   │    │   │    │   │
             ▼   ▼    ▼   ▼    ▼   ▼
         [Check Network/Firewall]
```

---

## Decision Tree 3: Configuration Issues

```
┌─────────────────────────────────────────────────────────────────┐
│                  CONFIGURATION NOT APPLYING                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Check .env     │
                    │ file exists    │
                    └─────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
               Yes                          No
                │                           │
                ▼                           ▼
        ┌───────────────┐          ┌──────────────┐
        │ Check syntax  │          │ Copy from     │
        │ errors        │          │ .env.sample   │
        └───────────────┘          └──────────────┘
                │                           │
                ▼                           ▼
        ┌───────────────┐          ┌──────────────┐
        │ Syntax valid? │          │ Start server │
                └───────────────┘          └──────────────┘
                        │
          ┌─────────────┴─────────────┐
          │                           │
         Yes                          No
          │                           │
          ▼                           ▼
   ┌─────────────┐            ┌──────────────┐
   │ Restart     │            │ Fix syntax    │
   │ server      │            │ errors        │
   └─────────────┘            └──────────────┘
          │                           │
          ▼                           ▼
   ┌─────────────┐            ┌──────────────┐
   │ Config      │            │ Common issues:│
   │ applied?   │            │ - No = in     │
   └─────────────┘            │   value      │
          │                    │ - Spaces in   │
       ┌──┴─────────────────────┴──────────────┐
       │                                        │
      Yes                                       No
       │                                        │
       ▼                                        ▼
  ┌─────────────┐                    ┌──────────────┐
  │ Done!       │                    │ Check        │
  └─────────────┘                    │ precedence   │
                                     └──────────────┘
                                            │
                                            ▼
                                    ┌──────────────┐
                                    │ Priority:    │
                                    │ 1. .env      │
                                    │ 2. WebUI     │
                                    │ 3. config/   │
                                    └──────────────┘
```

---

## Decision Tree 4: Connection Issues

```
┌─────────────────────────────────────────────────────────────────┐
│                   CONNECTION ISSUES                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ What type of    │
                    │ connection?     │
                    └─────────────────┘
                              │
      ┌───────────┬───────────┼───────────┬───────────┐
      ▼           ▼           ▼           ▼           ▼
  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
  │Discord │ │ Slack  │ │Matter- │ │LLM     │ │Database│
  │        │ │        │ │ most   │ │Provider│ │        │
  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
      │           │           │           │           │
      ▼           ▼           ▼           ▼           ▼
  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
  │Bot     │ │Check   │ │Check   │ │Check   │ │Check   │
  │Token   │ │OAuth   │ │Web-    │ │URL &   │ │SQLite  │
  │        │ │token   │ │hook URL│ │API key │ │file    │
  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
      │           │           │           │           │
      ▼           ▼           ▼           ▼           ▼
  [DIAGNOSTIC STEPS FOR EACH CONNECTION TYPE]

  ┌──────────────────────────────────────────────────────┐
  │                COMMON STEPS                         │
  ├──────────────────────────────────────────────────────┤
  │ 1. Check firewall rules                            │
  │ 2. Verify network connectivity                     │
  │ 3. Check service status                           │
  │ 4. Review error logs                              │
  │ 5. Test with curl/telnet                          │
  └──────────────────────────────────────────────────────┘
```

---

## Decision Tree 5: Performance Problems

```
┌─────────────────────────────────────────────────────────────────┐
│                   PERFORMANCE PROBLEMS                           │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌─────────────────┐
                    │ Primary symptom │
                    └─────────────────┘
                              │
      ┌───────────┬───────────┼───────────┬───────────┐
      ▼           ▼           ▼           ▼           ▼
  ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
  │Slow    │ │High    │ │Memory  │ │High    │ │Bot     │
  │response│ │CPU     │ │leak    │ │latency │ │discon- │
  │time    │ │usage   │ │        │ │        │ │nects   │
  └────────┘ └────────┘ └────────┘ └────────┘ └────────┘
      │           │           │           │           │
      ▼           ▼           ▼           ▼           ▼
┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐
│Check    ││Reduce   ││Check    ││Check    ││Check    │
│LLM      ││bot      ││message  ││network  ││Discord  │
│provider ││count    ││history  ││latency  ││rate     │
└──────────┘└──────────┘└──────────┘└──────────┘└──────────┘
    │           │           │           │           │
    ▼           ▼           ▼           ▼           ▼
┌──────────┐┌──────────┐┌──────────┐┌──────────┐┌──────────┐
│Timeout  ││Scale    ││Limit    ││Use      ││Enable   │
│settings ││horiz-   ││history  ││CDN      ││message  │
│         ││ontally  ││size     ││         ││queueing │
└──────────┘└──────────┘└──────────┘└──────────┘└──────────┘
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
