# Open-Hivemind

[![CI](https://github.com/matthewhand/open-hivemind/workflows/CI/badge.svg)](https://github.com/matthewhand/open-hivemind/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-22.x-green)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://hub.docker.com/)

Open-Hivemind is a **multi-agent orchestration framework** that transcends the traditional "one bot, one platform" model. Instead of deploying a single chatbot, you deploy a coordinated network of unique personas across Discord, Slack, and Mattermost simultaneously.

Think of it less as a bot and more as a **digital ecosystem**. You can have as many bots as you want—each with its own distinct personality, memory, and directives—living alongside your human users in the same channels.

## Why Open-Hivemind?

Unlike standard chatbots that simply wait for a command and reply, Open-Hivemind agents are designed for **immersive, human-like interaction**. They possess a degree of autonomy and social awareness that makes them feel like active participants in a community rather than just tools.

### 🧠 Selective Engagement
Bots don't always respond. Just like a human, they "listen" to the conversation and decide whether to chime in based on probability, relevance, and their specific personality traits. They aren't just request-response machines; they have agency.

### 🗣️ Natural Conversation Dynamics
*   **Engagement:** While they may stay quiet in the background, directly addressing a bot or asking a question significantly increases the chance of a response.
*   **Momentum:** Once a bot is "engaged" in a conversation, it tends to stay engaged, maintaining the flow of dialogue without needing to be constantly re-prompted.
*   **Context Awareness:** They remember what was said previously, allowing for coherent, multi-turn discussions.

### 🚦 Social Awareness & Crowd Control
In a channel with dozens of active bots, chaos could easily ensue. Open-Hivemind implements "social anxiety" logic:
*   **Avoid Overcrowding:** If a conversation is already populated by too many other bots or is moving too fast, a bot will be less likely to join in, preventing a "pile-on" effect.
*   **Politeness:** Bots respect the flow of conversation and try not to interrupt or talk over one another excessively.

## Core Functionality

![Chat Monitor — real-time view of all bot activity across platforms](docs/screenshots/chat-monitor.png)

*   **Multi-Agent Orchestration**: Deploy coordinated bots across Discord, Slack, and Mattermost from a single dashboard.
*   **Consistent Voice**: Maintain consistent identities across different platforms.
*   **Shared Context**: Bots share a collective memory, allowing for sophisticated interactions.
*   **WebUI Management**: Easily configure LLMs, personas, and bots via a user-friendly interface—no code required.
*   **Safety & Compliance**: Built-in guards, rate limiting, and duplicate response suppression ensure stability.
*   **Extensible**: Supports MCP servers and custom tool integrations for advanced capabilities.

## Installation & Quick Start

Choose the method that best suits your environment.

### Option 1: Pinokio (Easiest / Local)

Recommended for users who want a one-click local setup.

1.  Install [Pinokio](https://pinokio.computer/).
2.  Open Pinokio and click **Discover**.
3.  Enter the URL for this repository: `https://github.com/matthewhand/open-hivemind`.
4.  Click **Download** and then **Install**.
5.  Once installed, click **Start**.
6.  Click **Open WebUI** to launch the dashboard in your browser.

### Option 2: Docker (Containerized)

Ideal for production or isolated environments.

```bash
# Pull the latest image
docker pull matthewhand/open-hivemind:latest

# Run the container (ensure you have a .env file configured)
docker run --rm \
  --env-file .env \
  -p 3028:3028 \
  matthewhand/open-hivemind:latest
```

Access the WebUI at `http://localhost:3028`.

### Option 3: Node.js (Developer)

For developers who want to modify the code or run locally without Docker.

1.  **Clone the repository:**
    ```bash
    git clone https://github.com/matthewhand/open-hivemind.git
    cd open-hivemind
    ```

2.  **Ensure Node.js 22 is installed:**
    This project requires Node.js 22. We recommend using [nvm](https://github.com/nvm-sh/nvm) to manage versions:
    ```bash
    nvm install 22
    nvm use 22
    ```

2.  **Install dependencies:**
    This project uses pnpm for package management.
    ```bash
    pnpm install
    ```

3.  **Start the development server:**
    ```bash
    pnpm run dev
    ```

Access the WebUI at `http://localhost:3028`.

## Getting Started with WebUI

Once the application is running, open your browser to `http://localhost:3028`.

1.  **Configure LLM Provider**: Navigate to **Configuration > LLM Providers** to set up your API keys (e.g., OpenAI, Anthropic).
2.  **Configure Message Platform**: Go to **Configuration > Message Platforms** to add your bot tokens for Discord, Slack, or Mattermost.
3.  **Create a Bot**: Head to **Configuration > Bots** and click **Create Bot**. Give it a name, assign a persona (optional), and link it to your configured providers.

For a detailed walkthrough of every menu item and feature, please refer to the [User Guide](docs/USER_GUIDE.md).

## Documentation

*   [User Guide](docs/USER_GUIDE.md): Detailed explanation of all WebUI features.
*   [Developer Guide](docs/architecture/development.md): Deep dives into platform specifics and local development.
*   [Quick Start / Installation Guide](docs/operations/deployment.md): Advanced deployment options and configurations.

## License

Released under the [MIT License](LICENSE).


## Security & Environment Configuration

Security is paramount in Open-Hivemind. While you can manage a significant portion of configuration via the WebUI, core security, cryptographic secrets, and system behavior are defined via environment variables (usually stored in your `.env` file).

### Critical Security Variables
If you deploy this publicly, **these variables must be set.**

*   **`NODE_ENV`**: Determines operational mode. Always set to `production` in deployed environments to enforce strict validation and secure defaults.
*   **`ADMIN_PASSWORD`**: Provides a robust fallback admin password for initial login.
*   **`SESSION_SECRET`**: Cryptographic key used to encrypt stateful user sessions.
*   **`JWT_SECRET`** & **`JWT_REFRESH_SECRET`**: Keys used to sign and verify API access tokens.

### Configuration Variables
Open-Hivemind leverages a myriad of environment variables for system configuration. Here are the core categories:

*   **System Controls**: `PORT`, `BASE_URL`, `LOG_LEVEL`, `REDIS_URL`, `DEMO_MODE`
*   **Security & Network Limits**: `ADMIN_IP_WHITELIST`, `ALLOW_LOCALHOST_ADMIN`, `ALLOW_LOCAL_NETWORK_ACCESS`, `CORS_ORIGIN`, `TRUST_PROXY`, `RATE_LIMIT_API_MAX`
*   **Bot Registries (Multi-bot setup)**: Prefix dynamically instantiated bots via `BOTS_<NAME>_DISCORD_BOT_TOKEN` etc.
*   **Global Fallbacks**: `DISCORD_BOT_TOKEN`, `SLACK_BOT_TOKEN`, `OPENAI_API_KEY`, `LLM_PROVIDER`, `MESSAGE_PROVIDER`
*   **Behavior Tuning**: `MESSAGE_ACTIVITY_TIME_WINDOW`, `MESSAGE_MENTION_BONUS`, `MESSAGE_RECENT_ACTIVITY_DECAY_RATE`

For a comprehensive, documented list of every supported variable, consult the `.env.sample` file included in the root of the repository.
