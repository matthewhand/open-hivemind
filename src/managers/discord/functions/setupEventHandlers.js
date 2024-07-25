const logger = require('../../../utils/logger');
const DiscordMessage = require('../../../models/DiscordMessage');
const constants = require('../../../config/constants');
const discordUtils = require('../../../utils/discordUtils');

/**
 * Configures event listeners for typing events and message creation, handling them appropriately.
 * @param {Client} client - The Discord client instance.
 * @param {Function} messageHandler - The message handler callback function.
 * @param {Map} typingTimestamps - Map to store typing timestamps.
 * @param {Function} fetchMessages - Function to fetch messages.
 */
function setupEventHandlers(client, messageHandler, typingTimestamps, fetchMessages) {
    client.on('typingStart', (channel) => {
        typingTimestamps.set(channel.id, Date.now());
    });

    client.on('messageCreate', async (discordMessage) => {
        try {
            // Debug: Log the entire message object to check all properties
            logger.debug('[DiscordManager] Received message object: ' + JSON.stringify(discordMessage));

            // Ensure client is set
            if (!client) {
                logger.error('[DiscordManager] Discord client is not initialized.');
                return;
            }

            const processedMessage = new DiscordMessage(discordMessage);

            if (!processedMessage.getMessageId() || !processedMessage.getText()) {
                logger.error('[DiscordManager] Invalid or incomplete message received: ID: ' + processedMessage.getMessageId() + ', Content: ' + processedMessage.getText());
                return; // Exit if message is incomplete to prevent errors downstream
            }

            // Prevent the bot from responding to its own messages
            if (processedMessage.getAuthorId() === constants.CLIENT_ID) {
                logger.debug('[DiscordManager] Skipping response to own message ID: ' + processedMessage.getMessageId());
                return;
            }

            logger.debug('[DiscordManager] Processed message ID: ' + processedMessage.getMessageId());

            // Validate getChannelId
            const channelId = processedMessage.getChannelId();
            if (!channelId) {
                logger.error('[DiscordManager] Processed message has no valid channel ID.');
                return;
            }

            // Directly utilize fetchChannel and fetchMessages from discordUtils to get channel context
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
        } catch (error) {
            logger.error('[DiscordManager] Error processing message: ' + error.message, { error });
        }
    });
}

module.exports = setupEventHandlers;
