# @hivemind/message-discord

Discord adapter for Open Hivemind. Wraps `discord.js` (with voice support via `@discordjs/voice` + `ffmpeg-static` + `libsodium-wrappers`) and exposes the standard `IMessengerService` contract.

## Exports

- `DiscordService`, `Discord` — service class + namespace
- `DiscordMessage` (default re-export of `./DiscordMessage`)
- `DiscordMessageProvider` — message-provider variant used by the new pipeline
- `testDiscordConnection` — connection probe used by the WebUI
- `Bot` — type from `DiscordBotManager`
- `schema` — UI/config schema descriptor
- `adapterMetadata` — `{ name, version, platform: 'discord' }`
- `manifest` — `{ displayName: 'Discord', type: 'message', ... }`
- `createDiscordService` (also `create`, default export) — `IAdapterFactory`

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `DISCORD_BOT_TOKEN` | legacy / fallback | Single-bot token. Multi-bot setups should use the bot config UI instead, where each bot supplies its own token. |

## Usage

```ts
import createDiscordService from '@hivemind/message-discord';
import type { IAdapterConfig, IServiceDependencies } from '@hivemind/shared-types';

const service = createDiscordService(
  { botConfig: { name: 'mybot', discord: { token: process.env.DISCORD_BOT_TOKEN! } } } as IAdapterConfig,
  dependencies satisfies IServiceDependencies,
);
await service.initialize();
```

## Tests

`npm test` is a stub. The Discord adapter has substantial coverage in `tests/message/discord/` in the main app.
