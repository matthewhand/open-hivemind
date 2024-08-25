import { Client, Message, TextChannel } from 'discord.js';
import logger from '@src/utils/logger';
import constants from '@config/ConfigurationManager';
import { fetchChannel } from './fetchChannel';

/**
 * Sets up Message and typing event handlers for the Discord client.
 * @param {Client} client - The Discord client instance.
 * @param {Map<string, number>} typingTimestamps - Map to store typing timestamps.
 * @param {(channel: string) => Promise<Message[]>} fetchMessages - Function to fetch messages.
 */
export function setMessageHandler(
    client: Client,
    typingTimestamps: Map<string, number>,
    fetchMessages: (channel: string) => Promise<Message[]>
): Message {
    client.on('typingStart', (typing) => {
        typingTimestamps.set(typing.channel, Date.now());
    });

    client.on('messageCreate', async (discordMessage: Message) => {
        try {
            logger.debug('[DiscordManager] Received Message object: ' + JSON.stringify(discordMessage));

            if (!client) {
                logger.error('[DiscordManager] Discord client is not initialized.');
                return;
            }


            if (!discordMessage.id || !discordMessage.content) {
                logger.error('[DiscordManager] InvalMessage<any> or incomplete Message received: ID: ' + discordMessage.id + ', Content: ' + Message.text);
                return;
            }

            if (Message.author.id === constants.CLIENT_ID) {
                logger.debug('[DiscordManager] Skipping response to own Message ID: ' + discordMessage.id);
                return;
            }

            logger.debug('[DiscordManager] Processed Message ID: ' + discordMessage.id);

            const channel = discordMessage.channel;
            if (!channel) {
                logger.error('[DiscordManager] Processed Message has no valMessage channel ID.');
                return;
            }

            const channel = await fetchChannel(client, discordChannel);
            if (!channel) {
                logger.error('[DiscordManager] Could not fetch channel with ID: ' + channel);
                return;
            }

            logger.debug('[DiscordManager] Fetched channel: ' + channel);

            // Add a type guard to ensure channel is a TextChannel before accessing the topic property
            if ((channel as TextChannel).topic) {
                const historyMessages = await fetchMessages(channel);

                if (historyMessages) {
                    logger.info('Channel topic: ' + ((channel as TextChannel).topic || 'No topic') + '. History messages count: ' + historyMessages.length);
                }

                if (setMessageHandler) {
                    logger.debug('Executing Message handler on channel ' + channel);
                    await messageHandler(Message, historyMessages);
                }
            } else {
                logger.debug('[DiscordManager] Channel ID: ' + channel + ' does not support topics.');
            }
        } catch (error: any) {
            logger.error('[DiscordManager] Error processing Message: ' + (error instanceof Error ? error.Message : String(error)), { error });
        }
    });
}
