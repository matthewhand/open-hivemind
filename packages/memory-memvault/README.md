# @hivemind/memory-memvault

> RAG memory via PostgreSQL + pgvector with hybrid vector/recency scoring

## Overview

MemVault is a memory provider that offers:
- **PostgreSQL + pgvector** — Production-grade vector storage
- **Hybrid Scoring** — `(vector similarity × 0.8) + (recency decay × 0.2)`
- **Cloud or Self-Hosted** — Use managed API or your own Postgres
- **GraphRAG Support** — Entity extraction and graph building

## Installation

```bash
pnpm add @hivemind/memory-memvault
```

## Configuration

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `host` | string | Yes | — | PostgreSQL server hostname |
| `port` | number | No | `5432` | PostgreSQL server port |
| `database` | string | Yes | — | Database name |
| `user` | string | Yes | — | PostgreSQL username |
| `password` | string | Yes | — | PostgreSQL password |
| `vectorDimension` | number | No | `1536` | Embedding vector dimension |
| `vectorWeight` | number | No | `0.8` | Weight for vector similarity |
| `recencyWeight` | number | No | `0.2` | Weight for recency decay |
| `embeddingEndpoint` | string | No | — | Custom embedding API endpoint |
| `embeddingApiKey` | string | No | — | API key for embedding endpoint |
| `embeddingModel` | string | No | — | Embedding model name |
| `llmProfileKey` | string | No | — | LLM profile key for embeddings |

## Usage

```typescript
import { MemVaultProvider, create } from '@hivemind/memory-memvault';

// Using factory
const provider = create({
  host: 'localhost',
  port: 5432,
  database: 'memvault',
  user: 'postgres',
  password: process.env.POSTGRES_PASSWORD,
  vectorDimension: 1536,
});

// Or using class
const provider = new MemVaultProvider({
  host: 'db.example.com',
  port: 5432,
  database: 'memvault',
  user: 'memvault_user',
  password: process.env.POSTGRES_PASSWORD,
  vectorWeight: 0.8,
  recencyWeight: 0.2,
});

// Add memories from conversation
const result = await provider.add([
  { role: 'user', content: 'I work at Acme Corp' },
  { role: 'assistant', content: 'Got it, I\'ll remember that.' },
], { userId: 'user-123' });

// Search with hybrid scoring
const search = await provider.search('work', { userId: 'user-123', limit: 10 });
console.log(search.results);
// [{ id: 'mv_123', memory: 'User works at Acme Corp', score: 0.87 }]

// Get all memories for user
const all = await provider.getAll({ userId: 'user-123' });

// Get specific memory
const memory = await provider.get('mv_123');

// Update memory
await provider.update('mv_123', 'User works at TechCorp');

// Delete memory
await provider.delete('mv_123');

// Delete all memories for user
await provider.deleteAll({ userId: 'user-123' });

// Health check
const isHealthy = await provider.healthCheck();

// Disconnect
await provider.disconnect();
```

## Hybrid Scoring

MemVault uses a hybrid scoring formula for search results:

```
score = (vector_similarity × vectorWeight) + (recency_decay × recencyWeight)
```

Where:
- **vector_similarity**: Cosine similarity between query and memory embeddings
- **recency_decay**: Exponential decay based on memory age (`e^(-age_days / 30)`)

Default weights (`0.8` / `0.2`) prioritize semantic relevance while still favoring recent memories.

## WebUI Configuration

1. Navigate to **Admin → Bot Management → Create Bot**
2. Select **Memory** tab
3. Choose **MemVault** from provider dropdown
4. Enter PostgreSQL connection details
5. Configure scoring weights (optional)
6. Save configuration

## Database Setup

```sql
-- Create database
CREATE DATABASE memvault;

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- MemVault will create tables automatically
```

## Testing

```bash
cd packages/memory-memvault
pnpm test
```

## License

MIT
