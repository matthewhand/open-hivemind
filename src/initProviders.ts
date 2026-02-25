import { providerRegistry } from './registries/ProviderRegistry';
import { SlackProvider } from './providers/SlackProvider';
import { DiscordProvider } from './providers/DiscordProvider';
import { MattermostProvider } from './providers/MattermostProvider';
import { OpenAIProvider } from './providers/OpenAIProvider';
import { FlowiseProvider } from './providers/FlowiseProvider';
import { OllamaProvider } from './providers/OllamaProvider';
import { OpenWebUIProvider } from './providers/OpenWebUIProvider';
import { SwarmInstaller } from './integrations/openswarm/SwarmInstaller';

export function initProviders() {
  // Register Message Providers
  providerRegistry.register(new SlackProvider());
  providerRegistry.register(new DiscordProvider());
  providerRegistry.register(new MattermostProvider());

  // Register LLM Providers
  providerRegistry.register(new OpenAIProvider());
  providerRegistry.register(new FlowiseProvider());
  providerRegistry.register(new OllamaProvider());
  providerRegistry.register(new OpenWebUIProvider());

  // Register Tool Installers
  providerRegistry.registerInstaller(new SwarmInstaller());
}
