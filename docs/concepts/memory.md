# Memory — giving agents continuity

> A bot that forgets the user's setup between messages is barely better than a search box.
> **Memory** lets each agent in the [society](society-of-agents.md) recall prior context —
> persisted across restarts — so long-lived agents behave like members, not sessions. This
> page documents the backends, the provider contract, where memory is read/written in the
> pipeline, and how retention is bounded.

Source of truth: `packages/shared-types/src/IMemoryProvider.ts` (contract),
`src/services/MemoryManager.ts` (resolution + lifecycle),
`src/message/handlers/inferenceProcessor.ts` / `outputProcessor.ts` (pipeline wiring),
`src/config/databaseConfig.ts` (retention), `/api/config/memory-profiles` (CRUD).

---

## Pluggable backends

Memory is provider-agnostic. Each backend is an independent package loaded at runtime as
`memory-<provider>`:

| Backend | Package | Notes |
|---|---|---|
| **MemVault** | `memory-memvault` | Built-in durable store (SQLite via `DatabaseManager`, in-memory cache on top). The zero-dependency default. |
| **Mem0** | `memory-mem0` | External Mem0 service / vector store. |
| **Mem4AI** | `memory-mem4ai` | Mem4AI backend. |
| **PostgreSQL** | `memory-postgres` | Postgres/pgvector for larger deployments. |

All implement the same `IMemoryProvider` contract, so swapping backends is a config
change, not a code change. (The interface doc also names Zep and Letta as conceptual
fits for the same contract.)

### The provider contract

```ts
interface IMemoryProvider {
  addMemory(content, ...): Promise<...>
  searchMemories(query, ...): Promise<MemoryResult>   // relevance-scored (0–1)
  getMemories(opts?): Promise<MemoryEntry[]>
  getMemory(id): Promise<MemoryEntry | null>
  updateMemory(id, ...): Promise<...>
  deleteMemory(id): Promise<void>
  deleteAll(scope?): Promise<void>
  healthCheck(): Promise<{ status: 'ok' | 'error'; details? }>
}
```

A `MemoryEntry` carries the stored `content`, a relevance `score` (populated on search),
and an epoch-ms timestamp. The contract supports both a content-based API and a
conversation-context API (messages array).

---

## How memory reaches a bot

`MemoryManager` (singleton) resolves a provider **per bot** from the bot's assigned memory
profile, caches it by profile key, and injects dependencies so the provider can work:
the `DatabaseManager` (for the durable MemVault store) and the LLM providers (for
embeddings). Provider calls are bounded by a ~5s timeout, and failures are
rate-limit-warned rather than crashing the pipeline (`MemoryManager.getProviderForBot`).

Memory **profiles** are managed at `/api/config/memory-profiles` and the **Memory** admin
page — a profile picks the provider and its connection/config, and bots reference a
profile.

---

## Where memory lives in the message pipeline

Memory is both **read** (to enrich the prompt) and **written** (to remember the exchange):

1. **Read — Inference stage** (`inferenceProcessor.ts:53`). A `memory_search` step calls
   `retrieveRelevantMemories(...)`, formats the hits with `formatMemoriesForPrompt(...)`,
   and **prepends** them to the persona's system prompt:
   `systemPrompt = personaPrompt + "\n\n" + memoryContext`. So memory augments the
   agent's [voice](personas.md) with what it knows about this user/conversation.
2. **Write — Output stage** (`outputProcessor.ts:185`). A `memory_store` step calls
   `storeConversationMemory(botName, message, role, meta)` for the user message (and the
   assistant reply), persisting the exchange for next time.
3. **Summarize — Enrich stage** (optional). `ConversationSummaryService` can summarize
   older history turns so long conversations stay affordable
   (`MESSAGE_HISTORY_SUMMARY_ENABLED`, **default off**).

---

## Bounding growth — retention & eviction

Memory is opt-in-bounded so it doesn't grow without limit
(`src/config/databaseConfig.ts`):

| Setting | Env | Effect |
|---|---|---|
| TTL eviction | `MEMORY_RETENTION_DAYS` | Delete memories older than N days during cleanup. `0` = disabled (opt-in). |
| Max-count eviction | `MEMORY_MAX_ENTRIES` | Keep at most the N newest memories during cleanup. `0` = disabled (opt-in). |
| Auto-retention | `DATABASE_AUTO_RETENTION` | Adjust retention automatically by DB tier (Lite / Standard / Cloud). |
| Cleanup on startup | `DATABASE_AUTO_CLEANUP_STARTUP` | Run the cleanup pass at boot. |
| History cap | `MAX_HISTORY_ROWS` | Upper bound on stored conversation-history rows. |

The DB and its retention live under the **state** class — see
[Data Directories](../reference/data-directories.md) for where `hivemind.db` sits and what
to back up.

> **Status (honest):** core memory — pluggable backends, per-bot resolution, pipeline
> read/write, retention/eviction, MemVault durable store — is shipped. Some depth items
> (Postgres/pgvector MemVault store, broader summarization) are partial; see
> [FEATURE_STATUS.md](../FEATURE_STATUS.md) (memory domain) and [ROADMAP.md](../../ROADMAP.md).

## See also

- [How the Society Works](society-of-agents.md) · [Personas](personas.md) — memory augments the persona's prompt
- [Data Directories & Filesystem Layout](../reference/data-directories.md) — where the memory DB lives / backups
- [FEATURE_STATUS.md](../FEATURE_STATUS.md) · [ROADMAP.md](../../ROADMAP.md) — memory status
