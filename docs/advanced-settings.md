# Advanced Settings

This document groups power‑user and optional settings across providers. New users can ignore these; the defaults are sensible. Enable only what you need.

## Channel Routing
- MESSAGE_CHANNEL_ROUTER_ENABLED: Enable channel scoring + selection (default: false).
- CHANNEL_BONUSES: Per‑channel bonus (CSV or JSON). Range [0.0, 2.0].
- CHANNEL_PRIORITIES: Per‑channel integer priority (lower = higher priority).
- Tie‑breakers: Higher score, then higher bonus, then lexicographic channel ID.

## Mattermost
- MATTERMOST_WS_ENABLED: Enable WebSocket realtime events (default: true). Disable if you only want polling/REST.
- MATTERMOST_TYPING_ENABLED: Emit typing indicators over WS (default: false).
- Send threads: Pass `threadId` to reply within a thread.
- File uploads: Provide `files` to attach; the service uploads and posts with `file_ids`.

## Slack
- SLACK_MODE: Connection mode `socket` or `rtm` (default: socket).
- SLACK_JOIN_CHANNELS: Comma‑separated channel IDs to auto‑join.
- SLACK_APP_TOKEN: Required for Socket Mode.
- Signing/verification: SLACK_SIGNING_SECRET for verifying incoming requests.
- Send retries: SLACK_SEND_RETRIES, SLACK_SEND_MIN_DELAY_MS, SLACK_SEND_MAX_DELAY_MS.

## Discord
- DISCORD_MESSAGE_HISTORY_LIMIT: Max messages fetched for context (default: 10 in code).
- Circuit breakers:
  - DISCORD_SEND_FAILURE_THRESHOLD, DISCORD_SEND_RESET_TIMEOUT_MS
  - DISCORD_FETCH_FAILURE_THRESHOLD, DISCORD_FETCH_RESET_TIMEOUT_MS

## Message Behavior
- MESSAGE_ONLY_WHEN_SPOKEN_TO: Reply only on wakeword/mention (default: true).
- MESSAGE_WAKEWORDS: Comma‑separated triggers (default: !help,!ping).
- MESSAGE_INTERROBANG_BONUS: End‑of‑message punctuation bonus.
- MESSAGE_BOT_RESPONSE_MODIFIER: Adjust reply probability to other bots.

## Rate & Timing
- MESSAGE_RATE_LIMIT_PER_CHANNEL: Messages per minute per channel.
- MESSAGE_MIN_DELAY / MESSAGE_MAX_DELAY: Random delay window between sends.
- MESSAGE_MIN_INTERVAL_MS: Global minimum interval between messages.

## Webhooks & Security
- WEBHOOK_TOKEN: Shared secret to verify incoming webhook routes.
- WEBHOOK_IP_WHITELIST: Optional CSV of allowed IPs. When empty, all allowed.

## Multi‑Bot (Advanced Setup)
- BOTS: Comma‑separated bot names (e.g., `alpha,beta`).
- BOTS_{NAME}_*: Per‑bot provider + LLM keys, e.g.:
  - BOTS_ALPHA_MESSAGE_PROVIDER, BOTS_ALPHA_DISCORD_BOT_TOKEN
  - BOTS_BETA_MESSAGE_PROVIDER, BOTS_BETA_SLACK_BOT_TOKEN
  - BOTS_{NAME}_MATTERMOST_SERVER_URL, BOTS_{NAME}_MATTERMOST_TOKEN

Tips
- Start with a single provider and minimal env vars.
- Add Channel Router and multi‑bot once your basic setup is stable.
- Prefer keeping realtime (WS) on only where needed to reduce moving parts.

