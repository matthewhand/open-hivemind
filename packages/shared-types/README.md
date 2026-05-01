# @hivemind/shared-types

Shared TypeScript interfaces, base classes, and small runtime helpers that Open Hivemind adapters and providers compile against. Platform-agnostic — no I/O of its own beyond a tiny SSRF-aware HTTP client.

## What's in here

This package defines the contracts every adapter implements:

- `IMessengerService`, `IMessage`, `IServiceDependencies`, `IAdapterFactory`, `IAdapterModule`, `IAdapterConfig`
- `ILlmProvider`
- `IMemoryProvider` (+ `MemoryEntry`, `MemorySearchResult`, `MemoryScopeOptions`)
- `IToolProvider` (+ `ToolDefinition`, `ToolInputSchema`, `ToolResult`, `ToolExecutionContext`)
- Bot/config accessor types: `IBotConfig`, `IConfigAccessor`, `GetBotConfigFn`, `GetAllBotConfigsFn`, `GetLlmProvidersFn`
- Misc: `IWebSocketService`, `IMetricsCollector`, `IChannelRouter`, `ILogger`, `IStartupGreetingService`, `SwarmClaim`

Plus a few runtime utilities that are small enough to live alongside the types:

- `BaseError`, `ValidationError`, `NetworkError`, `ApiError`, `ConfigurationError`, `defaultErrorFactory`
- `isSafeUrl`, `isPrivateIP` — SSRF guards used by every outbound HTTP call
- `http`, `createHttpClient`, `HttpError`, `isHttpError` — the shared HTTP client
- `randomId`, `randomUuid`, `cryptoJitter`

## Environment variables

Only the SSRF guard reads env directly:

| Variable | Purpose |
|---|---|
| `ALLOW_LOCAL_NETWORK_ACCESS` | When `'true'`, lets `isSafeUrl` return private/localhost addresses. |
| `MCP_INTERNAL_CIDR_ALLOWLIST` | Comma-separated CIDRs allowed even when private addresses are blocked. |

## Usage

```ts
import type { ILlmProvider, IMessage } from '@hivemind/shared-types';
import { http, isSafeUrl } from '@hivemind/shared-types';

if (!isSafeUrl(url).safe) throw new Error('refusing private URL');
const client = http.create('https://api.example.com');
const data = await client.get<{ ok: boolean }>('/health');
```

## Tests

`npm test` is a stub (`echo "No tests yet"`). The runtime helpers are exercised through the consuming adapters' test suites.
