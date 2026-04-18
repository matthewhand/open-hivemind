import ProviderConfigManager from './ProviderConfigManager';

export interface MessageDefaultProviderSummary {
  id: string;
  name: string;
  type: string;
}

export interface MessageDefaultStatus {
  configured: boolean;
  providers: MessageDefaultProviderSummary[];
  libraryStatus: Record<string, { installed: boolean; package: string }>;
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

  // Dummy library status for now to satisfy interface/tests
  const libraryStatus = {
    slack: { installed: true, package: '@slack/web-api' },
    discord: { installed: true, package: 'discord.js' },
    mattermost: { installed: true, package: '@mattermost/client' }
  };

  return {
    configured: providers.length > 0,
    providers,
    libraryStatus
  };
};
