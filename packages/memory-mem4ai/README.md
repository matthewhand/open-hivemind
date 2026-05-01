# @hivemind/memory-mem4ai

Memory provider that connects to the [Mem4ai](https://mem4ai.com) REST API. LLM-friendly memory with adaptive personalization. Implements `IMemoryProvider` and includes a built-in `CircuitBreaker` for resiliency.

## Exports

- `Mem4aiProvider` — provider class
- `Mem4aiConfig` — configuration shape (`apiUrl` required, `apiKey`, `organizationId`, `userId`, `agentId`, `embeddingProviderId`, `limit`, `timeout`, `maxRetries`, `circuitBreaker`)
- Response types: `Mem4aiMemory`, `Mem4aiAddResponse`, `Mem4aiListResponse`, `Mem4aiSearchResponse`, `Mem4aiGetResponse`, `Mem4aiUpdateResponse`
- `Mem4aiApiError` — thrown on non-2xx responses
- `schema`, `manifest`
- `create(config)` — factory used by the PluginLoader

## Environment variables

This package does **not** read `process.env` directly. All settings are passed via `config` from the bot configuration.

## Usage

```ts
import { create as createMem4ai } from '@hivemind/memory-mem4ai';

const memory = createMem4ai({
  apiUrl: 'https://api.mem4ai.example.com',
  apiKey: process.env.MEM4AI_API_KEY!,
  userId: 'bob',
  limit: 10,
});

await memory.addMemory('Standups at 9:30 AEST', undefined, { userId: 'bob' });
const hits = await memory.searchMemory('what time are standups?', { userId: 'bob' });
```

## Tests

`npm test` is a stub. The provider is exercised through the main app's memory test suite.
