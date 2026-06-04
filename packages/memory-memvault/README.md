# @hivemind/memory-memvault

Native, in-process RAG memory provider for Open Hivemind. Ranks memories with a
**hybrid score** that blends embedding (vector) similarity with an exponential
recency-decay term:

```
score = (cosine similarity × vectorWeight) + (recency decay × recencyWeight)
```

The default weights are `0.8` (vector) and `0.2` (recency), and the two weights
sum to `1` so scores stay in the same `[0, 1]` range as a plain cosine
similarity — keeping `threshold` filtering intuitive.

## Exports

`src/index.ts` re-exports:

- `MemVaultProvider` — class implementing `IMemoryProvider`
- `MemVaultConfig` — `{ embeddingProfile?, vectorWeight?, recencyWeight?, recencyHalfLifeMs?, defaultLimit? }`
- `InMemoryMemVaultStore` — default dependency-free store
- `MemVaultStore`, `StoredMemory` — pluggable-store contract types
- `cosineSimilarity`, `recencyDecay`, `hybridScore` — scoring primitives
- `create(config, dependencies)` — PluginLoader-compatible factory
- `manifest` — `{ displayName, description, type: 'memory' }`

## Embeddings

Embeddings are produced by an injected LLM provider that exposes
`generateEmbedding()`, resolved from `dependencies.getLlmProviders()`. Set
`config.embeddingProfile` to pin a specific provider by its `name`; otherwise the
first embedding-capable provider is used. Calls throw
`Error('MemVaultProvider: embedding provider not available')` when none is found.

## Storage

Persistence is delegated to a pluggable `MemVaultStore`. The default
`InMemoryMemVaultStore` keeps records in a `Map` and requires **no external
infrastructure** — suitable for development, tests, and single-process
deployments. A durable Postgres + pgvector store can implement the same
`MemVaultStore` contract without changing the provider's scoring or public API
(see "Deferred" below).

## Usage

```ts
import { MemVaultProvider } from '@hivemind/memory-memvault';
import type { IServiceDependencies } from '@hivemind/shared-types';

const memory = new MemVaultProvider(
  { embeddingProfile: 'openai-default' },
  dependencies satisfies IServiceDependencies,
);

await memory.addMemory('Standup is at 09:30', undefined, { userId: 'alice' });
const { results } = await memory.searchMemories('when is standup?', { userId: 'alice' });
```

## Deferred

A durable Postgres + pgvector persistence backend is intentionally **not**
included here to avoid pulling in heavy runtime dependencies and external
infrastructure. The `MemVaultStore` interface is the seam where it would plug in;
the scoring and provider API are designed to stay unchanged.

## Tests

`src/scoring.test.ts` and `src/MemVaultProvider.test.ts` cover the hybrid scoring
math and the full provider CRUD/search surface against the in-memory store.
