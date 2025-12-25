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

### Quick start
The backend and WebUI are served from **one port** (no CORS headaches). Default is `3028` unless `PORT` is set.

### Option A – Pinokio (Recommended)
1. Install [Pinokio](https://pinokio.co/) and add this repository using the
   supplied `pinokio.js` manifest.
2. Click **Install dependencies** to run `npm install` in the managed
   environment.
3. Copy `.env.sample` to `.env` inside the Pinokio workspace and add your
   platform tokens and LLM credentials.
4. Press **Start**. Pinokio launches `npm run dev`, exposing the API and WebUI
   at `http://localhost:3028` (or your configured `PORT`).
5. Choose **Open WebUI** to finish configuration (personas, MCP servers, tool
   guards) from the browser.

### Option B – Docker (Official Image)
```bash
# pull the published image
docker pull matthewhand/open-hivemind:latest

# run with your environment file
docker run --rm \
  --env-file .env \
  -p 3028:3028 \
  matthewhand/open-hivemind:latest
```
Compose users can keep using `docker-compose.yml`; set the service image to
`matthewhand/open-hivemind:latest` if you prefer pulling instead of building.

### Option C – Manual Node.js Runtime (Git Clone)
```bash
git clone https://github.com/matthewhand/open-hivemind.git
cd open-hivemind
cp .env.sample .env
npm install
npm run dev   # API + WebUI on port 3028 (or $PORT)
```
We do not publish an npm package; cloning the repository is the supported path.
Use `npm run build` followed by `npm start` for a production build.

### Deployment modes
**Solo**
```env
DISCORD_BOT_TOKEN=token1
MESSAGE_USERNAME_OVERRIDE=OpenHivemind
```

**Swarm (multi-token)**
```env
DISCORD_BOT_TOKEN=token1,token2,token3
MESSAGE_USERNAME_OVERRIDE=OpenHivemind
```

### Response policy & pacing (the knobs you actually touch)
- **Respond only when spoken to**: `MESSAGE_ONLY_WHEN_SPOKEN_TO=true` (default). “Spoken to” includes ping/mention, reply-to-bot, wakeword prefix, or the bot name in text.
- **Wakewords**: `MESSAGE_WAKEWORDS="!help,!ping,hey bot"` (prefix match).
- **Bot-to-bot behavior**: `MESSAGE_IGNORE_BOTS=true` (default). If you want bots to talk to each other, set it to `false` (and consider `MESSAGE_BOT_REPLIES_LIMIT_TO_DEFAULT_CHANNEL`).
- **Rate limiting (delay/backoff, not silence)**: `MESSAGE_RATE_LIMIT_PER_CHANNEL` (msgs/min).
- **Human-ish delays**: `MESSAGE_DELAY_MULTIPLIER`, `MESSAGE_READING_DELAY_*`, `MESSAGE_COMPOUNDING_DELAY_*`, `MESSAGE_OTHERS_TYPING_*`.

### WebUI capabilities (operators)
- Configure LLM + messenger providers (Discord/Slack/Mattermost) with env-aware overrides.
- Manage personas and system instructions (`config/personas/` or WebUI).
- Connect MCP servers, discover tools, and apply per-agent tool guards.
- Export OpenAPI specs at `/webui/api/openapi`.

## For Developers
### How it’s built
- **Unified server**: backend serves the compiled WebUI from the same port (see `UNIFIED_SERVER.md`).
- **Provider architecture**: messenger providers (Discord/Slack/Mattermost) + pluggable LLM providers (OpenAI, Flowise, OpenWebUI).
- **Swarm semantics**: multiple bot instances coordinate through shared per-channel context (last ~10 messages) while keeping independent connections.
- **Config layering**: env vars override config files; WebUI shows locked fields when owned by env.

### Development & testing
```bash
npm run lint            # ESLint
npm run check-types     # TypeScript type checking
npm test                # Jest unit & integration tests
npm run test:real       # Live Discord/Slack tests (requires live tokens)
npm run dev:webui-only  # Run API + WebUI without messengers
npm run dev:frontend-only # Run the WebUI in isolation (Vite)
```
Additional guides live in `docs/` (start at `docs/README.md`).

## Documentation & Roadmap
- Start at [`docs/README.md`](docs/README.md) for a curated documentation hub.
- Platform and feature deep-dives live in [`PACKAGE.md`](PACKAGE.md).
- Recent changes and behavioral tuning notes: [`docs/reference/release-notes-2025-12-15.md`](docs/reference/release-notes-2025-12-15.md).
- Upcoming work and priorities: [`docs/reference/todo.md`](docs/reference/todo.md).

## License
Released under the [MIT License](LICENSE).
