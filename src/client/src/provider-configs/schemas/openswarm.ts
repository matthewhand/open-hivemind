import type { ProviderConfigSchema } from '../types';

export const openSwarmProviderSchema: ProviderConfigSchema = {
    type: 'llm',
    providerType: 'openswarm',
    displayName: 'OpenSwarm',
    description: 'Swarm intelligence LLM provider.',
    icon: '🐝',
    color: '#FFB300',
    defaultConfig: {},
    fields: [],
};
