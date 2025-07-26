# Setup Guide for New Chatbot Instances

## Prerequisites

- Node.js 18+ 
- Discord bot token (from Discord Developer Portal)
- LLM provider credentials (OpenAI API key, Flowise URL, etc.)

## Quick Setup (5 minutes)

### 1. Environment Configuration

Create a `.env` file in the project root:

```bash
# Required: LLM Provider Configuration
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-openai-key-here

# Required: Discord Configuration
DISCORD_BOT_TOKEN=your-discord-bot-token

# Optional: Flowise Configuration (if using Flowise)
FLOWISE_BASE_URL=http://localhost:3000
FLOWISE_CONVERSATION_CHATFLOW_ID=your-chatflow-id
FLOWISE_USE_REST=true

# Optional: OpenWebUI Configuration (if using OpenWebUI)
OPENWEBUI_BASE_URL=http://localhost:3000

# Optional: Debug logging
DEBUG=app:*
```

### 2. Install Dependencies

```bash
npm install
# or
yarn install
```

### 3. Start the Bot

```bash
npm start
# or
yarn start
```

## Advanced Configuration

### Multi-Provider Setup

Configure multiple LLM providers for redundancy:

```bash
LLM_PROVIDER=openai,flowise,openwebui
OPENAI_API_KEY=sk-openai-key
FLOWISE_BASE_URL=http://localhost:3000
OPENWEBUI_BASE_URL=http://localhost:8080
```

### Multi-Bot Discord Setup

For running multiple Discord bots:

```bash
# Method 1: Environment variables
DISCORD_BOT_TOKEN=token1,token2,token3

# Method 2: Configuration file (recommended for complex setups)
# Create config/messengers.json
{
  "discord": {
    "instances": [
      {
        "name": "Bot 1",
        "token": "token1"
      },
      {
        "name": "Bot 2", 
        "token": "token2"
      }
    ]
  }
}
```

## Provider-Specific Setup

### OpenAI Provider
- **Required**: `OPENAI_API_KEY`
- **Optional**: `OPENAI_MODEL`, `OPENAI_BASE_URL`, `OPENAI_TIMEOUT`

### Flowise Provider
- **Required**: `FLOWISE_BASE_URL`
- **Required for SDK mode**: `FLOWISE_CONVERSATION_CHATFLOW_ID`
- **Optional**: `FLOWISE_USE_REST=true/false`

### OpenWebUI Provider
- **Required**: `OPENWEBUI_BASE_URL`
- **Note**: Only supports chat completions

## Troubleshooting

### Common Issues

1. **"No valid LLM providers initialized"**
   - Check LLM_PROVIDER configuration
   - Verify API keys are set correctly

2. **"No Discord bot tokens provided"**
   - Check DISCORD_BOT_TOKEN environment variable
   - Verify token format (no spaces, correct length)

3. **"Cannot initialize DiscordService: One or more bot tokens are empty"**
   - Validate all tokens in multi-bot setup
   - Check for trailing commas in token lists

### Debug Commands

```bash
# Check configuration
node -e "console.log(require('./src/config/llmConfig').get('LLM_PROVIDER'))"

# Test Discord connection
node -e "const {Discord} = require('./src/integrations/discord/DiscordService'); Discord.DiscordService.getInstance().initialize().then(() => console.log('Connected!'))"

# Test LLM providers
node -e "const {getLlmProvider} = require('./src/llm/getLlmProvider'); console.log(getLlmProvider().map(p => p.constructor.name))"
```

## Verification Steps

1. **Configuration Check**: Run debug commands above
2. **Discord Connection**: Bot should appear online in Discord
3. **LLM Test**: Send a test message to verify AI responses
4. **Multi-bot**: Check console for "Bot X logged in" messages

## Next Steps

1. Review `docs/ARCHITECTURE_OVERVIEW.md` for system understanding
2. Check `docs/DEVELOPER_INTERFACES.md` for API documentation
3. Configure rate limiting for production use
4. Set up logging and monitoring