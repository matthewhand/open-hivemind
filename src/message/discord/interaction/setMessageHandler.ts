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
    handler: (message: Message, history: Message[]) => Promise<void>,
    typingTimestamps: Map<string, number>,
    fetchMessages: (channel: string) => Promise<Message[]>
): void {
    client.on('typingStart', (typing) => {
        typingTimestamps.set(typing.channel.id, Date.now());
    });

    client.on('messageCreate', async (discordMessage: Message) => {
        try {
            logger.debug('[DiscordManager] Received Message object: ' + JSON.stringify(discordMessage));

            if (!client) {
                logger.error('[DiscordManager] Discord client is not initialized.');
                return;
            }

            if (!discordMessage.id || !discordMessage.content) {
                logger.error('[DiscordManager] Invalid or incomplete Message received: ID: ' + discordMessage.id + ', Content: ' + discordMessage.content);
                return;
            }

            if (discordMessage.author.id === constants.CLIENT_ID) {
                logger.debug('[DiscordManager] Skipping response to own Message ID: ' + discordMessage.id);
                return;
            }

            logger.debug('[DiscordManager] Processed Message ID: ' + discordMessage.id);

            const channel = await fetchChannel(client, discordMessage.channelId);
            if (!channel) {
                logger.error('[DiscordManager] Could not fetch channel with ID: ' + discordMessage.channelId);
                return;
            }

            logger.debug('[DiscordManager] Fetched channel: ' + channel);

            if ((channel as TextChannel).topic) {
                const historyMessages = await fetchMessages(channel.id);

                if (historyMessages) {
                    logger.info('Channel topic: ' + ((channel as TextChannel).topic || 'No topic') + '. History messages count: ' + historyMessages.length);
                }

                logger.debug('Executing Message handler on channel ' + channel.id);
                await handler(discordMessage, historyMessages);
            } else {
                logger.debug('[DiscordManager] Channel ID: ' + channel.id + ' does not support topics.');
            }
        } catch (error: any) {
            logger.error('[DiscordManager] Error processing Message: ' + (error instanceof Error ? error.message : String(error)), { error });
        }
    });
}
