# Real Integration Tests

Navigation: [Docs Index](../README.md) | [Dev Startup](dev-startup.md) | [Monitoring API](../monitoring/api.md)


## Overview

Real integration tests validate actual API connections to Discord, Slack, Mattermost, OpenAI, and Flowise services. These tests are **optional** and only run when proper environment variables are provided.

## Setup

1. Copy the example environment file:
```bash
cp .env.real.example .env.real
```

2. Fill in your actual API credentials in `.env.real`

3. Source the environment file:
```bash
source .env.real
```

## Running Tests

### All Real Integration Tests
```bash
npm run test:real
```

### Individual Platform Tests
```bash
# Discord only
npm test -- tests/integrations/discord/DiscordService.real.test.ts

# Slack only  
npm test -- tests/integrations/slack/SlackService.real.test.ts

# Mattermost only
npm test -- tests/integrations/mattermost/MattermostService.real.test.ts

# OpenAI only
npm test -- tests/integrations/openai/openAiProvider.real.test.ts

# Flowise only
npm test -- tests/integrations/flowise/flowiseProvider.real.test.ts
```

## Required Environment Variables

### Discord
- `REAL_DISCORD_TOKEN` - Bot token from Discord Developer Portal
- `REAL_DISCORD_CHANNEL` - Channel ID where test messages will be sent

### Slack
- `REAL_SLACK_TOKEN` - Bot token (starts with `xoxb-`)
- `REAL_SLACK_CHANNEL` - Channel ID (starts with `C`)
- `REAL_SLACK_SIGNING_SECRET` - Signing secret from Slack app settings

### Mattermost
- `REAL_MATTERMOST_URL` - Mattermost server URL
- `REAL_MATTERMOST_TOKEN` - Personal access token or bot token
- `REAL_MATTERMOST_CHANNEL` - Channel name or ID

### OpenAI
- `REAL_OPENAI_API_KEY` - OpenAI API key (starts with `sk-`)

### Flowise (Optional)
- `REAL_FLOWISE_URL` - Flowise instance URL
- `REAL_FLOWISE_API_KEY` - Flowise API key (optional)
- `REAL_FLOWISE_CHATFLOW_ID` - Chatflow ID to test

## Test Behavior

- **Missing credentials**: Tests are automatically skipped with informative messages
- **Test isolation**: Each test cleans up after itself
- **Real API calls**: Tests make actual network requests to live services
- **Rate limiting**: Tests respect API rate limits and include appropriate timeouts
- **Message cleanup**: Test messages are clearly marked with timestamps

## Security Notes

- Never commit `.env.real` to version control
- Use test/development accounts when possible
- Revoke credentials after testing if needed
- Test channels should be dedicated for testing purposes

## CI/CD Integration

Real integration tests are designed for manual execution and should **not** be included in automated CI/CD pipelines due to:

- Credential security requirements
- API rate limiting concerns  
- Network dependency reliability
- Cost implications for paid APIs

Use the standard mocked test suite (`npm test`) for CI/CD validation.