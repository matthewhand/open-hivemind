// src/handlers/messageHandler.js
const DiscordManager = require('../managers/DiscordManager');
const logger = require('../utils/logger');
const OpenAiManager = require('../managers/OpenAiManager');
const constants = require('../config/constants');

/**
 * Handles incoming messages by processing them and generating responses.
 * @param {IMessage} originalMessage - The message to handle, which must implement the IMessage interface.
 */
async function messageHandler(originalMessage) {
  // Validate the message against the IMessage interface.
  if (!originalMessage.getText || !originalMessage.getChannelId || !originalMessage.getAuthorId) {
    logger.error("Provided message does not conform to IMessage interface.");
    return;
  }

  const messageText = originalMessage.getText();
  if (!messageText.trim()) {
    logger.debug("Ignoring blank or whitespace-only messages.");
    return;
  }

  // Avoid processing messages sent by the bot itself, unless BOT_TO_BOT_MODE is enabled.
  if (originalMessage.getAuthorId() === constants.CLIENT_ID && !constants.BOT_TO_BOT_MODE) {
    logger.debug("Skipping bot's own messages.");
    return;
  }

  const lmManager = new OpenAiManager();
  const channelId = originalMessage.getChannelId();
  let history = [];
  if (lmManager.requiresHistory()) {
    history = await DiscordManager.getInstance().fetchMessages(channelId, 20);
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
