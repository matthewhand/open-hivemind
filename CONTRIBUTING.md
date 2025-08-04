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

## ChannelRouter quick snippet (enable flag and verify delegation)

Environment (choose CSV or JSON)

CSV
```
MESSAGE_CHANNEL_ROUTER_ENABLED=true
CHANNEL_BONUSES="X:2,Y:1"
CHANNEL_PRIORITIES="X:0,Y:1"
```

JSON
```
MESSAGE_CHANNEL_ROUTER_ENABLED=true
CHANNEL_BONUSES='{"X":2,"Y":1}'
CHANNEL_PRIORITIES='{"X":0,"Y":1}'
```

Minimal Jest check for gating
```ts
// tests/integrations/channelRouting/scoreChannel.gating.quick.test.ts
import * as ChannelRouter from '@message/routing/ChannelRouter';
import * as messageConfig from '@message/interfaces/messageConfig';

describe('scoreChannel gating (quick)', () => {
  const spy = jest.spyOn(ChannelRouter, 'computeScore').mockReturnValue(42);

  afterEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('flag disabled: returns 0 and does not call computeScore', async () => {
    jest.spyOn(messageConfig, 'MESSAGE_CHANNEL_ROUTER_ENABLED', 'get').mockReturnValue(false);
    const { default: DiscordService } = await import('@integrations/discord/DiscordService');
    const svc = new DiscordService({} as any);
    const score = svc.scoreChannel?.('channelA');
    expect(score).toBe(0);
    expect(spy).not.toHaveBeenCalled();
  });

  it('flag enabled: delegates to ChannelRouter.computeScore', async () => {
    jest.spyOn(messageConfig, 'MESSAGE_CHANNEL_ROUTER_ENABLED', 'get').mockReturnValue(true);
    const { default: DiscordService } = await import('@integrations/discord/DiscordService');
    const svc = new DiscordService({} as any);
    const score = svc.scoreChannel?.('channelA');
    expect(score).toBe(42);
    expect(spy).toHaveBeenCalledWith('channelA', expect.any(Object));
  });
});
```

Reference docs: see docs/channel-routing.md for full configuration, formula, and troubleshooting.

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