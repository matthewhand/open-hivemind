# Installation & Deployment Guide

## Installation Options

### Option A – Pinokio (Recommended for Local Use)
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

---

## Deployment Configuration

### Deployment Modes

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

### Response Policy & Pacing

These are the main environment variables to tune bot behavior:
- **Respond only when spoken to**: `MESSAGE_ONLY_WHEN_SPOKEN_TO=true` (default). “Spoken to” includes ping/mention, reply-to-bot, wakeword prefix, or the bot name in text.
- **Wakewords**: `MESSAGE_WAKEWORDS="!help,!ping,hey bot"` (prefix match).
- **Bot-to-bot behavior**: `MESSAGE_IGNORE_BOTS=true` (default). If you want bots to talk to each other, set it to `false` (and consider `MESSAGE_BOT_REPLIES_LIMIT_TO_DEFAULT_CHANNEL`).
- **Rate limiting**: `MESSAGE_RATE_LIMIT_PER_CHANNEL` (msgs/min).
- **Delays**: `MESSAGE_DELAY_MULTIPLIER` controls the overall speed of reading/typing simulations.
