# Open-Hivemind

[![CI](https://github.com/matthewhand/open-hivemind/workflows/CI/badge.svg)](https://github.com/matthewhand/open-hivemind/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://hub.docker.com/)

Open-Hivemind is a **multi-agent orchestration framework** for deploying a coordinated network of LLM-powered bots across Discord, Slack, and Mattermost. Each running bot behaves like a neuron in a shared digital consciousness: they share recent context, keep a unified voice, and can be independently tuned via personas, system instructions, and guarded access to external tools.

## Core Functionality

*   **Multi-Agent Orchestration**: Deploy coordinated bots across Discord, Slack, and Mattermost.
*   **Unified Voice**: Consistent identity across platforms.
*   **Shared Context**: Maintain conversation history and context across interactions.
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
