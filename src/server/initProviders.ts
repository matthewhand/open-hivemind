import { providerRegistry } from '../config/ProviderRegistry';
import { DiscordProvider } from '../integrations/discord/DiscordProvider';
import { SlackProvider } from '../integrations/slack/SlackProvider';
import { SwarmInstaller } from '../integrations/openswarm/SwarmInstaller';
import { toolRegistry } from '../integrations/ToolRegistry';
import { registerConfigSchema } from './routes/config';

export function registerProviders() {
  console.log('[initProviders] Registering providers...');
  try {
    const slackProvider = new SlackProvider();
    providerRegistry.register(slackProvider);
    registerConfigSchema(slackProvider.getMetadata().id, slackProvider.getMetadata().configSchema);
  } catch (error) {
    console.warn('Failed to register Slack provider:', error);
  }

  try {
    const discordProvider = new DiscordProvider();
    providerRegistry.register(discordProvider);
    registerConfigSchema(
      discordProvider.getMetadata().id,
      discordProvider.getMetadata().configSchema
    );
  } catch (error) {
    console.warn('Failed to register Discord provider:', error);
  }

  try {
    const swarmInstaller = new SwarmInstaller();
    toolRegistry.register(swarmInstaller);
  } catch (error) {
    console.warn('Failed to register SwarmInstaller:', error);
  }
}
