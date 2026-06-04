import type { ProviderConfigSchema } from '../types';

/**
 * UI config schema for the MemVault memory backend
 * (packages/memory-memvault). MemVault is a native, in-process RAG store that
 * ranks recall with a hybrid score (vector similarity + recency decay) and
 * needs no external infrastructure — so every field is optional and the
 * defaults mirror MemVaultConfig in the package.
 */
export const memvaultProviderSchema: ProviderConfigSchema = {
    type: 'memory',
    providerType: 'memvault',
    displayName: 'MemVault',
    description:
        'Native in-process RAG memory with hybrid scoring (vector similarity + recency decay). No external infrastructure required.',
    icon: '🗄️',
    color: '#8E44AD',
    defaultConfig: {
        vectorWeight: 0.8,
        recencyWeight: 0.2,
        defaultLimit: 10,
    },
    fields: [
        {
            name: 'embeddingProfile',
            label: 'Embedding Provider',
            type: 'text',
            required: false,
            description:
                'Name of the LLM provider used to generate embeddings. Leave blank to auto-select the first embedding-capable provider.',
            placeholder: 'openai',
            group: 'Model',
        },
        {
            name: 'vectorWeight',
            label: 'Vector Weight',
            type: 'number',
            required: false,
            description: 'Weight applied to vector similarity in the hybrid score (0–1).',
            defaultValue: 0.8,
            group: 'Scoring',
        },
        {
            name: 'recencyWeight',
            label: 'Recency Weight',
            type: 'number',
            required: false,
            description: 'Weight applied to the recency-decay term in the hybrid score (0–1).',
            defaultValue: 0.2,
            group: 'Scoring',
        },
        {
            name: 'recencyHalfLifeMs',
            label: 'Recency Half-Life (ms)',
            type: 'number',
            required: false,
            description:
                'Half-life of the recency-decay term, in milliseconds. Default is 7 days (604800000).',
            placeholder: '604800000',
            group: 'Scoring',
        },
        {
            name: 'defaultLimit',
            label: 'Default Result Limit',
            type: 'number',
            required: false,
            description: 'Number of results returned by searches that omit an explicit limit.',
            defaultValue: 10,
            group: 'Advanced',
        },
    ],
};
