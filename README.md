# Open‑Hivemind

![Project Logo Placeholder](path/to/logo.png)

Open‑Hivemind is a sophisticated bot that leverages cutting‑edge language models, image analysis, and diverse AI services—designed to enrich user interactions on both Discord and Slack. The project abstracts messaging (via a common messaging interface) and LLM inference (supporting multiple providers such as OpenAI, Flowise, and Open WebUI) so that you can mix and match any messaging platform with any LLM inference service.

> **Note:** While FlowiseAI and Open WebUI are not LLM providers in the traditional sense, they offer open‑source platforms for building LLM applications. Open‑Hivemind supports these integrations via configuration; however, for simplicity, many users may choose to use a simple OpenAI API endpoint which only requires an OpenAI API key.

## 🌟 Overview

The bot is built to be platform‑agnostic. Whether you deploy it on Discord or Slack, it uses a common interface for messages and a dynamic LLM provider adapter to generate AI responses. This design allows you to extend or swap integrations with minimal changes.

## 🚀 Features

- **Multi‑Platform Messaging**
  - **Discord Integration:**
    - Advanced command handling (via `!command` syntax and slash commands)
    - Voice channel support (joining channels, playing audio, and sending typing indicators)
    - Robust moderation and rate limiting
  - **Slack Integration:**
    - Utilizes Slack Socket Mode to run without a public-facing URL
    - Captures rich metadata from Slack events (user ID, channel ID, thread ID, team/workspace ID)
    - Supports interactive UI elements via Slack’s Block Kit (e.g., “Getting Started” button)
- **Advanced LLM AI Interaction**
  - Supports multiple LLM providers including OpenAI, Flowise, and Open WebUI
  - Context‑aware chat completions with history aggregation
  - Dynamic provider selection via configuration
  - Optional inclusion of Slack metadata in the LLM payload (toggled by an environment variable)
- **Comprehensive Image Analysis**
  - Integration with Replicate and other ML models to generate detailed image descriptions
- **Secure Code Execution**
  - Executes Python and Bash commands securely with proper permissions
- **Dynamic Configuration**
  - Environment‑driven configuration (via `.env` and convict schemas) for all major components
- **Monitoring & Diagnostics**
  - `/health` and `/uptime` endpoints for real‑time diagnostics
- **Robust Moderation & Resilience**
  - AI‑assisted voting for server moderation
  - Error handling, rate limiting, and auto‑restart mechanisms

## 🛠 Deployment

### Prerequisites

- Node.js (v18.x or higher recommended)
- Docker (optional for containerized deployment)
- Valid Discord and/or Slack bot tokens and client IDs
- API keys for your chosen LLM providers (e.g., OpenAI, Flowise)

### Environment Setup

1. **Clone the repository.**
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Create a `.env` file at the project root** (use the provided sample files as templates):
   - `.env.sample` for a default Discord + LLM (OpenAI, Flowise, or Open WebUI) setup.
   - `.env.sample.slack` for a Slack + LLM (e.g., OpenAI) setup.
4. **Configure platform‑specific variables:**
   - **Discord:** `DISCORD_BOT_TOKEN`, `DISCORD_CLIENT_ID`, `DISCORD_GUILD_ID`, `DISCORD_CHANNEL_ID`, etc.
   - **Slack:** `SLACK_BOT_TOKEN`, `SLACK_JOIN_CHANNELS`, etc.
   - **LLM Providers:** `LLM_PROVIDER`, `OPENAI_API_KEY`, `FLOWISE_API_KEY`, etc.
   - **Optional Metadata Toggle:**  
     To include Slack message metadata (user ID, thread ID, channel ID, team ID) in the payload sent to your LLM endpoint, set an environment variable such as `INCLUDE_SLACK_METADATA=true`.

### Deployment Options

#### Local Development

1. Ensure your `.env` is properly configured.
2. Start the bot with:
   ```bash
   npm start
   ```
3. The bot will connect to your messaging platform and start processing commands.

#### Docker

1. Make sure your `.env` file is set up.
2. From the project root, run:
   ```bash
   docker-compose up --build -d
   ```
3. Monitor the logs with:
   ```bash
   docker-compose logs -f
   ```

#### Cloud Deployment

Refer to your cloud provider’s instructions. Detailed backend setup instructions are available in [llm_backend/README.md](./llm_backend/README.md).

## 🛠 Usage

### Commands

- **Discord:**  
  Use commands prefixed with `!` (e.g., `!status`, `!perplexity`). Slash commands are also supported.
- **Slack:**  
  The bot uses Slack Socket Mode to process incoming events. Upon joining a channel, it posts a welcome message with a “Getting Started” button. Slack events include metadata such as user ID, channel ID, thread ID, and team ID.

### Metadata in Slack

When a Slack user sends a message, the event payload includes metadata:
- `user`: ID of the user who sent the message
- `channel`: ID of the channel where the message was sent
- `ts`: Timestamp (unique message identifier)
- `thread_ts`: Timestamp of the parent message if the message is in a thread
- `team`: Workspace (server) ID

If the environment variable `INCLUDE_SLACK_METADATA=true` is set, this metadata will be merged into the payload sent to the LLM inference endpoint, enabling context‑rich responses.

### Configuration & Customization

- **Messaging Configuration:**  
  Set via `MESSAGE_*` variables in your `.env` and configured using convict in `src/message/interfaces/messageConfig.ts`.
- **LLM Provider Selection:**  
  Choose your provider by setting `LLM_PROVIDER` (e.g., `openai`, `flowise`, or `openwebui`). Provider‑specific configurations are handled in `src/llm/interfaces/llmConfig.ts`.
- **Platform-Specific Settings:**
  - Discord-specific settings in `src/integrations/discord/interfaces/discordConfig.ts`
  - Slack-specific settings in `src/integrations/slack/SlackService.ts` and `SlackEventListener.ts`

## 📄 Environment Samples

### Default (Discord + LLM)

```
MESSAGE_PROVIDER=discord
LLM_PROVIDER=openai

# Discord Configuration
DISCORD_BOT_TOKEN=your-discord-token
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_GUILD_ID=your-discord-guild-id
DISCORD_CHANNEL_ID=your-discord-channel

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1/
OPENAI_MODEL=gpt-4

# Flowise Configuration (if using Flowise)
FLOWISE_API_ENDPOINT=http://your-flowise-api-endpoint
FLOWISE_API_KEY=your-flowise-api-key
FLOWISE_CONVERSATION_CHATFLOW_ID=your-conversation-chatflow-id
FLOWISE_COMPLETION_CHATFLOW_ID=your-completion-chatflow-id

# Open WebUI Configuration (if using Open WebUI)
OPEN_WEBUI_API_URL=http://your-openwebui-api-url
OPEN_WEBUI_USERNAME=your_username
OPEN_WEBUI_PASSWORD=your_password
OPEN_WEBUI_KNOWLEDGE_FILE=/path/to/knowledge.json

# Optional Metadata Toggle for Slack (if applicable)
INCLUDE_SLACK_METADATA=false

# Additional Messaging Settings
MESSAGE_INTERROBANG_BONUS=0.1
MESSAGE_MENTION_BONUS=0.5
MESSAGE_BOT_RESPONSE_MODIFIER=-1.0
```

### Slack + OpenAI Example

```
MESSAGE_PROVIDER=slack
LLM_PROVIDER=openai

# Slack Configuration
SLACK_BOT_TOKEN=your-slack-bot-token
SLACK_JOIN_CHANNELS=channelID1,channelID2

# OpenAI Configuration
OPENAI_API_KEY=your-openai-api-key
OPENAI_BASE_URL=https://api.openai.com/v1/
OPENAI_MODEL=gpt-4

# Optional Metadata Toggle to include Slack event metadata in LLM payloads
INCLUDE_SLACK_METADATA=true

# Additional Messaging Settings
MESSAGE_INTERROBANG_BONUS=0.1
MESSAGE_MENTION_BONUS=0.5
MESSAGE_BOT_RESPONSE_MODIFIER=-1.0
```

## 📊 Monitoring

- Health and uptime are available via the `/health` endpoint.
- Logging and error handling provide detailed insights into the bot’s operation.

## 🔧 Development

To ensure code quality, run the combined test and linting command before committing:

```bash
npm run validate
```

## 📄 Additional Documentation

- **Configuration Guide:** [docs/CONFIGURATION.chatgpt.md](./docs/CONFIGURATION.chatgpt.md)
- **License:** [docs/LICENSE.chatgpt.md](./docs/LICENSE.chatgpt.md)

## ⚖ Compliance

This project complies with Discord’s and Slack’s developer policies by:

- **Encrypted Data Storage:** All sensitive data is stored securely.
- **Access Control:** Strict permissions and audit logs are in place.
- **User Consent:** The bot obtains explicit user consent before storing any message data.

## 🔮 Future Enhancements

- Further Slack UI improvements (rich interactive elements, more granular metadata capture)
- Additional messaging platform integrations
- Enhanced LLM provider features and customizations

---

Enjoy using AI to transform your community interactions.
