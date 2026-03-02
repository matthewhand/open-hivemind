import type { ProviderConfigSchema } from '../types';

export const openWebUiProviderSchema: ProviderConfigSchema = {
    type: 'llm',
    providerType: 'openwebui',
    displayName: 'OpenWebUI',
    description: 'Connect your bot to an OpenWebUI instance to access configured models.',
    icon: '🌐',
    color: '#2980B9',
    defaultConfig: {},
    fields: [
        {
            name: 'apiUrl',
            label: 'API URL',
            type: 'url',
            required: true,
            description: 'Your OpenWebUI API base URL',
            placeholder: 'http://localhost:3000/api/',
            group: 'Connection',
        },
        {
            name: 'apiKey',
            label: 'API Key',
            type: 'password',
            required: true,
            description: 'Your OpenWebUI API key',
            placeholder: 'sk-...',
            group: 'Authentication',
        },
    ],
};
