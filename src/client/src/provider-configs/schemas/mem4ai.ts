import { ProviderConfigSchema } from '../types';

export const mem4aiProviderSchema: ProviderConfigSchema = {
    type: 'memory',
    providerType: 'mem4ai',
    label: 'mem4ai',
    description: 'mem4ai memory provider configuration',
    docsUrl: 'https://docs.mem4.ai',
    fields: [
        {
            name: 'apiKey',
            label: 'API Key',
            type: 'password',
            required: true,
            placeholder: 'Enter your mem4ai API key',
        },
        {
            name: 'apiUrl',
            label: 'API URL',
            type: 'url',
            required: false,
            placeholder: 'https://api.mem4.ai/v1',
            description: 'Optional custom API URL',
        },
        {
            name: 'tenantId',
            label: 'Tenant ID',
            type: 'text',
            required: false,
            placeholder: 'Enter your Tenant ID',
            description: 'Optional tenant identifier for isolated memory spaces',
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
