# Config Reference (Generated)

## Basic

### app
- HTTP_ENABLED: Enable HTTP server
- PORT: Port

### discord
- DISCORD_BOT_TOKEN: Bot token
- DISCORD_CHANNEL_ID: Default channel id

### llm
- OPENAI_API_KEY: API key

### mattermost
- MATTERMOST_CHANNEL: Default channel id
- MATTERMOST_SERVER_URL: Mattermost server endpoint
- MATTERMOST_TOKEN: Personal access token

### message
- MESSAGE_ONLY_WHEN_SPOKEN_TO: Reply only on wakeword/mention
- MESSAGE_WAKEWORDS: Comma-separated triggers

## Advanced

### app
- METRICS_ROUTE_ENABLED: Expose /metrics

### discord
- DISCORD_FETCH_FAILURE_THRESHOLD: Breaker threshold (fetch)
- DISCORD_FETCH_RESET_TIMEOUT_MS: Breaker reset timeout (fetch)
- DISCORD_MESSAGE_HISTORY_LIMIT: History fetch cap
- DISCORD_SEND_FAILURE_THRESHOLD: Circuit breaker threshold (send)
- DISCORD_SEND_RESET_TIMEOUT_MS: Breaker reset timeout (send)

### llm
- OPENAI_BASE_URL: Custom base URL
- OPENAI_MAX_DELAY_MS: Retry backoff max delay
- OPENAI_MIN_DELAY_MS: Retry backoff min delay
- OPENAI_MODEL: Model name
- OPENAI_RETRIES: Retry attempts

### mattermost
- MATTERMOST_TYPING_ENABLED: Emit typing events over WS
- MATTERMOST_WS_ENABLED: Enable realtime WebSocket

### message
- CHANNEL_BONUSES: Per-channel bonus (CSV/JSON)
- CHANNEL_PRIORITIES: Per-channel priority (CSV/JSON)
- MESSAGE_BOT_RESPONSE_MODIFIER
- MESSAGE_CHANNEL_ROUTER_ENABLED: Enable ChannelRouter-based selection
- MESSAGE_INTERROBANG_BONUS
- MESSAGE_MAX_DELAY: Maximum delay between messages (ms)
- MESSAGE_MIN_DELAY: Minimum delay between messages (ms)
- MESSAGE_MIN_INTERVAL_MS: Global minimum interval (ms)
- MESSAGE_RATE_LIMIT_PER_CHANNEL: Messages per minute per channel

### slack
- SLACK_SEND_INTERVAL_MS
- SLACK_SEND_MAX_CONCURRENCY
- SLACK_SEND_MAX_DELAY_MS
- SLACK_SEND_MAX_QUEUE_SIZE
- SLACK_SEND_MIN_DELAY_MS
- SLACK_SEND_QUEUE_ENABLED: Enable send rate-limit queue
- SLACK_SEND_RETRIES
- SLACK_SEND_TOKENS_PER_INTERVAL

