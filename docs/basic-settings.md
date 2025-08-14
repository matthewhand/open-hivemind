# Basic Settings

Start here. These are the minimum settings to run a single bot with one LLM. You can add advanced features later.

## Choose a Provider
Set one of the following (and `MESSAGE_PROVIDER` accordingly):

- Discord
  - `MESSAGE_PROVIDER=discord`
  - `DISCORD_BOT_TOKEN=your-bot-token`
  - `DISCORD_CHANNEL_ID=channel-id`

- Slack
  - `MESSAGE_PROVIDER=slack`
  - `SLACK_BOT_TOKEN=xoxb-...`
  - `SLACK_DEFAULT_CHANNEL_ID=channel-id`

- Mattermost
  - `MESSAGE_PROVIDER=mattermost`
  - `MATTERMOST_SERVER_URL=https://your.mattermost.server`
  - `MATTERMOST_TOKEN=personal-access-token`
  - `MATTERMOST_CHANNEL=channel-id`

## Pick an LLM
Choose one:

- OpenAI: `OPENAI_API_KEY=sk-...`
- Flowise: `FLOWISE_API_KEY=...`

## Optional
- `PORT=5005` (default)
- `MESSAGE_WAKEWORDS=!help,!ping` (default)

That’s it. Run the app and the bot should come online in your chosen channel. When ready, explore power-user features in docs/advanced-settings.md.

