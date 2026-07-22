# @hivemind/message-webhook

Generic webhook messenger adapter for Open Hivemind. Lets you wire up a custom platform that isn't natively supported by exposing a small HTTP-style integration point on the `IMessengerService` contract.

## Exports

- `WebhookService` — class implementing `IMessengerService` (`initialize`, `sendMessageToChannel`, `getMessagesFromChannel`, `sendPublicAnnouncement`, `getClientId`, `getDefaultChannel`, `shutdown`, `setMessageHandler`)
- `schema` — UI/config schema descriptor
- `manifest` — `{ displayName: 'Webhook', type: 'message', ... }`
- `create(_config, dependencies)` — `IAdapterFactory` (also the default export)

## Status

**Maturity: beta.** Outbound `sendMessageToChannel` performs a real HTTP POST to the resolved webhook URL and throws on missing URL, non-2xx responses, or timeout. Inbound receive is push-based via `handleIncomingWebhook` (no message history poll — `getMessagesFromChannel` returns `[]` by design).

## Environment variables

| Variable | Description |
|---|---|
| `WEBHOOK_URL` | Default outbound URL (overridden by service config or per-bot `webhook.url`) |
| `WEBHOOK_TOKEN` | Optional bearer token for outbound deliveries |

Per-bot config may also set `webhook.url` / `webhook.token` / `webhook.timeoutMs` (or `WEBHOOK_URL` / `WEBHOOK_TOKEN` on the bot record).

## Usage

```ts
import createWebhook from '@hivemind/message-webhook';
import type { IServiceDependencies } from '@hivemind/shared-types';

const service = createWebhook(
  { outboundUrl: process.env.WEBHOOK_URL },
  dependencies satisfies IServiceDependencies
);
await service.initialize();
service.setMessageHandler(async (msg, history, botConfig) => `echo: ${msg.getText()}`);
// Outbound: real POST — requires WEBHOOK_URL (or per-bot webhook.url)
await service.sendMessageToChannel('channel-1', 'hello from open-hivemind');
```

## Tests

No package-level tests. The webhook surface is exercised through the main app's message routing tests.
