import ProviderConfigManager from './ProviderConfigManager';

export interface LlmDefaultProviderSummary {
  id: string;
  name: string;
  type: string;
  source?: 'system' | 'bot-env';
  hasApiKey?: boolean;
}

export interface LlmDefaultStatus {
  configured: boolean;
  providers: LlmDefaultProviderSummary[];
  libraryStatus: Record<string, { installed: boolean; package: string }>;
}

const REQUIRED_LIBS: Record<string, string> = {
  openai: 'openai',
  flowise: 'flowise-sdk',
};

const checkLibraryAvailability = (): Record<string, { installed: boolean; package: string }> => {
  const status: Record<string, { installed: boolean; package: string }> = {};

  Object.entries(REQUIRED_LIBS).forEach(([provider, packageName]) => {
    try {
      require.resolve(packageName);
      status[provider] = { installed: true, package: packageName };
    } catch {
      status[provider] = { installed: false, package: packageName };
    }
  });

  return status;
};

export const getLlmDefaultStatus = (): LlmDefaultStatus => {
  const providerManager = ProviderConfigManager.getInstance();
  const providers = providerManager
    .getAllProviders('llm')
    .filter(provider => provider.enabled)
    .map(provider => {
      // Determine if this is a system default or bot-env provider
      const isBotEnv = provider.id.startsWith('bot-');
      // Check if provider has an API key configured
      const config = provider.config || {};
      const hasApiKey = !!(config.apiKey || config.api_key || config.token);
      return {
        id: provider.id,
        name: provider.name,
        type: provider.type,
        source: isBotEnv ? 'bot-env' as const : 'system' as const,
        hasApiKey,
      };
    });

  return {
    configured: providers.length > 0,
    providers,
    libraryStatus: checkLibraryAvailability(),
  };
};
