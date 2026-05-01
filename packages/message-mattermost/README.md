# @hivemind/message-mattermost

Mattermost adapter for Open Hivemind. Talks to a self-hosted Mattermost server over its REST API using `axios`. Supports multiple bot instances driven by the host app's `BotConfigurationManager`.

## Exports

- `MattermostService` (also default export) — singleton service implementing `IMessengerService`
- `MattermostClient` — thin REST client (default re-export of `./mattermostClient`)
- `MattermostMessage`, `MattermostPost` — message wrapper + raw post type
- `testMattermostConnection`, `MattermostConnectionTestResult` — connection probe used by the WebUI
- `schema` — UI/config schema descriptor
- `manifest` — `{ displayName: 'Mattermost', type: 'message', ... }`
- `create(_config?)` — factory; returns the singleton

## Environment variables

This package does **not** read `process.env` directly. Per-bot Mattermost settings (`token`, server URL, etc.) come from the bot config (`bot.mattermost.token` is required for an instance to be initialised).

## Usage

```ts
import { create as createMattermost } from '@hivemind/message-mattermost';

const service = createMattermost();
await service.initialize();
const id = await service.sendMessageToChannel('town-square', 'Hello team', 'mybot');
```

## Tests

`npm test` is a stub. Integration coverage lives in `tests/message/mattermost/` in the main app.
