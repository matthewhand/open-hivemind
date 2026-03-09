# @hivemind/memory-mem0

Mem0 memory provider for open-hivemind — persistent memory for AI agents.

## Overview

Mem0 is a **local SDK-based** memory provider that:
- **Extracts facts automatically** from conversations using LLM
- **Handles embeddings** using OpenAI or OpenAI-compatible backends
- **Stores vectors locally** or in external vector stores (Qdrant, Pinecone)

> **Note:** Mem0 uses the `mem0ai` SDK which supports OpenAI-compatible embedding backends (vLLM, Ollama, LiteLLM, etc.). Configure `llmBaseUrl` to point to your embedding server. Unlike Mem4ai and MemVault, Mem0 does NOT use `embeddingProviderId` or `llmProfileKey` - it manages embeddings directly via the SDK config.

## Features

- **Automatic Fact Extraction** — Extracts facts, preferences, and context from conversations
- **Semantic Search** — Vector-based memory search with relevance scoring
- **Multi-User Support** — Scoped memories per user and agent
- **Multiple Vector Stores** — In-memory, Qdrant, or Pinecone

## Installation

```bash
pnpm add @hivemind/memory-mem0
```

## Configuration

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `apiKey` | string | Yes | — | OpenAI API key for LLM and embeddings |
| `llmProvider` | string | No | `openai` | LLM provider (`openai` or `anthropic`) |
| `llmModel` | string | No | `gpt-4o-mini` | LLM model for memory extraction |
| `llmBaseUrl` | string | No | — | Custom LLM base URL |
| `embedderModel` | string | No | `text-embedding-3-small` | Embedding model |
| `vectorStoreProvider` | string | No | `memory` | Vector store (`memory`, `qdrant`, `pinecone`) |
| `historyDbPath` | string | No | — | Path to history database |
| `userId` | string | No | — | Default user ID scope |
| `agentId` | string | No | — | Default agent ID scope |

## Usage

```typescript
import { Mem0Provider, create } from '@hivemind/memory-mem0';

// Using factory
const provider = create({
  apiKey: process.env.OPENAI_API_KEY,
  userId: 'user-123',
});

// Or using class
const provider = new Mem0Provider({
  apiKey: process.env.OPENAI_API_KEY,
  llmModel: 'gpt-4o-mini',
  embedderModel: 'text-embedding-3-small',
});

// Add memories from conversation
const result = await provider.add([
  { role: 'user', content: 'My favorite color is blue' },
  { role: 'assistant', content: 'I\'ll remember that!' },
]);

// Search memories
const search = await provider.search('favorite color');
console.log(search.results);
// [{ id: 'mem-1', memory: 'User\'s favorite color is blue', score: 0.95 }]

// Get all memories
const all = await provider.getAll();

// Get specific memory
const memory = await provider.get('mem-1');

// Update memory
await provider.update('mem-1', 'User\'s favorite color is green');

// Delete memory
await provider.delete('mem-1');

// Delete all memories for user
await provider.deleteAll({ userId: 'user-123' });
```

## WebUI Configuration

1. Navigate to **Admin → Bot Management → Create Bot**
2. Select **Memory** tab
3. Choose **Mem0** from provider dropdown
4. Enter your OpenAI API key
5. Configure optional settings (model, vector store, etc.)
6. Save configuration

## Architecture

```
┌─────────────────────────────────────────┐
│           Mem0Provider                   │
├─────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────────┐   │
│  │   LLM       │  │   Embedder      │   │
│  │ (GPT-4o)    │  │ (text-embed-3)  │   │
│  └─────────────┘  └─────────────────┘   │
│         │                │              │
│         ▼                ▼              │
│  ┌─────────────────────────────────┐    │
│  │        Vector Store             │    │
│  │  (memory/qdrant/pinecone)       │    │
│  └─────────────────────────────────┘    │
└─────────────────────────────────────────┘
```

## Dependencies

- `mem0ai` — Mem0 SDK for memory management
- `debug` — Debug logging

## Comparison with Other Memory Providers

| Feature | Mem0 | Mem4ai | MemVault |
|---------|------|--------|----------|
| **Implementation** | Local SDK | External REST API | PostgreSQL |
| **Fact Extraction** | ✅ Automatic | ❌ Manual | ❌ Manual |
| **Embeddings** | Internal (OpenAI) | External providers | External providers |
| **`embeddingProviderId`** | ❌ Not supported | ✅ Supported | ✅ Supported |
| **`llmProfileKey`** | ❌ Not supported | ✅ Supported | ✅ Supported |
| **Vector Store** | Built-in | External | pgvector |
| **Adaptive Personalization** | ❌ No | ✅ Yes | ❌ No |
| **Hybrid Scoring** | ❌ No | ❌ No | ✅ Yes |

## License

MIT
