# Setup Guide

Navigation: [Docs Index](../README.md) | [Quickstart](quickstart.md) | [Configuration Overview](../configuration/overview.md)


Open-Hivemind supports three deployment styles. Start with Pinokio for the
fastest path, then explore manual Node.js or Docker setups when you need full
control or CI/CD automation.

## 1. Pinokio One-Click (Recommended)
1. Install [Pinokio](https://pinokio.co/) and add this repository with the
   included `pinokio.js` manifest.
2. In Pinokio, click **Install dependencies**. The bundled `install.js` script
   runs `npm install` inside a managed environment.
3. Provide your secrets:
   - Create a `.env` file from `.env.sample` within the Pinokio workspace, or
   - Use the WebUI after startup to set overrides (saved to
     `config/user/bot-overrides.json`).
4. Press **Start**. Pinokio launches `npm run dev`, serving the API and WebUI on
   `http://localhost:5005`.
5. When the menu shows **Open WebUI**, click it to open the dashboard and finish
   configuring personas, MCP servers, and platform tokens.

Pinokio keeps the service running in the background and remembers whether
`node_modules` exists, so future launches are a single click.

## 2. Manual Node.js Deployment
1. Install Node.js 18+ and clone the repository.
2. Copy the sample environment file:
   ```bash
   cp .env.sample .env
   ```
3. Edit `.env` with your Discord/Slack tokens, LLM API keys, and optional MCP
   server credentials.
4. Install dependencies and start the dev server:
   ```bash
   npm install
   npm run dev   # serves API + WebUI on 5005
   ```
   For a production build use `npm run build` followed by `npm start`.
5. Open `http://localhost:5005` to confirm the WebUI is online.

## 3. Docker / Docker Compose
1. Ensure Docker Desktop or the Docker CLI is available.
2. Pull the published image and run it with your `.env` file:
   ```bash
   docker pull matthewhand/open-hivemind:latest
   docker run --rm \
     --env-file .env \
     -p 3000:3000 \
     matthewhand/open-hivemind:latest
   ```
   This exposes the WebUI at `http://localhost:3000`. Override ports or volumes
   with additional flags as needed.
3. Prefer Compose? Update `docker-compose.yml` to use the same image (or build
   locally) and launch with `docker-compose up -d`. Environment variables from
   `.env` are loaded automatically via `env_file`.
4. Stop containers with `docker stop <id>` or `docker-compose down` when
   finished.

## Configuration Options
Open-Hivemind can be driven purely through environment variables or by layered
configuration files.

- **Environment-first:** `.env` values override everything else and work for all
  deployment modes (Pinokio, Node, Docker).
- **BotConfigurationManager overrides:** The WebUI persists edits to
  `config/user/bot-overrides.json`, which merge beneath environment variables at
  startup.
- **Static configuration files:** Place JSON/YAML files under `config/` or
  persona templates under `config/personas/` for source-controlled defaults.

Refer to [`configuration/overview.md`](../configuration/overview.md) for detailed
precedence rules and additional examples.

## Next Steps
- Review the architecture in
  [`architecture/layered-overview.md`](../architecture/layered-overview.md).
- Learn about multi-bot orchestration via
  [`configuration/multi-instance-setup.md`](../configuration/multi-instance-setup.md).
- Explore monitoring endpoints in [`monitoring/overview.md`](../monitoring/overview.md).
