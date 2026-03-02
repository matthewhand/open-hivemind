import type { ProviderConfigSchema } from '../types';

export const mattermostProviderSchema: ProviderConfigSchema = {
    type: 'message',
    providerType: 'mattermost',
    displayName: 'Mattermost',
    description: 'Connect your bot to a Mattermost team chat.',
    icon: '💬',
    color: '#0058CC',
    defaultConfig: {},
    fields: [
        {
            name: 'serverUrl',
            label: 'Server URL',
            type: 'url',
            required: true,
            description: 'Your Mattermost server endpoint URL',
            placeholder: 'https://mattermost.example.com',
            group: 'Connection',
        },
        {
            name: 'token',
            label: 'Access Token',
            type: 'password',
            required: true,
            description: 'Bot access token for Mattermost',
            placeholder: 'token123...',
            group: 'Authentication',
        },
    ],
};
