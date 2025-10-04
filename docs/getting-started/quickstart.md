# 🚀 Open-Hivemind Quickstart

Navigation: [Docs Index](../README.md) | [Setup Guide](setup-guide.md) | [WebUI Dashboard](../webui/dashboard-overview.md)


Pick the path that fits your workflow. Pinokio is the fastest way to get a
local swarm online; manual Node.js and Docker options follow for advanced use.

## Option A – Pinokio (Recommended)
1. Install [Pinokio](https://pinokio.co/) and add the repository using the
   bundled `pinokio.js` manifest.
2. Click **Install dependencies** to run `npm install` via the managed
   `install.js` helper.
3. Copy `.env.sample` to `.env` in the Pinokio workspace and add your Discord,
   Slack, Mattermost, and LLM credentials.
4. Hit **Start**. Pinokio runs `npm run dev`, serving the API + WebUI on
   `http://localhost:5005`.
5. Choose **Open WebUI** to finish configuring personas, MCP servers, and tool
   guards from the browser.

## Option B – Docker (Official Image)
```bash
# pull the published image
docker pull matthewhand/open-hivemind:latest

# run with your environment file
docker run --rm \
  --env-file .env \
  -p 3000:3000 \
  matthewhand/open-hivemind:latest
```
Prefer Compose? Update `docker-compose.yml` to use the same image instead of
building locally, then run `docker-compose up -d`.

## Option C – Manual Node.js Runtime (Git Clone)
```bash
# Clone & install
git clone https://github.com/matthewhand/open-hivemind.git
cd open-hivemind
cp .env.sample .env
npm install

# Launch the dev server
npm run dev  # serves API + WebUI on port 5005
```
We do not publish an npm package; cloning the repository is the supported path.
Use `npm run build` followed by `npm start` for production.

## Next Steps
- Configure multi-bot deployments in
  [`configuration/multi-bot-setup.md`](../configuration/multi-bot-setup.md).
- Learn how overrides merge in
  [`configuration/overview.md`](../configuration/overview.md).
- Explore WebUI capabilities in [`webui/dashboard-overview.md`](../webui/dashboard-overview.md).
