import type { ProviderConfigSchema } from '../types';

/**
 * UI config schema for the Postgres (pgvector) memory backend
 * (packages/memory-postgres). It stores embeddings in the application's
 * configured Postgres database, so connection details come from the server's
 * DATABASE_* configuration rather than this form — the only per-profile option
 * is which LLM provider generates the embeddings.
 */
export const postgresMemoryProviderSchema: ProviderConfigSchema = {
    type: 'memory',
    providerType: 'postgres',
    displayName: 'Postgres (pgvector)',
    description:
        'Durable vector memory backed by your Postgres database via pgvector. Uses the server DATABASE_* connection; choose which provider generates embeddings.',
    icon: '🐘',
    color: '#336791',
    defaultConfig: {},
    fields: [
        {
            name: 'embeddingProfile',
            label: 'Embedding Provider',
            type: 'text',
            required: false,
            description:
                'Name of the LLM provider used to generate embeddings. Must implement generateEmbedding (e.g. OpenAI or OpenWebUI/Ollama). Leave blank to auto-select the first embedding-capable provider.',
            placeholder: 'openai',
            group: 'Model',
        },
    ],
};
