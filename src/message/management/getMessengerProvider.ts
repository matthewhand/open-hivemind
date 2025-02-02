import { IMessengerService } from '@message/interfaces/IMessengerService';
import messageConfig from '@message/interfaces/messageConfig';
import { DiscordService } from '@integrations/discord/DiscordService';
import { SlackService } from '@integrations/slack/SlackService'; // Assuming this exists
import debug from 'debug';

const log = debug('app:getMessengerProvider');

export function getMessengerProvider(): IMessengerService {
  const provider = messageConfig.get('MESSAGE_PROVIDER');
  log(`Selecting Messenger Provider: ${provider}`);

  switch (provider) {
    case 'discord':
      return DiscordService.getInstance();
    case 'slack':
      return SlackService.getInstance();
    default:
      throw new Error(`Unknown MESSAGE_PROVIDER: ${provider}`);
  }
}
