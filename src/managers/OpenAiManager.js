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
      // Initialize messages array with the system message if it exists
      let messages = systemMessageContent ? [{
          role: 'system',
          content: systemMessageContent
      }] : [];
  
      // Filter out the system message if it's already added
      let userAndAssistantMessages = historyMessages.filter(message => message.role !== 'system');
  
      // Detect the first user message to ensure assistant messages before it are not included
      const firstUserMessageIndex = userAndAssistantMessages.findIndex(message => message.role === 'user');
  
      if (firstUserMessageIndex !== -1) {
          // Include only messages from the first user message onwards
          userAndAssistantMessages = userAndAssistantMessages.slice(firstUserMessageIndex);
      }
  
      // Reverse the order of user and assistant messages
      const reversedMessages = userAndAssistantMessages.reverse().map(message => ({
          role: message.isFromBot() ? 'assistant' : 'user', // Adjust according to your method to check if the message is from a bot
          content: message.getText() // Adjust according to your method to get the text of the message
      }));
  
      // Append the reversed messages to the system message if it exists
      messages = [...messages, ...reversedMessages];
  
      return {
          model: constants.LLM_MODEL,
          messages,
          temperature: constants.LLM_TEMPERATURE,
          max_tokens: constants.LLM_MAX_TOKENS,
          top_p: constants.LLM_TOP_P,
          frequency_penalty: constants.LLM_FREQUENCY_PENALTY,
          presence_penalty: constants.LLM_PRESENCE_PENALTY,
      };
  }
  
    requiresHistory() {
        return true;
    }
}

module.exports = OpenAiManager;
