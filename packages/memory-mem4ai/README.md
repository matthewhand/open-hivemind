# @hivemind/memory-mem4ai

> LLM-friendly memory management with adaptive personalization and flexible metadata tagging

## Overview

Mem4ai is a memory provider that offers:
- **Adaptive Personalization** — Learns from user behavior
- **Flexible Metadata Tagging** — Attach custom metadata to memories
- **LLM-Friendly API** — Designed for AI agent workflows
- **Embedding Profile Integration** — Works with open-hivemind LLM profiles

## Installation

```bash
pnpm add @hivemind/memory-mem4ai
```

## Configuration

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `apiUrl` | string | Yes | — | Mem4ai API base URL |
| `apiKey` | string | Yes | — | Mem4ai API key |
| `organizationId` | string | No | — | Organization ID for multi-tenant |
| `userId` | string | No | — | User ID scope |
| `agentId` | string | No | — | Agent ID scope |
| `adaptivePersonalization` | boolean | No | `true` | Enable adaptive personalization |
| `defaultTags` | string[] | No | — | Default tags for new memories |
| `embeddingProviderId` | string | No | — | Reference to LLM provider for embeddings |
| `embeddingProfileKey` | string | No | — | LLM profile key for embeddings |
| `llmProfileKey` | string | No | — | LLM profile key for operations |
| `limit` | number | No | `10` | Default result limit |
| `timeout` | number | No | `30000` | Request timeout (ms) |
| `debug` | boolean | No | `false` | Enable debug logging |

## Usage

```typescript
import { Mem4aiProvider, create } from '@hivemind/memory-mem4ai';

// Using factory
const provider = create({
  apiUrl: 'https://api.mem4ai.com/v1',
  apiKey: process.env.MEM4AI_API_KEY,
  userId: 'user-123',
  adaptivePersonalization: true,
});

// Or using class
const provider = new Mem4aiProvider({
  apiUrl: 'https://api.mem4ai.com/v1',
  apiKey: process.env.MEM4AI_API_KEY,
  defaultTags: ['important', 'work'],
});

// Add a memory
const memory = await provider.addMemory('User prefers dark mode', {
  category: 'preferences',
  source: 'settings',
});
console.log(memory.id);

// Search memories
const results = await provider.searchMemories('dark mode', 5);
console.log(results);
// [{ id: 'mem-1', content: 'User prefers dark mode', score: 0.92 }]

// Get all memories
const memories = await provider.getMemories(20);

// Update a memory
const updated = await provider.updateMemory('mem-1', 'User prefers light mode', {
  category: 'preferences',
});

// Delete a memory
await provider.deleteMemory('mem-1');

// Health check
const isHealthy = await provider.healthCheck();
```

## WebUI Configuration

1. Navigate to **Admin → Bot Management → Create Bot**
2. Select **Memory** tab
3. Choose **Mem4ai** from provider dropdown
4. Enter API URL and API Key
5. Configure optional settings (user ID, tags, etc.)
6. Save configuration

## Embedding Profile Integration

Mem4ai can use open-hivemind LLM profiles for embeddings:

```typescript
const provider = create({
  apiUrl: 'https://api.mem4ai.com/v1',
  apiKey: process.env.MEM4AI_API_KEY,
  embeddingProviderId: 'openai', // Reference to LLM provider
  embeddingProfileKey: 'default', // LLM profile key
});
```

## Testing

```bash
cd packages/memory-mem4ai
pnpm test
```

## License

MIT
