# Installation Guide

Open-Hivemind supports three deployment options. Choose the one that fits your workflow:

- **Pinokio** – Fastest local setup with one-click deployment
- **Docker** – Official container image for containerized environments
- **Manual Node.js** – Full control for development or production

---

## Option 1 – Pinokio (Recommended)

Pinokio provides the fastest path to get Open-Hivemind running locally with a managed environment.

1. Install [Pinokio](https://pinokio.co/) and add this repository using the bundled `pinokio.js` manifest.
2. Click **Install dependencies** to run `npm install` via the managed environment.
3. Copy `.env.sample` to `.env` inside the Pinokio workspace and add your platform tokens (Discord, Slack, Mattermost) and LLM credentials.
4. Press **Start**. Pinokio launches `npm run dev`, serving the API and WebUI at `http://localhost:3028`.
5. Choose **Open WebUI** to finish configuring personas, MCP servers, and tool guards from the browser.

Pinokio keeps the service running in the background and remembers whether `node_modules` exists, so future launches are a single click.

---

## Option 2 – Docker / Docker Compose

### Docker CLI

```bash
# Pull the published image
docker pull matthewhand/open-hivemind:latest

# Run with your environment file
docker run --rm \
  --env-file .env \
  -p 3028:3028 \
  matthewhand/open-hivemind:latest
```

### Docker Compose

Update `docker-compose.yml` to use the official image:

```yaml
services:
  open-hivemind:
    image: matthewhand/open-hivemind:latest
    env_file:
      - .env
    ports:
      - "3028:3028"
```

Then run:

```bash
docker-compose up -d
```

Stop containers with `docker stop <id>` or `docker-compose down`.

---

## Option 3 – Manual Node.js Runtime

1. Install Node.js 18+ and clone the repository:
   ```bash
   git clone https://github.com/matthewhand/open-hivemind.git
   cd open-hivemind
   ```

2. Copy the sample environment file:
   ```bash
   cp .env.sample .env
   ```

3. Edit `.env` with your Discord/Slack/Mattermost tokens, LLM API keys, and optional MCP server credentials.

4. Install dependencies and start the dev server:
   ```bash
   npm install
   npm run dev   # serves API + WebUI on port 3028
   ```

5. For production, build and start:
   ```bash
   npm run build
   npm start
   ```

6. Open `http://localhost:3028` to confirm the WebUI is online.

---

## Environment Configuration

### Required Credentials

At minimum, you need a messaging platform token and an LLM provider:

| Variable | Description |
|----------|-------------|
| `DISCORD_BOT_TOKEN` | Discord bot token (for Discord adapter) |
| `MESSAGE_PROVIDER` | Platform: `discord`, `slack`, or `mattermost` |
| `LLM_PROVIDER` | LLM backend: `openai`, `flowise`, `openwebui`, etc. |
| `OPENAI_API_KEY` | Your OpenAI API key (if using OpenAI) |

Copy `.env.sample` to `.env` and fill in your credentials. All deployment modes (Pinokio, Docker, Node.js) use the same `.env` file.

### Deployment Modes

**Solo (single bot):**
```env
DISCORD_BOT_TOKEN=your_token_here
MESSAGE_USERNAME_OVERRIDE=OpenHivemind
```

**Swarm (multiple bots):**
```env
DISCORD_BOT_TOKEN=token1,token2,token3
MESSAGE_USERNAME_OVERRIDE=OpenHivemind
```

### Response Behavior Options

| Variable | Description | Default |
|----------|-------------|---------|
| `MESSAGE_ONLY_WHEN_SPOKEN_TO` | Only respond when mentioned/replied-to or with wakewords | `true` |
| `MESSAGE_WAKEWORDS` | Wakeword prefixes (comma-separated) | `!help,!ping` |
| `MESSAGE_IGNORE_BOTS` | Ignore messages from other bots | `true` |
| `MESSAGE_RATE_LIMIT_PER_CHANNEL` | Messages per minute per channel | (none) |
| `MESSAGE_DELAY_MULTIPLIER` | Typing/reading speed simulation | `1.0` |

### Configuration Precedence

Open-Hivemind uses layered configuration (highest to lowest priority):

1. **Environment variables** – `.env` values override everything
2. **WebUI overrides** – Saved to `config/user/bot-overrides.json`
3. **Static config files** – JSON/YAML under `config/`

Environment variables work across all deployment modes. WebUI-persisted overrides merge beneath env vars at startup.

---

## Next Steps

- [Configure multi-bot deployments](../configuration/multi-bot-setup.md)
- [Learn about configuration precedence](../configuration/overview.md)
- [Explore the WebUI dashboard](../webui/dashboard-overview.md)
- [Set up MCP servers for tool integrations](../mcp/overview.md)

---

**Related Guides:**
- [Architecture Overview](../architecture/layered-overview.md)
- [Multi-Instance Setup](../configuration/multi-instance-setup.md)
- [Monitoring & Endpoints](../monitoring/overview.md)
