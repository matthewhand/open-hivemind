const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const OpenAiManager = require('../managers/OpenAiManager');
const constants = require('../config/constants');

async function messageHandler(originalMessage) {
  // Log the original message's author ID for debugging
  logger.debug(`Original message author ID: ${originalMessage.getAuthorId()}`);

  // Validate the message against the IMessage interface...
  if (!originalMessage.getText || !originalMessage.getChannelId || !originalMessage.getAuthorId) {
    logger.error("Provided message does not conform to IMessage interface.");
    return;
  }

  const messageText = originalMessage.getText();
  if (!messageText.trim()) {
    logger.debug("Ignoring blank or whitespace-only messages.");
    return;
  }

  // Always ignore the bot's own messages
  if (originalMessage.getAuthorId() === constants.CLIENT_ID) {
    logger.debug("Skipping bot's own messages.");
    return;
  }

  const lmManager = new OpenAiManager();
  const channelId = originalMessage.getChannelId();
  let history = [];
  if (lmManager.requiresHistory()) {
    history = await DiscordManager.getInstance().fetchMessages(channelId, 20);
    history.reverse(); // Reverse the order so the most recent messages are at the bottom
  }

  const requestBody = lmManager.buildRequestBody([originalMessage, ...history]);

  try {
    const responseContent = await lmManager.sendRequest(requestBody);
    await DiscordManager.getInstance().sendResponse(channelId, responseContent.choices[0].text);
    logger.info(`Response sent for message in channel ${channelId}.`);
  } catch (error) {
    logger.error(`Failed to process message: ${error}`, { errorDetail: error });
  }
}

module.exports = { messageHandler };
