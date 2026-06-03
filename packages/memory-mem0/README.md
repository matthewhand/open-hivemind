# @hivemind/memory-mem0

Memory provider that connects to the [Mem0](https://mem0.ai) REST API (or a self-hosted instance). Implements `IMemoryProvider` so bots can persist and search facts across conversations.

## Exports

- `Mem0Provider` — provider class
- `Mem0Config` — configuration shape (`apiKey`, `baseUrl`, `userId`, `agentId`, `orgId`, `llmProvider`, `llmModel`, `embedderModel`, `vectorStoreProvider`, `historyDbPath`, `timeoutMs`, `maxRetries`, `circuitBreaker`)
- Response types: `Mem0Memory`, `Mem0AddResponse`, `Mem0ListResponse`, `Mem0SearchResponse`, `Mem0GetResponse`, `Mem0UpdateResponse`
- `Mem0ApiError` — thrown on non-2xx responses
- `schema`, `manifest`
- `create(config)` — factory used by the PluginLoader

## Environment variables

This package does **not** read `process.env` directly. The Mem0 API key and other settings are passed through `config` from the bot configuration UI / file. Set them there.

## Usage

```ts
import { create as createMem0 } from '@hivemind/memory-mem0';

const memory = createMem0({
  apiKey: process.env.MEM0_API_KEY!,
  baseUrl: 'https://api.mem0.ai/v1',
  userId: 'alice',
});

await memory.addMemory('Prefers dark mode', { source: 'profile' }, { userId: 'alice' });
const hits = await memory.searchMemory('display preferences', { userId: 'alice' });
```

## Tests

`npm test` is a stub. End-to-end coverage lives in `tests/memory/mem0/` in the main app.
