import Debug from 'debug';
import { Client, TextChannel } from 'discord.js';
import discordConfig from '@config/interfaces/discordConfig';
import { fetchChannel } from '@src/integrations/discord/fetchers/fetchChannel';
import DiscordMessage from '@src/integrations/discord/DiscordMessage';
import { fetchMessages } from '@src/integrations/discord/fetchers/fetchMessages';
import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:setMessageHandler');

/**
 * Set Message Handler
 *
 * This function sets up the message handler for the Discord client. It listens for incoming messages,
 * processes them based on specific criteria, and triggers appropriate responses or actions.
 *
 * Key Features:
 * - Listens to messages on the Discord client.
 * - Processes messages to determine if they should be handled by the bot.
 * - Provides logging for message handling and processing.
 *
 * @param client - The Discord client instance.
 * @param handler - The function to handle incoming messages.
 * @param typingTimestamps - Map to store typing timestamps.
 * @param fetchMessages - Function to fetch messages.
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
      debug('Received Message object: ' + JSON.stringify(discordMessage));

      if (!client) {
        debug('Discord client is not initialized.');
        return;
      }

      if (!discordMessage.id || !discordMessage.content) {
        debug('Invalid or incomplete Message received: ID: ' + discordMessage.id + '  Content: ' + discordMessage.content);
        return;
      }

      // Guard: Ensure discordConfig is not null
      if (discordConfig && discordMessage.author.id === discordConfig.get('DISCORD_CLIENT_ID')) {
        debug('Skipping response to own Message ID: ' + discordMessage.id);
        return;
      }

      debug('Processed Message ID: ' + discordMessage.id);
      const channel = await fetchChannel(client, discordMessage.channelId);

      if (!channel) {
        debug('Could not fetch channel with ID: ' + discordMessage.channelId);
        return;
      }

      debug('Fetched channel: ' + channel);
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
        debug('Channel ID: ' + channel.id + ' does not support topics.');
      }
    } catch (error: any) {
      debug('Error processing Message: ' + (error instanceof Error ? error.message : String(error)));
    }
  });
}
