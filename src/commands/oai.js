const Command = require('../utils/Command');
const axios = require('axios');
const { splitMessage, startTypingIndicator } = require('../utils/common');
const getRandomErrorMessage = require('../config/errorMessages');
const logger = require('../utils/logger');
const constants = require('../config/constants');
const fetchConversationHistory = require('../utils/fetchConversationHistory');

class OaiCommand extends Command {
    constructor() {
        // Initialize the command with its name and a brief description
        super('oai', 'Interact with OpenAI models. Usage: !oai:[model] [query]');
    }

    // The execute method contains the main logic for handling the command
    async execute(message, args) {
        try {
            // Split the args to extract the model and user's message
            const model = args.split(' ')[0] || 'gpt-3.5-turbo'; // Default to 'gpt-3.5-turbo' if no model is specified
            const userMessage = args.split(' ').slice(1).join(' ');

            // Fetch previous messages from the channel to provide context to the model
            const historyMessages = await fetchConversationHistory(message.channel);

            // Build the request body for the OpenAI API call
            const requestBody = this.buildOaiRequestBody(historyMessages, userMessage, model);

            // Validate the constructed request body
            if (!this.validateRequestBody(requestBody)) {
                throw new Error('Invalid request body');
            }

            // Show typing indicator in Discord to indicate the bot is processing
            const typingInterval = startTypingIndicator(message.channel);

            // Make the API call to OpenAI
            const response = await axios.post(constants.LLM_ENDPOINT_URL, requestBody, {
                headers: { 'Content-Type': 'application/json', ...(constants.API_KEY && { 'Authorization': `Bearer ${constants.API_KEY}` }) }
            });

            // Stop the typing indicator once the response is received
            clearInterval(typingInterval);

            // Process the response to extract and format the content
            const replyContent = this.processResponse(response.data);

            // Send the response back to the user in the Discord channel
            if (replyContent) {
                const messagesToSend = splitMessage(replyContent, 2000);
                for (const msg of messagesToSend) await message.reply(msg);
            }
        } catch (error) {
            // Log the error and notify the user in case of any failure
            logger.error(`Error in OaiCommand execute: ${error.message}`, error);
            await message.reply(getRandomErrorMessage());
        }
    }
    // Builds the request body for the OpenAI API call
    buildOaiRequestBody(historyMessages, userMessage, model) {
        let requestBody = {
            model: model,
            messages: [{ role: 'system', content: constants.SYSTEM_PROMPT }]
        };

        // Calculate the current size of the request body to manage message length limits
        let currentSize = JSON.stringify(requestBody).length;

        // Reverse the history messages to maintain chronological order in the requestBody
        historyMessages.slice().reverse().forEach(msg => {
            const formattedMessage = `<@${msg.userId}>: ${msg.content}`;
            const messageObj = { role: 'user', content: formattedMessage };
            currentSize += JSON.stringify(messageObj).length;

            // Check if adding this message exceeds the content length limit
            if (currentSize <= constants.MAX_CONTENT_LENGTH) {
                requestBody.messages.push(messageObj);
            }
        });

        // Add the user's current message to the requestBody
        requestBody.messages.push({ role: 'user', content: userMessage });
        return requestBody;
    }

    // Validates the requestBody to ensure it meets the API's requirements
    validateRequestBody(requestBody) {
        // Ensure requestBody has the messages array and it's not empty
        if (!requestBody || !Array.isArray(requestBody.messages) || requestBody.messages.length === 0) {
            logger.debug("Validation failed for requestBody:", JSON.stringify(requestBody));
            return false;
        }
        logger.debug("Validation passed for requestBody.");
        return true;
    }

    // Processes the API response to extract and format the reply content
    processResponse(data) {
        if (data && data.choices && data.choices.length > 0) {
            let content = data.choices[0].message.content.trim();
            const pattern = /^<@\w+>: /;

            // Remove the user role prefix if present
            if (pattern.test(content)) {
                content = content.replace(pattern, '');
            }
            return content;
        }
        return 'No response from the server.';
    }
}



module.exports = new OaiCommand();
