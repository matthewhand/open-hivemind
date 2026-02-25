import { providerRegistry } from './registries/ProviderRegistry';
import { SlackProvider } from './providers/SlackProvider';
import { DiscordProvider } from './providers/DiscordProvider';
import { MattermostProvider } from './providers/MattermostProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { FlowiseProvider } from './providers/FlowiseProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { OpenWebUIProvider } from './providers/OpenWebUIProvider';
import { SwarmInstaller } from './integrations/openswarm/SwarmInstaller';

export async function initProviders() {
  // Message Providers
  providerRegistry.registerProvider(new SlackProvider());
  providerRegistry.registerProvider(new DiscordProvider());
  providerRegistry.registerProvider(new MattermostProvider());

  // LLM Providers
  providerRegistry.registerProvider(new OpenAIProvider());
  providerRegistry.registerProvider(new FlowiseProvider());
  providerRegistry.registerProvider(new OllamaProvider());
  providerRegistry.registerProvider(new OpenWebUIProvider());

  // Installers
  providerRegistry.registerInstaller(new SwarmInstaller());

  // Reload message providers to ensure bots are loaded from config
  const messageProviders = providerRegistry.getMessageProviders();
  for (const provider of messageProviders) {
    if (provider.reload) {
      try {
        await provider.reload();
      } catch (e) {
        console.error(`Failed to reload provider ${provider.id}:`, e);
      }
    }
  }

  // Use debug or console
  const debug = require('debug')('app:initProviders');
  debug('Providers initialized and registered.');
}
