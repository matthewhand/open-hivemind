// src/managers/OpenAiManager.js
const axios = require('axios');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const LlmInterface = require('../interfaces/LlmInterface');

class OpenAiManager extends LlmInterface {
  constructor() {
    super();
    logger.debug('OpenAiManager initialized');
  }

  async sendRequest(requestBody) {
    const url = constants.LLM_ENDPOINT_URL;
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${constants.LLM_API_KEY}`,
    };
    logger.debug(`Sending request to OpenAI API: ${url} with body: ${JSON.stringify(requestBody, null, 2)}`);
    try {
      const response = await axios.post(url, requestBody, { headers });
      logger.info('Response received from OpenAI API.');

      // Log the full response for debugging
      logger.debug(`OpenAI API response: ${JSON.stringify(response.data, null, 2)}`);

      return response.data;
    } catch (error) {
      const errMsg = `Failed to send request to OpenAI API: ${error.message}`;
      logger.error(errMsg, { error });
      throw new Error(errMsg);
    }
  }

  buildRequestBody(historyMessages) {
    const systemMessageContent = constants.LLM_SYSTEM_PROMPT;
    const systemMessage = systemMessageContent ? [{
      role: 'system',
      content: systemMessageContent
    }] : [];

    // Reverse the order of user and assistant messages but keep the system message at the top
    const transformedMessages = historyMessages.map(discordMessage => {
      const content = discordMessage.getText();
      const authorId = discordMessage.getAuthorId();
      const isBot = discordMessage.isFromBot();
      const role = isBot ? 'assistant' : 'user';
      return { role, content };
    }).reverse(); // Reverse the order of messages here

    const messages = [...systemMessage, ...transformedMessages];

    const requestBody = {
      model: constants.LLM_MODEL,
      messages,
      temperature: constants.LLM_TEMPERATURE,
      max_tokens: constants.LLM_MAX_TOKENS,
      top_p: constants.LLM_TOP_P,
      frequency_penalty: constants.LLM_FREQUENCY_PENALTY,
      presence_penalty: constants.LLM_PRESENCE_PENALTY,
    };

    logger.debug(`Request body for OpenAI API constructed: ${JSON.stringify(requestBody, null, 2)}`);
    return requestBody;
}

requiresHistory() {
    return true;
  }
}

module.exports = OpenAiManager;
