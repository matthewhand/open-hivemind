import { Client, Message, TextChannel } from 'discord.js';
import logger from '@src/utils/logger';
import constants from '@config/ConfigurationManager';
import { fetchChannel } from './fetchChannel';

/**
 * Sets up Message and typing event handlers for the Discord client.
 * @param {Client} client - The Discord client instance.
 * @param {Map<string, number>} typingTimestamps - Map to store typing timestamps.
 * @param {(channelId: string) => Promise<Message[]>} fetchMessages - Function to fetch messages.
 */
export function setMessageHandler(
    client: Client,
    typingTimestamps: Map<string, number>,
    fetchMessages: (channelId: string) => Promise<Message[]>
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


            if (!Message.getMessageId() || !Message.getText()) {
                logger.error('[DiscordManager] Invalid or incomplete Message received: ID: ' + Message.getMessageId() + ', Content: ' + Message.getText());
                return;
            }

            if (Message.getAuthorId() === constants.CLIENT_ID) {
                logger.debug('[DiscordManager] Skipping response to own Message ID: ' + Message.getMessageId());
                return;
            }

            logger.debug('[DiscordManager] Processed Message ID: ' + Message.getMessageId());

            const channelId = Message.getChannelId();
            if (!channelId) {
                logger.error('[DiscordManager] Processed Message has no valid channel ID.');
                return;
            }

            const channel = await fetchChannel(client, channelId);
            if (!channel) {
                logger.error('[DiscordManager] Could not fetch channel with ID: ' + channelId);
                return;
            }

            logger.debug('[DiscordManager] Fetched channel: ' + channel.id);

            // Add a type guard to ensure channel is a TextChannel before accessing the topic property
            if ((channel as TextChannel).topic) {
                const historyMessages = await fetchMessages(channelId);

                if (historyMessages) {
                    logger.info('Channel topic: ' + ((channel as TextChannel).topic || 'No topic') + '. History messages count: ' + historyMessages.length);
                }

                if (messageHandler) {
                    logger.debug('Executing Message handler on channel ' + channel.id);
                    await messageHandler(Message, historyMessages);
                }
            } else {
                logger.debug('[DiscordManager] Channel ID: ' + channelId + ' does not support topics.');
            }
        } catch (error: any) {
            logger.error('[DiscordManager] Error processing Message: ' + (error instanceof Error ? error.Message : String(error)), { error });
        }
    });
}
