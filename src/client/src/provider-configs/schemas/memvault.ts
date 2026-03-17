import type { ProviderConfigSchema } from '../types';

export const memvaultProviderSchema: ProviderConfigSchema = {
    type: 'memory',
    providerType: 'memvault',
    displayName: 'MemVault',
    description: 'Secure and encrypted memory vault.',
    icon: '🔒',
    color: '#1565C0',
    defaultConfig: {},
    fields: [],
};
