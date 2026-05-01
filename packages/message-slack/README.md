# @hivemind/message-slack

Slack adapter for Open Hivemind. Built on `@slack/web-api`, `@slack/socket-mode`, `@slack/rtm-api`, and `@slack/webhook`. Supports multiple Slack workspaces and Block Kit interactivity.

## Exports

Core / loaders / routing / events / utils:

- `SlackConfigurationLoader`, `SlackInstanceFactory`
- `SlackRouteRegistry`
- `SlackMessageHandler`, `SlackEventProcessor`, `SlackMessageProcessor`
- `SlackChannelManager`

Backwards-compatible classes:

- `SlackService` (default + named), `SlackBotManager`, `SlackSignatureVerifier`
- `SlackInteractiveHandler`, `SlackInteractiveActions`
- `SlackWelcomeHandler`, `SlackMessage` (default), `SlackMessageProvider`
- `testSlackConnection`

Plus `schema`, `manifest` (`{ displayName: 'Slack', type: 'message', ... }`), and `create(_config?)` returning the singleton.

## Environment variables

| Variable | Purpose |
|---|---|
| `SLACK_BOT_TOKEN` | xoxb token. Used as a single-bot fallback when no instances are configured. |
| `SLACK_SIGNING_SECRET` | Slack request signing secret. |
| `SLACK_APP_TOKEN` | Socket Mode app-level token (xapp). |
| `SLACK_DEFAULT_CHANNEL_ID` | Channel used when one isn't supplied (interactive fallback, etc.). |
| `SLACK_JOIN_CHANNELS` | Comma-separated channels to join at boot. |
| `SLACK_INCLUDE_HISTORY` | When `'true'`, include channel history in responses. |
| `SLACK_FAKE_TYPING` | When `'false'`, disables the typing indicator simulation. |
| `SLACK_ENABLE_STATUS_UPDATES` | When `'true'`, send periodic status updates. |
| `SLACK_BUTTON_MAPPINGS` | JSON mapping of Block Kit button IDs to actions. |
| `MESSAGE_USERNAME_OVERRIDE` | Display name override (default `SlackBot`). |
| `INCLUDE_SLACK_METADATA` | When `'true'`, include Slack event metadata in messages. |
| `SUPPRESS_CANVAS_CONTENT` | When `'true'`, drops canvas blocks from message text. |
| `RESOURCE_URL`, `REPORT_ISSUE_URL` | Welcome-handler link targets. |
| `NODE_CONFIG_DIR` | Where to load JSON bot configs from (default `config`). |

## Usage

```ts
import { create as createSlack } from '@hivemind/message-slack';

const service = createSlack();
await service.initialize();
await service.sendMessageToChannel('C12345', 'Deploy complete', 'CI');
```

## Tests

`npm test` is a stub. Slack has extensive coverage in `tests/message/slack/` in the main app.
