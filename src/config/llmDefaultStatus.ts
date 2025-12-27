import ProviderConfigManager from './ProviderConfigManager';

export interface LlmDefaultProviderSummary {
  id: string;
  name: string;
  type: string;
}

export interface LlmDefaultStatus {
  configured: boolean;
  providers: LlmDefaultProviderSummary[];
  libraryStatus: Record<string, { installed: boolean; package: string }>;
}

const REQUIRED_LIBS: Record<string, string> = {
  openai: 'openai',
  anthropic: '@anthropic-ai/sdk',
  flowise: 'flowise-sdk',
  google: '@google/generative-ai',
  mistral: '@mistralai/mistralai',
  cohere: 'cohere-ai',
  // Local providers don't always need libs but good to track
  ollama: 'ollama',
};

const checkLibraryAvailability = (): Record<string, { installed: boolean; package: string }> => {
  const status: Record<string, { installed: boolean; package: string }> = {};

  Object.entries(REQUIRED_LIBS).forEach(([provider, packageName]) => {
    try {
      require.resolve(packageName);
      status[provider] = { installed: true, package: packageName };
    } catch (e) {
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
    .map(provider => ({
      id: provider.id,
      name: provider.name,
      type: provider.type,
    }));

  return {
    configured: providers.length > 0,
    providers,
    libraryStatus: checkLibraryAvailability(),
  };
};
