import { Client, TextChannel } from 'discord.js';
import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import constants from '@config/ConfigurationManager';
import { fetchChannel } from './fetchChannel';
import DiscordMessage from '../DiscordMessage';
import { fetchMessages } from '../fetchers/fetchMessages';

const debug = Debug('app:discord:setMessageHandler');

/**
 * Sets up Message and typing event handlers for the Discord client.
 * @param {Client} client - The Discord client instance.
 * @param {(message: IMessage, history: IMessage[]) => Promise<void>} handler - Function to handle incoming messages.
 * @param {Map<string, number>} typingTimestamps - Map to store typing timestamps.
 * @param {(channel: string) => Promise<IMessage[]>} fetchMessages - Function to fetch messages.
 */
export function setMessageHandler(
  client: Client,
  handler: (message: IMessage, history: IMessage[]) => Promise<void>,
  typingTimestamps: Map<string, number>,
  fetchMessages: (channel: string) => Promise<IMessage[]>
): void {
  client.on('typingStart', (typing) => {
    typingTimestamps.set(typing.channel.id, Date.now());
  });

  client.on('messageCreate', async (discordMessage) => {
    try {
      debug('[DiscordManager] Received Message object: ' + JSON.stringify(discordMessage));

      if (!client) {
        debug('[DiscordManager] Discord client is not initialized.');
        return;
      }

      if (!discordMessage.id || !discordMessage.content) {
        debug('[DiscordManager] Invalid or incomplete Message received: ID: ' + discordMessage.id + ', Content: ' + discordMessage.content);
        return;
      }

      if (discordMessage.author.id === constants.CLIENT_ID) {
        debug('[DiscordManager] Skipping response to own Message ID: ' + discordMessage.id);
        return;
      }

      debug('[DiscordManager] Processed Message ID: ' + discordMessage.id);

      const channel = await fetchChannel(client, discordMessage.channelId);
      if (!channel) {
        debug('[DiscordManager] Could not fetch channel with ID: ' + discordMessage.channelId);
        return;
      }

      debug('[DiscordManager] Fetched channel: ' + channel);

      if ((channel as TextChannel).topic) {
        const historyMessages = await fetchMessages(channel.id);

        if (historyMessages) {
          debug('Channel topic: ' + ((channel as TextChannel).topic || 'No topic') + '. History messages count: ' + historyMessages.length);
        }

        debug('Executing Message handler on channel ' + channel.id);
        // Ensure DiscordMessage is properly instantiated before passing to handler
        const discordMessageWrapped: IMessage = new DiscordMessage(discordMessage);
        await handler(discordMessageWrapped, historyMessages);
      } else {
        debug('[DiscordManager] Channel ID: ' + channel.id + ' does not support topics.');
      }
    } catch (error: any) {
      debug('[DiscordManager] Error processing Message: ' + (error instanceof Error ? error.message : String(error)), { error });
    }
  });
}
