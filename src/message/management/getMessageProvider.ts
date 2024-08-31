import ConfigurationManager from '@config/ConfigurationManager';
import { DiscordService } from '@src/integrations/discord/DiscordService';
import Debug from 'debug';

const debug = Debug('app:getMessageProvider');

/**
 * Get Message Provider
 *
 * Determines and returns the appropriate message provider singleton based on the
 * configuration specified in the ConfigurationManager. Supports multiple message
 * providers, such as Discord.
 *
 * @returns The singleton instance of the configured message provider.
 * @throws An error if the configured message provider is unsupported.
 */
export function getMessageProvider() {
  const configManager = ConfigurationManager.getInstance(); // Instantiate ConfigurationManager
  const messageProvider = configManager.getConfig("message").MESSAGE_PROVIDER;

  debug('Configured message provider:', messageProvider);

  // Guard: Ensure the message provider is specified
  if (!messageProvider) {
    throw new Error('MESSAGE_PROVIDER is not configured.');
  }

  // Return the appropriate message provider based on configuration
  switch (messageProvider.toLowerCase()) {
    case 'discord':
      return DiscordService.getInstance();
    // Add additional cases for other providers here
    default:
      throw new Error(`Unsupported message provider: ${messageProvider}`);
  }
}
