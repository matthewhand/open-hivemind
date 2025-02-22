import Debug from 'debug';
import messageConfig from '@message/interfaces/messageConfig';
import { IMessageProvider } from '@message/interfaces/IMessageProvider';
import { DiscordMessageProvider } from '@integrations/discord/providers/DiscordMessageProvider'; // Updated path
import { SlackMessageProvider } from '@integrations/slack/providers/SlackMessageProvider'; // Updated path

const debug = Debug('app:getMessageProvider');

export function getMessageProvider(): IMessageProvider {
  const providerName = messageConfig.get('MESSAGE_PROVIDER') || 'discord'; // Default from config/default.json
  debug(`Selecting message provider: ${providerName}`);

  switch (providerName.toLowerCase()) {
    case 'discord':
      debug('Returning DiscordMessageProvider');
      return new DiscordMessageProvider();
    case 'slack':
      debug('Returning SlackMessageProvider');
      return new SlackMessageProvider();
    default:
      debug(`Unknown MESSAGE_PROVIDER '${providerName}', defaulting to DiscordMessageProvider`);
      return new DiscordMessageProvider();
  }
}
