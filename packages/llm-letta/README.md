# @hivemind/llm-letta

LLM provider for [Letta](https://letta.com) (formerly MemGPT) — stateful agents with persistent memory, accessed via the official `@letta-ai/letta-client` SDK. Works against both Letta Cloud and self-hosted servers.

## Exports

- `LettaProvider`, `LettaProviderConfig` — provider class plus its config interface (`agentId`, `systemPrompt`, `sessionMode`, `conversationId`)
- `listAgents`, `getAgent`, `AgentSummary` — helpers in `agentBrowser` for picking an agent ID at config time
- `schema` — UI/config schema descriptor
- `manifest` — `{ displayName: 'Letta', type: 'llm', ... }`
- `create(config?)` — factory returning the singleton instance

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `LETTA_SERVER_PASSWORD` | yes | API key for Letta Cloud (`sk-let-...`) or the server password for a self-hosted instance. Used as `apiKey` for the SDK in both modes. |
| `LETTA_AGENT_ID` | optional | Default agent to talk to when no `agentId` is supplied via config or per-message metadata. |

## Usage

```ts
import { create as createLetta } from '@hivemind/llm-letta';

const provider = createLetta({
  agentId: process.env.LETTA_AGENT_ID,
  sessionMode: 'per-channel',
});

const reply = await provider.generateChatCompletion('What did we decide last week?', []);
```

`sessionMode` controls how conversations are scoped: `default`, `per-channel`, `per-user`, or `fixed` (uses `conversationId`).

## Tests

`npm test` is a stub. See `tests/llm/letta/` in the main app for integration coverage.
