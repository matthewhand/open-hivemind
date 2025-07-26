# Chatbot Documentation Index

This documentation is designed to be fed into future chatbot instances for quick understanding and setup.

## 📋 Quick Navigation

| Document | Purpose | Read Time |
|----------|---------|-----------|
| **[ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)** | System architecture & design principles | 3 min |
| **[SETUP_GUIDE.md](SETUP_GUIDE.md)** | Step-by-step setup instructions | 5 min |
| **[PROVIDER_CHEATSHEET.md](PROVIDER_CHEATSHEET.md)** | Quick configuration reference | 2 min |
| **[DEVELOPER_INTERFACES.md](DEVELOPER_INTERFACES.md)** | Complete API documentation | 10 min |

## 🚀 5-Minute Quick Start

1. **Copy `.env.example` to `.env`**
2. **Set your tokens:**
   ```bash
   LLM_PROVIDER=openai
   OPENAI_API_KEY=your-key
   DISCORD_BOT_TOKEN=your-token
   ```
3. **Run:** `npm start`

## 🎯 Key Concepts for New Instances

### Message Flow
```
Discord Message → DiscordMessage (IMessage) → LLM Provider → Response
```

### Provider Selection
- **Single Provider**: `LLM_PROVIDER=openai`
- **Multi-Provider**: `LLM_PROVIDER=openai,flowise,openwebui`

### Multi-Bot Support
- **Single Bot**: `DISCORD_BOT_TOKEN=token1`
- **Multi-Bot**: `DISCORD_BOT_TOKEN=token1,token2,token3`

## 🔧 Essential Commands

```bash
# Check configuration
node -e "console.log(require('./src/llm/getLlmProvider')().length + ' providers configured')"

# Test Discord connection
node -e "require('./src/integrations/discord/DiscordService').Discord.DiscordService.getInstance().initialize().then(() => console.log('✅ Connected!'))"
```

## 📊 Configuration Matrix

| Use Case | LLM Provider | Platform | Config Example |
|----------|--------------|----------|----------------|
| **Basic** | OpenAI | Discord | `LLM_PROVIDER=openai` + `OPENAI_API_KEY` |
| **Local** | Flowise | Discord | `LLM_PROVIDER=flowise` + `FLOWISE_BASE_URL` |
| **Redundant** | OpenAI+Flowise | Discord | `LLM_PROVIDER=openai,flowise` |
| **Multi-bot** | OpenAI | Discord×3 | `DISCORD_BOT_TOKEN=t1,t2,t3` |

## 🚨 Common Issues & Solutions

| Issue | Quick Fix |
|-------|-----------|
| "No LLM providers" | Check `LLM_PROVIDER` and required keys |
| "No Discord tokens" | Set `DISCORD_BOT_TOKEN` |
| "channelId missing" | Flowise requires `channelId` in metadata |
| "Connection timeout" | Check provider URLs |

## 🔍 Debug Mode

```bash
# Enable all debugging
DEBUG=app:* npm start

# Specific debugging
DEBUG=app:getLlmProvider,app:discordService npm start
```

## 📁 File Structure for Context

```
src/
├── llm/
│   ├── getLlmProvider.ts          # Provider factory
│   └── interfaces/ILlmProvider.ts # Provider interface
├── integrations/
│   ├── discord/
│   │   ├── DiscordService.ts      # Discord implementation
│   │   └── providers/DiscordMessageProvider.ts
│   ├── openai/openAiProvider.ts   # OpenAI implementation
│   └── flowise/flowiseProvider.ts # Flowise implementation
└── message/
    └── interfaces/IMessage.ts     # Message abstraction
```

## 🎯 Next Steps

1. **Read [SETUP_GUIDE.md](SETUP_GUIDE.md)** for detailed setup
2. **Check [PROVIDER_CHEATSHEET.md](PROVIDER_CHEATSHEET.md)** for configuration
3. **Review [ARCHITECTURE_OVERVIEW.md](ARCHITECTURE_OVERVIEW.md)** for system understanding
4. **Use [DEVELOPER_INTERFACES.md](DEVELOPER_INTERFACES.md)** for API reference

## 💡 Pro Tips

- **Start Simple**: Begin with single provider, single bot
- **Use Debug**: Enable `DEBUG=app:*` during development
- **Check Logs**: Console output shows initialization status
- **Test Incrementally**: Add providers one at a time