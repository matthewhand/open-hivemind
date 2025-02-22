# Open-Hivemind

![Project Logo](path/to/logo.png)

Open-Hivemind is an open‑source bot framework designed to enhance interactions on Discord and Slack using AI‑driven capabilities. Built with TypeScript, it supports a single bot per instance and integrates seamlessly with various LLM providers such as OpenAI, Flowise, OpenWebUI, and optionally [Open‑Swarm](https://github.com/matthewhand/open-swarm) for multi‑agent functionality. Its modular architecture makes it easy to deploy, customize, and extend.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Getting Started](#getting-started)
  - [Prerequisites](#prerequisites)
  - [Installation](#installation)
  - [Configuration](#configuration)
  - [Running the Bot](#running-the-bot)
  - [Testing](#testing)
- [Environment Sample](#environment-sample)
- [Usage](#usage)
- [Development](#development)
- [Future Enhancements](#future-enhancements)
- [License](#license)

## Overview

Open-Hivemind runs a single bot on your chosen messaging platform—Discord or Slack—and leverages an LLM to deliver intelligent conversational experiences. With built‑in support for multi‑agent systems via Open‑Swarm, you can configure flexible combinations such as OpenAI+Discord, Flowise+Slack, or Open‑Swarm+Discord, with additional platforms on the horizon.

## Features

- **Multi‑Platform Messaging**
  - **Discord**: Operate a single bot with the option of multiple tokens when paired with Open‑Swarm (e.g., `Agent1`, `Agent2`).
  - **Slack**: Single‑bot support with channel joining and message handling via `SlackService`.
  - Easily switch between platforms using the `MESSAGE_PROVIDER` setting (defaults to Discord).

- **LLM Integration**
  - Compatible with multiple providers: OpenAI, Flowise, OpenWebUI, and Open‑Swarm (for multi‑agent scenarios).
  - Core chat capabilities via `handleMessage` (designed for easy extension).
  - Basic image processing support (`handleImageMessage.ts`) lays the groundwork for future ML integrations.

- **Message Handling**
  - Listens for messages (e.g., via Discord’s `messageCreate` event) and filters out bot messages if `MESSAGE_IGNORE_BOTS` is enabled.
  - Retrieves recent conversation history (up to 10 messages) and supports intuitive command parsing (e.g., `!status`).

- **Configuration**
  - Uses [convict](https://github.com/mozilla/node-convict) for environment‑driven configuration, supporting settings loaded from `.env` files or JSON files in `config/providers/`.
  - Environment variables offer quick customization of messaging behavior and LLM integrations.

- **Robustness**
  - Implements graceful error handling with detailed debug logging using the `Debug` library.
  - Ensures a clean shutdown via the `shutdown()` method.

- **Testing & Deployment**
  - Comes with 33 Jest test suites to ensure reliability.
  - Simple Node.js deployment that requires minimal setup.

## Getting Started

### Prerequisites

- **Node.js**: v18 or higher is recommended.
- **Discord**: A bot token from the [Discord Developer Portal](https://discord.com/developers/applications).
- **Slack**: A bot token from the [Slack API](https://api.slack.com/apps) (if using Slack).
- **LLM Provider**: An API key for OpenAI, Flowise, OpenWebUI, or an Open‑Swarm setup.

### Installation

1. **Clone the Repository**:
   ```bash
   git clone <your-repo-url>
   cd open-hivemind
   ```
2. **Install Dependencies**:
   ```bash
   npm install
   ```

### Configuration

1. **Copy the Sample Environment File**:
   ```bash
   cp .env.sample .env
   ```
2. **Edit the `.env` File**:
   - Set `MESSAGE_PROVIDER` to `discord` or `slack`.
   - Set `LLM_PROVIDER` to `openai`, `flowise`, `openwebui`, or `open-swarm`.
   - Provide the necessary platform‑specific tokens (e.g., `DISCORD_BOT_TOKEN`, `SLACK_BOT_TOKEN`).

### Running the Bot

Start the bot with:
```bash
npm start
```
The bot will connect to your configured platform and begin processing incoming messages.

### Testing

Run the test suite with:
```bash
npm run test
```
This command validates 33 test suites covering core functionality, including multi‑agent support via Open‑Swarm.

## Environment Sample (.env.sample)

```env
# Messaging Platform
MESSAGE_PROVIDER=discord  # Options: "discord" or "slack"

# LLM Provider
LLM_PROVIDER=openai       # Options: openai, flowise, openwebui, open-swarm (for multi-agent setups)

# Discord Configuration (Single Bot; Multi-Agent with Open-Swarm)
DISCORD_BOT_TOKEN=your-token         # Single token or comma-separated tokens for multi-agent setups
DISCORD_USERNAME_OVERRIDE=BotName      # Single name or comma-separated names for multi-agent setups
DISCORD_CLIENT_ID=your-client-id       # Optional
DISCORD_GUILD_ID=your-guild-id         # Optional
DISCORD_CHANNEL_ID=your-channel-id     # Optional

# Slack Configuration (Single Bot)
SLACK_BOT_TOKEN=your-slack-bot-token   # Required for Slack
SLACK_JOIN_CHANNELS=channel1,channel2  # Optional

# Messaging Behavior
MESSAGE_IGNORE_BOTS=true               # Ignore bot messages
MESSAGE_ADD_USER_HINT=true             # Add user hints to messages
MESSAGE_RATE_LIMIT_PER_CHANNEL=5       # Maximum messages per minute

# OpenAI (if LLM_PROVIDER=openai)
OPENAI_API_KEY=your-openai-key
OPENAI_BASE_URL=https://api.openai.com/v1/
OPENAI_MODEL=gpt-4o-mini

# Flowise (if LLM_PROVIDER=flowise)
FLOWISE_API_ENDPOINT=http://localhost:3002/api/v1
FLOWISE_API_KEY=your-flowise-key
FLOWISE_CONVERSATION_CHATFLOW_ID=your-chatflow-id

# OpenWebUI (if LLM_PROVIDER=openwebui)
OPEN_WEBUI_API_URL=http://localhost:3000/api
OPEN_WEBUI_USERNAME=your-username
OPEN_WEBUI_PASSWORD=your-password

# Open-Swarm (if LLM_PROVIDER=open-swarm for multi-agent)
OPEN_SWARM_API_URL=http://localhost:your-swarm-port
DISCORD_BOT_TOKEN=token1,token2               # Multiple tokens for agents
DISCORD_USERNAME_OVERRIDE=Agent1,Agent2         # Multiple names for agents
```

## Usage

- **Single Bot**: Deploy using a single `DISCORD_BOT_TOKEN` or `SLACK_BOT_TOKEN` with your chosen LLM provider.
- **Multi-Agent**: For Open‑Swarm configurations, use multiple tokens and names formatted as comma-separated lists.
- **Commands**: Test the bot by sending commands such as `!status` or customize behavior within `messageHandler.ts`.

## Development

- **Run Tests**:
  ```bash
  npm run test
  ```
- **Enable Debugging** (if needed):
  ```bash
  DEBUG=app:* npm start
  ```
- **Extend Functionality**: Add new integrations or LLM connectors in the `src/integrations/` or `src/llm/` directories.

## Future Enhancements

- Improve full LLM integration within `messageHandler.ts`.
- Enhance multi-bot support, particularly for Slack.
- Integrate additional platforms (e.g., Telegram).

## License

MIT License. See the [LICENSE](LICENSE) file for details.
