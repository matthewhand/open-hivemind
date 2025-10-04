# Open-Hivemind

[![CI](https://github.com/matthewhand/open-hivemind/workflows/CI/badge.svg)](https://github.com/matthewhand/open-hivemind/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Node.js Version](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9+-blue.svg)](https://www.typescriptlang.org/)
[![Test Coverage](https://img.shields.io/badge/coverage-74.29%25-green.svg)](https://github.com/matthewhand/open-hivemind)
[![Tests Passing](https://img.shields.io/badge/tests-1337%20passing-brightgreen)](https://github.com/matthewhand/open-hivemind/actions)
[![Docker](https://img.shields.io/badge/docker-ready-blue.svg)](https://hub.docker.com/)

## Table of Contents
- [Highlights](#highlights)
- [Architecture at a Glance](#architecture-at-a-glance)
- [Deployment Modes](#deployment-modes)
- [Platform Support](#platform-support)
- [WebUI Capabilities](#webui-capabilities)
- [Quick Start](#quick-start)
- [Configuration Essentials](#configuration-essentials)
- [MCP Integration & Tool Guards](#mcp-integration--tool-guards)
- [Coordination & Memory](#coordination--memory)
- [Development & Testing](#development--testing)
- [Documentation & Roadmap](#documentation--roadmap)
- [License](#license)

Open-Hivemind is a multi-agent orchestration framework that lets you deploy a
coordinated network of LLM-powered agents across Discord, Slack, and
Mattermost. Each running bot behaves like a neuron in a shared digital
consciousness: they speak with one voice, share recent context, and can be
independently tuned through personas, system instructions, and guarded access
to external tools.

## Highlights
- **Solo & Swarm modes** – run a single bot or auto-scale to multiple
  numbered instances from a comma-separated token list.
- **Persona management** – assign predefined personas or custom system
  instructions from the WebUI or `config/personas/`.
- **MCP integration** – connect to Model Context Protocol servers, discover
  tools, and execute them with per-agent access controls.
- **Tool usage guards** – restrict MCP tool execution to channel owners or a
  curated allowlist.
- **Unified voice** – responses are emitted as `*AgentName*: message`, with up
  to 10 recent messages shared across every instance in a channel.
- **WebUI dashboard** – configure providers, personas, tokens, and monitor live
  status with environment-variable-aware overrides.
- **Platform reach** – production-ready Discord support, Slack via Socket Mode,
  and experimental Mattermost REST integration.

## Architecture at a Glance
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

## Deployment Modes
### Solo Mode
Use a single bot token for lightweight setups.
```env
DISCORD_BOT_TOKEN=token1
MESSAGE_USERNAME_OVERRIDE=OpenHivemind
```

### Swarm Mode
Provide multiple tokens to launch auto-numbered instances (e.g. `Bot #1`, `Bot
#2`). Each instance keeps its own connection while sharing context.
```env
DISCORD_BOT_TOKEN=token1,token2,token3
MESSAGE_USERNAME_OVERRIDE=BotName
```

## Platform Support
- **Discord** – full multi-instance support with wakeword and mention detection,
  message history, and experimental voice pipeline.
- **Slack** – Socket Mode bots, slash commands, channel auto-join, and runtime
  bot management via the WebUI APIs.
- **Mattermost** – REST-based integration with multi-team support (currently
  experimental, disabled by default).

## WebUI Capabilities
- Configure LLM and messenger providers with environment-aware overrides.
- Create, edit, and assign personas or raw system prompts.
- Connect to multiple MCP servers and manage authentication.
- Define tool usage guards (owner-only or custom user lists) per agent.
- Monitor connection health, message throughput, and error states in real time.
- Export the full REST API surface as JSON or YAML from `/webui/api/openapi`.

## Quick Start Options
### Option A – Pinokio (Recommended)
1. Install [Pinokio](https://pinokio.co/) and add this repository using the
   supplied `pinokio.js` manifest.
2. Click **Install dependencies** to run `npm install` in the managed
   environment.
3. Copy `.env.sample` to `.env` inside the Pinokio workspace and add your
   platform tokens and LLM credentials.
4. Press **Start**. Pinokio launches `npm run dev`, exposing the API and WebUI
   at `http://localhost:5005`.
5. Choose **Open WebUI** to finish configuration (personas, MCP servers, tool
   guards) from the browser.

### Option B – Docker (Official Image)
```bash
# pull the published image
docker pull matthewhand/open-hivemind:latest

# run with your environment file
docker run --rm \
  --env-file .env \
  -p 3000:3000 \
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
npm run dev   # API + WebUI on port 5005
```
We do not publish an npm package; cloning the repository is the supported path.
Use `npm run build` followed by `npm start` for a production build.

## Configuration Essentials
- **Global persona naming** – set `MESSAGE_USERNAME_OVERRIDE` to control the
  shared agent name.
- **Persona templates** – drop JSON or YAML persona definitions into
  `config/personas/` or manage them through the WebUI.
- **Bot-specific overrides** – use `BOTS=<name1>,<name2>` with
  `BOTS_{NAME}_*` variables or `config/bots/{name}.json` for per-agent tuning.
- **LLM providers** – configure OpenAI, Flowise, OpenWebUI, or OpenSwarm via the
  standard provider keys.
- **Rate limiting & hints** – tweak `MESSAGE_RATE_LIMIT_PER_CHANNEL` and
  `MESSAGE_ADD_USER_HINT` to shape response cadence and tone.

## MCP Integration & Tool Guards
1. Add MCP server credentials in the WebUI or via config files.
2. The agent discovers available tools and exposes them through conversations.
3. Apply usage guards:
   - **Owner-based** – only the forum/channel owner can invoke tools.
   - **Custom list** – allow specific user IDs.
4. Guards can be toggled per agent, per server, or per tool.

## Coordination & Memory
- All outbound replies follow the `*AgentName*: message` format for a unified
  voice.
- Up to ten recent messages per channel are cached and shared across instances
  to preserve context.
- Tokens are validated on startup, and each instance reconnects independently
  for resilience.

## Development & Testing
```bash
npm run lint            # ESLint
npm run check-types     # TypeScript type checking
npm test                # Jest unit & integration tests
npm run test:real       # Live Discord/Slack tests (requires live tokens)
npm run dev:frontend    # Run the WebUI in isolation
```
Additional guides live in `docs/`.

## Documentation & Roadmap
- Browse detailed guides under [`docs/`](docs/).
- Platform- and feature-specific breakdowns are captured in [`PACKAGE.md`](PACKAGE.md).
- Upcoming work and priorities live in [`todo.md`](docs/reference/todo.md).

## License
Released under the [MIT License](LICENSE).
