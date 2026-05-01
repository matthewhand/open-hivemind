# @hivemind/message-webhook

Generic webhook messenger adapter for Open Hivemind. Lets you wire up a custom platform that isn't natively supported by exposing a small HTTP-style integration point on the `IMessengerService` contract.

## Exports

- `WebhookService` — class implementing `IMessengerService` (`initialize`, `sendMessageToChannel`, `getMessagesFromChannel`, `sendPublicAnnouncement`, `getClientId`, `getDefaultChannel`, `shutdown`, `setMessageHandler`)
- `schema` — UI/config schema descriptor
- `manifest` — `{ displayName: 'Webhook', type: 'message', ... }`
- `create(_config, dependencies)` — `IAdapterFactory` (also the default export)

## Status

This adapter is intentionally minimal. The current `WebhookService` exposes the right shape for the message pipeline but `sendMessageToChannel` does not yet POST anywhere — it returns a synthetic message ID. Wire up your own outbound HTTP in a wrapper or extend the class.

## Environment variables

None read directly.

## Usage

```ts
import createWebhook from '@hivemind/message-webhook';
import type { IServiceDependencies } from '@hivemind/shared-types';

const service = createWebhook({}, dependencies satisfies IServiceDependencies);
await service.initialize();
service.setMessageHandler(async (msg, history, botConfig) => `echo: ${msg.getText()}`);
```

## Tests

No package-level tests. The webhook surface is exercised through the main app's message routing tests.
