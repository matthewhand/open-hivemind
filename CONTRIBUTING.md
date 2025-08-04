# Contributing Guide

This document summarizes developer conventions for debugging, feature flags, and routing behaviors across messaging providers.

## Debug logging namespaces

We use the `debug` package with consistent namespaces. Enable verbose output by setting `DEBUG` to a comma-separated list or wildcard.

Examples:
- Shell:
  - `DEBUG=app:* npm test`
  - `DEBUG=app:discordService,app:ChannelRouter node ./dist/index.js`
- Programmatic:
  - `process.env.DEBUG = 'app:*'`

Namespaces in use:
- app:discordService — lifecycle, sendMessage, and initialization logs for DiscordService
- app:DiscordMessage — normalized DiscordMessage traces (ids, authors, getters/setters)
- app:SlackService:verbose — SlackService lifecycle and module wiring
- app:SlackMessageIO — Slack message send/fetch operations
- app:SlackEventBus — Express routes and Slack event handlers
- app:SlackBotFacade — Slack bot lifecycle, joins, and bot info
- app:ChannelRouter — routing debug: parsing configs, computeScore calculations, tie-breakers
- app:slackConfig — Slack config loading
- app:mattermostConfig — Mattermost config loading (warns if fixtures are missing)
- app:openaiConfig — OpenAI config loading
- app:openWebUIConfig — OpenWebUI config loading
- app:flowiseSdkClient — Flowise SDK client requests/responses
- app:webhookSecurity — webhook security checks
- app:handleError — error logging helper
- app:getRandomDelay — timing helper logs
- app:rateLimiter — limiter logic logs
- app:redactSensitiveInfo — sensitive info redaction

Global Jest console suppression (tests):
- A global Jest setup suppresses console logs by default for cleaner test output. You can override with `ALLOW_CONSOLE=1` to see console output while testing.

## ChannelRouter feature flag and semantics

Routing is controlled by a feature flag and configuration inputs.

Feature flag:
- `MESSAGE_CHANNEL_ROUTER_ENABLED` (boolean)
  - When false: providers behave as before; `scoreChannel` returns 0 and no prioritization is applied.
  - When true: providers can compute per-channel scores and `ChannelRouter` may be used to pick a channel.

Provider parity (IMessengerService):
- Optional properties/methods:
  - `supportsChannelPrioritization?: boolean`
  - `scoreChannel?(channelId: string, metadata?: Record<string, any>): number`
- Implementations (Slack, Discord, Mattermost):
  - `supportsChannelPrioritization = true`
  - `scoreChannel()`:
    - Returns 0 if `MESSAGE_CHANNEL_ROUTER_ENABLED` is falsy.
    - Otherwise delegates to `ChannelRouter.computeScore(channelId, metadata)`.

Router configuration:
- `CHANNEL_BONUSES` and `CHANNEL_PRIORITIES` can be provided as CSV or JSON via messageConfig.
  - CSV format (bonuses): `channelA:1.5,channelB:2` (allowed: 1.0–2.0)
  - CSV format (priorities): `channelA:1,channelB:2` (non-negative integers)
  - JSON format example:
    ```
    {
      "bonuses": { "channelA": 1.5, "channelB": 2.0 },
      "priorities": { "channelA": 1, "channelB": 3 }
    }
    ```
- `ChannelRouter.computeScore(channelId, metadata?)` formula:
  - Base default is 1.0.
  - Score = base * bonus / (1 + priority)
- `ChannelRouter.pickBestChannel(candidates, metadata?)`:
  - Picks channel with highest score; tie-breakers: higher bonus, then lexicographic channel id.

Testing and characterization:
- Unit tests validate parser robustness and scorer behavior (including tie-breakers and invalid values).
- Characterization tests verify the gating behavior across providers:
  - Flag off → `scoreChannel` returns 0 without calling `computeScore`.
  - Flag on → delegates to `computeScore`.

## DiscordService initialization hardening

To avoid runtime crashes in environments where `discord.js` may be partially mocked or unavailable (e.g., certain tests), the initialization uses a defensive fallback for GatewayIntentBits:

- `SafeGatewayIntentBits` fallbacks are used:
  - When `GatewayIntentBits` fields are undefined, standard bitwise values are used:
    - Guilds → `1 << 0`
    - GuildMessages → `1 << 9`
    - MessageContent → `1 << 15`
    - GuildVoiceStates → `1 << 7`

This ensures module import/initialization does not throw `TypeError` on accessing `GatewayIntentBits.*`.

## Makefile and testing

- Use `make test` to run the full suite with coverage and explicit Jest config.
- Coverage thresholds are enforced via `package.json` (global thresholds; branches currently set to 66).
- Use `uv run -q npm test -- --config ./jest.config.js` for consistent local execution.

## Contribution workflow

- Keep changes modular and well-scoped; prefer debug logs over console.
- Run `make test` locally; ensure coverage thresholds are met.
- When introducing new routing logic:
  - Add or update `ChannelRouter` tests to preserve characterization.
  - Add provider-specific tests that mock `messageConfig` and `ChannelRouter` where appropriate.
- Document new debug namespaces and feature flags in this file.