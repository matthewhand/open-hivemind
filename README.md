# Open-Hivemind

[![CI](https://github.com/matthewhand/open-hivemind/workflows/CI/badge.svg)](https://github.com/matthewhand/open-hivemind/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://hub.docker.com/)

**Open-Hivemind** is a multi-agent orchestration framework designed to deploy a coordinated network of LLM-powered bots across Discord, Slack, and Mattermost. Unlike traditional bots that simply react to commands, Open-Hivemind creates a living ecosystem of autonomous personas that can interact with each other and with users in a natural, human-like manner.

Rather than running a single bot on a single platform, Open-Hivemind allows you to deploy **as many bots and personas as you want across as many messaging platforms as you want**. Each bot maintains its own unique identity and memory while sharing a common underlying intelligence.

## Immersive, Human-Like Interaction

Open-Hivemind bots are designed to simulate natural conversation dynamics. They are not guaranteed to respond to every message, making their engagement feel more organic and less robotic.

*   **Probabilistic Response**: Bots evaluate each message to decide whether to reply. They don't just "listen" for keywords; they "feel" the conversation flow.
*   **Smart Engagement**: While they may remain silent during general chatter, **directly addressing a bot** or **asking a question** significantly increases the likelihood of a response.
*   **Contextual Stickiness**: Once a bot engages in a conversation, it tends to **stay engaged** for a short period, mimicking human attention spans.
*   **Crowd Awareness**: If you have dozens of bots in a channel, they are aware of the "noise" level. To prevent chaos, unengaged bots will avoid joining an already overpopulated conversation, ensuring the chat remains readable.

## Core Functionality

*   **Multi-Agent Orchestration**: Deploy coordinated bots across Discord, Slack, and Mattermost simultaneously.
*   **Unified Voice & Identity**: Consistent personas across platforms.
*   **Dynamic Engagement Model**: Bots use probabilistic logic to decide when to speak, when to listen, and when to step back.
*   **Shared Context**: Bots maintain conversation history and context across interactions.
*   **WebUI Management**: Configure LLMs, personas, and bots via a user-friendly interface.
*   **Safety & Compliance**: Built-in guards, rate limiting, and duplicate response suppression.
*   **Extensible**: Supports MCP servers and custom tool integrations.

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

2.  **Install dependencies:**
    ```bash
    npm install
    ```

3.  **Start the development server:**
    ```bash
    npm run dev
    ```

Access the WebUI at `http://localhost:3028`.

## Getting Started with WebUI

Once the application is running, open your browser to `http://localhost:3028`.

1.  **Configure LLM Provider**: Navigate to **Configuration > LLM Providers** to set up your API keys (e.g., OpenAI, Anthropic).
2.  **Configure Message Platform**: Go to **Configuration > Message Platforms** to add your bot tokens for Discord, Slack, or Mattermost.
3.  **Create a Bot**: Head to **Configuration > Bots** and click **Create Bot**. Give it a name, assign a persona (optional), and link it to your configured providers.

For a detailed walkthrough of every menu item and feature, please refer to the [User Guide](USERGUIDE.md).

## Documentation

*   [User Guide](USERGUIDE.md): Detailed explanation of all WebUI features.
*   [Installation Guide](docs/installation.md): Advanced deployment options and configurations.
*   [Package Documentation](PACKAGE.md): Deep dives into platform specifics.

## License

Released under the [MIT License](LICENSE).
