import ProviderConfigManager from './ProviderConfigManager';

export interface LlmDefaultProviderSummary {
  id: string;
  name: string;
  type: string;
}

export interface LlmDefaultStatus {
  configured: boolean;
  providers: LlmDefaultProviderSummary[];
}

export const getLlmDefaultStatus = (): LlmDefaultStatus => {
  const providerManager = ProviderConfigManager.getInstance();
  const providers = providerManager
    .getAllProviders('llm')
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
