import { ProviderConfigSchema } from '../types';

export const memVaultProviderSchema: ProviderConfigSchema = {
    type: 'memory',
    providerType: 'memvault',
    label: 'MemVault',
    description: 'MemVault memory securely stores memory contexts',
    docsUrl: 'https://github.com/memvault/memvault',
    fields: [
        {
            name: 'token',
            label: 'Access Token',
            type: 'password',
            required: true,
            placeholder: 'Enter your MemVault access token',
        },
        {
            name: 'endpoint',
            label: 'Endpoint URL',
            type: 'url',
            required: false,
            placeholder: 'http://localhost:3000/api/v1',
            description: 'Optional custom Endpoint URL',
        },
        {
            name: 'ttlDays',
            label: 'Time to Live (Days)',
            type: 'number',
            required: false,
            placeholder: '0',
            description: 'Number of days to retain memories (0 = infinite)',
            validation: {
                min: 0,
            },
        },
    ],
};
