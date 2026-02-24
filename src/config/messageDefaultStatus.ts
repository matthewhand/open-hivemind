import ProviderConfigManager from './ProviderConfigManager';

export interface MessageDefaultProviderSummary {
  id: string;
  name: string;
  type: string;
}

export interface MessageDefaultStatus {
  configured: boolean;
  providers: MessageDefaultProviderSummary[];
}

export const getMessageDefaultStatus = (): MessageDefaultStatus => {
  const providerManager = ProviderConfigManager.getInstance();
  const providers = providerManager
    .getAllProviders('message')
    .filter(provider => provider.enabled)
    .map(provider => ({
      id: provider.id,
      name: provider.name,
      type: provider.type,
    }));

  return {
    configured: providers.length > 0,
    providers,
  };
};
