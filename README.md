# Open-Hivemind

[![CI](https://github.com/matthewhand/open-hivemind/workflows/CI/badge.svg)](https://github.com/matthewhand/open-hivemind/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://hub.docker.com/)

Open-Hivemind is a **multi-agent orchestration framework** for deploying a
coordinated network of LLM-powered bots across Discord, Slack, and Mattermost.
Each running bot behaves like a neuron in a shared digital consciousness: they
share recent context, keep a unified voice, and can be independently tuned via
personas, system instructions, and guarded access to external tools.

## Table of Contents
- [For Operators](#for-operators)
- [For Developers](#for-developers)
- [Documentation & Roadmap](#documentation--roadmap)
- [License](#license)

## For Operators
### What you get
- **Solo & Swarm mode**: run one bot or many (multi-token) instances with shared context.
- **Unified voice**: responses are emitted as `*AgentName*: message` for consistent multi-agent identity.
- **Shared short-term memory**: a per-channel cache of the last ~10 messages is used as shared context.
- **WebUI-first operations**: configure providers, personas, MCP servers, and overrides (with env-var lock awareness).
- **Conservative response policy**: by default, the bot only replies when explicitly addressed.
- **Human-ish pacing**: reading delays, burst coalescing, pulsed typing indicators, and rate-backoff (delay, not silence).
- **Idle engagement (non-spammy)**: at-most-one idle response per idle window, with context-aware prompts.
- **Safety rails**: duplicate-response suppression, prompt-leak stripping, and bot-to-bot filters.
- **MCP tooling**: connect Model Context Protocol servers and guard tool usage (owner-only / allowlist).
- **Platform reach**: Discord (multi-instance), Slack (Socket Mode), Mattermost (experimental).

### Architecture at a glance
```
┌─────────────┐   ┌─────────────┐   ┌─────────────┐
│   Discord   │   │    Slack    │   │ Mattermost  │
└────┬────────┘   └────┬────────┘   └────┬────────┘
     │                 │                 │
     └─────────────────┼─────────────────┘
                       │
             ┌─────────▼─────────┐
             │  Message Router   │
             │  + Context Cache  │
             └─────────┬─────────┘
                       │
             ┌─────────▼─────────┐
             │  LLM Providers    │
             │ OpenAI · Flowise │
             │ OpenWebUI · MCP  │
             └─────────┬─────────┘
                       │
             ┌─────────▼─────────┐
             │ Response Composer │
             │  + Rate Limiter   │
             └───────────────────┘
```

### Quick Start (Golden Path)
The fastest way to get running is our unified development environment.

1. **Install & Run**
   ```bash
   git clone https://github.com/matthewhand/open-hivemind.git
   cd open-hivemind
   npm install
   make start-dev
   ```

2. **Access the Dashboard**
   Open **[http://localhost:3028](http://localhost:3028)** in your browser.

3. **Create Your First Bot**
   - Go to **Bots** in the sidebar.
   - Click **Create Bot**.
   - Enter a name (e.g., `MyFirstBot`) and description.
   - Click **Create**.

4. **Verify It Works**
   - Click on your new bot to see its details.
   - (Optional) Use the **Chat Preview** if available, or configure a Discord/Slack token in **Config**.

---

### Other Installation Options
For Docker, Pinokio, or Production deployment check [`docs/installation.md`](docs/installation.md).

### Development & Testing
We use `make` to manage quality gates:

```bash
make lint       # Run ESLint (warnings allowed)
make quality    # Lint + Build
make ci         # Full CI suite
```

## Documentation & Roadmap
- Start at [`docs/README.md`](docs/README.md) for a curated documentation hub.
- Platform and feature deep-dives live in [`PACKAGE.md`](PACKAGE.md).
- Recent changes and behavioral tuning notes: [`docs/reference/release-notes-2025-12-15.md`](docs/reference/release-notes-2025-12-15.md).
- Upcoming work and priorities: [`docs/reference/todo.md`](docs/reference/todo.md).

## License
Released under the [MIT License](LICENSE).
