import type { ProviderConfigSchema } from '../types';

export const openSwarmProviderSchema: ProviderConfigSchema = {
    type: 'llm',
    providerType: 'openswarm',
    displayName: 'OpenSwarm',
    description: 'Multi-agent orchestration via OpenSwarm — coordinate teams of AI agents.',
    icon: '🐝',
    color: '#F39C12',
    defaultConfig: {
        baseUrl: 'http://localhost:8000/v1',
        apiKey: 'dummy-key',
        team: 'default-team',
    },
    fields: [
        {
            name: 'baseUrl',
            label: 'Base URL',
            type: 'url',
            required: true,
            description: 'OpenSwarm API base URL',
            placeholder: 'http://localhost:8000/v1',
            group: 'Connection',
        },
        {
            name: 'apiKey',
            label: 'API Key',
            type: 'password',
            required: false,
            description: 'OpenSwarm API key (use dummy-key for local instances)',
            placeholder: 'dummy-key',
            group: 'Authentication',
        },
        {
            name: 'team',
            label: 'Team Name',
            type: 'text',
            required: true,
            description: 'The OpenSwarm team/agent group to route messages to',
            placeholder: 'default-team',
            group: 'Agent',
        },
    ],
};
