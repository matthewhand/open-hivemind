import type { ProviderConfigSchema } from '../types';
import { validateApiKey } from '../../utils/apiKeyValidation';

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
            required: false,
            description: 'Your OpenWebUI API key (if using token auth, typically starts with sk-)',
            placeholder: 'sk-...',
            group: 'Authentication',
            validation: {
                pattern: '^sk-[A-Za-z0-9]{32,}$',
                custom: (value: string) => {
                    if (!value) return null; // Optional field
                    const result = validateApiKey('openwebui', value, false);
                    if (!result.isValid) {
                        return result.message || 'Invalid API key format';
                    }
                    return null;
                },
            },
        },
        {
            name: 'authHeader',
            label: 'Auth Header Name',
            type: 'text',
            required: false,
            description: 'Custom authorization header name if not standard (e.g. X-API-Key)',
            placeholder: 'Authorization',
            group: 'Authentication',
        },
        {
            name: 'username',
            label: 'Username',
            type: 'text',
            required: false,
            description: 'Your OpenWebUI Username (if using user/pass auth)',
            placeholder: 'admin',
            group: 'Authentication',
        },
        {
            name: 'password',
            label: 'Password',
            type: 'password',
            required: false,
            description: 'Your OpenWebUI Password',
            placeholder: '••••••••',
            group: 'Authentication',
        },
    ],
};
