import { Client, Message } from 'discord.js';
import logger from '@src/utils/logger';
import { DiscordMessageModel } from '../types/DiscordMessage';
import constants from '../../config/configurationManager';
import * as discordUtils from '../../utils/discordUtils';

/**
 * Configures event listeners for typing events and message creation, handling them appropriately.
 * @param {Client} client - The Discord client instance.
 * @param {(processedMessage: DiscordMessageModel, historyMessages: Message[]) => Promise<void>} messageHandler - The message handler callback function.
 * @param {Map<string, number>} typingTimestamps - Map to store typing timestamps.
 * @param {(channelId: string) => Promise<Message[]>} fetchMessages - Function to fetch messages.
 */
export function setupEventHandlers(
    client: Client,
    messageHandler: (processedMessage: DiscordMessageModel, historyMessages: Message[]) => Promise<void>,
    typingTimestamps: Map<string, number>,
    fetchMessages: (channelId: string) => Promise<Message[]>
): void {
    client.on('typingStart', (channel) => {
        typingTimestamps.set(channel.id, Date.now());
    });

    client.on('messageCreate', async (discordMessage: Message) => {
        try {
            logger.debug('[DiscordManager] Received message object: ' + JSON.stringify(discordMessage));

            if (!client) {
                logger.error('[DiscordManager] Discord client is not initialized.');
                return;
            }

            const processedMessage = new DiscordMessageModel(discordMessage);

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

            const channel = await discordUtils.fetchChannel(client, channelId);
            if (!channel) {
                logger.error('[DiscordManager] Could not fetch channel with ID: ' + channelId);
                return;
            }

            logger.debug('[DiscordManager] Fetched channel: ' + channel.id);
            const historyMessages = await fetchMessages(channelId);

            if (historyMessages) {
                logger.info('Channel topic: ' + (channel.topic || 'No topic') + '. History messages count: ' + historyMessages.length);
            }

            if (messageHandler) {
                logger.debug('Executing message handler on channel ' + channel.id);
                await messageHandler(processedMessage, historyMessages);
            }
        } catch (error: any) {
            logger.error('[DiscordManager] Error processing message: ' + (error instanceof Error ? error.message : String(error)), { error });
        }
    });
}
