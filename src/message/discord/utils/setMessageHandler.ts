import { Client, Message, TextChannel } from 'discord.js';
import logger from '@src/utils/logger';
import { DiscordMessage } from '../types/DiscordMessage';
import constants from '@config/ConfigurationManager';
import { fetchChannel } from './fetchChannel';

/**
 * Sets up message and typing event handlers for the Discord client.
 * @param {Client} client - The Discord client instance.
 * @param {(processedMessage: DiscordMessage, historyMessages: Message[]) => Promise<void>} messageHandler - The message handler callback function.
 * @param {Map<string, number>} typingTimestamps - Map to store typing timestamps.
 * @param {(channelId: string) => Promise<Message[]>} fetchMessages - Function to fetch messages.
 */
export function setMessageHandler(
    client: Client,
    messageHandler: (processedMessage: DiscordMessage, historyMessages: Message[]) => Promise<void>,
    typingTimestamps: Map<string, number>,
    fetchMessages: (channelId: string) => Promise<Message[]>
): void {
    client.on('typingStart', (typing) => {
        typingTimestamps.set(typing.channel.id, Date.now());
    });

    client.on('messageCreate', async (discordMessage: Message) => {
        try {
            logger.debug('[DiscordManager] Received message object: ' + JSON.stringify(discordMessage));

            if (!client) {
                logger.error('[DiscordManager] Discord client is not initialized.');
                return;
            }

            const processedMessage = new DiscordMessage(discordMessage);

            if (!processedMessage.getMessageId() || !processedMessage.getText()) {
                logger.error('[DiscordManager] Invalid or incomplete message received: ID: ' + processedMessage.getMessageId() + ', Content: ' + processedMessage.getText());
                return;
            }

            if (processedMessage.getAuthorId() === constants.CLIENT_ID) {
                logger.debug('[DiscordManager] Skipping response to own message ID: ' + processedMessage.getMessageId());
                return;
            }

            logger.debug('[DiscordManager] Processed message ID: ' + processedMessage.getMessageId());

            const channelId = processedMessage.getChannelId();
            if (!channelId) {
                logger.error('[DiscordManager] Processed message has no valid channel ID.');
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
                    logger.debug('Executing message handler on channel ' + channel.id);
                    await messageHandler(processedMessage, historyMessages);
                }
            } else {
                logger.debug('[DiscordManager] Channel ID: ' + channelId + ' does not support topics.');
            }
        } catch (error: any) {
            logger.error('[DiscordManager] Error processing message: ' + (error instanceof Error ? error.message : String(error)), { error });
        }
    });
}
