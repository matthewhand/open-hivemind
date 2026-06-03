# @hivemind/memory-postgres

Memory provider backed by the host application's Postgres `DatabaseManager` and a configured embedding-capable LLM provider. Stores vectors natively (no external memory service).

## Exports

This package re-exports everything from `PostgresMemoryProvider` via `src/index.ts` (`export * from './PostgresMemoryProvider'`):

- `PostgresMemoryProvider` — class implementing `IMemoryProvider`
- `PostgresMemoryConfig` — `{ embeddingProfile?: string }`
- `create(config, dependencies)` — plugin factory that returns a new `PostgresMemoryProvider`
- `manifest` — `{ displayName, description, type: 'memory' }` plugin metadata

The package is PluginLoader-compatible (it exposes both `create` and `manifest`). It still depends on the host's `DatabaseManager`, which must be supplied via `dependencies.getDatabaseManager()`.

## Environment variables

None read directly. Database connectivity is provided by the host app; the embedding profile is selected by the `embeddingProfile` config field, which must match the `name` of an LLM provider that exposes `generateEmbedding()`.

## Usage

```ts
import { PostgresMemoryProvider } from '@hivemind/memory-postgres';
import type { IServiceDependencies } from '@hivemind/shared-types';

const memory = new PostgresMemoryProvider(
  { embeddingProfile: 'openai-default' },
  dependencies satisfies IServiceDependencies,
);

await memory.addMemory('Standup is at 09:30', undefined, { userId: 'alice' });
```

If `dependencies.getDatabaseManager()` or a provider with `generateEmbedding()` is missing, calls throw `Error('PostgresMemoryProvider: ...')`.

## Tests

No package-level tests. Integration tests live in `tests/memory/postgres/` in the main app.
