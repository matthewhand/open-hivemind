import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { getEmoji } from '@src/utils/getEmoji';
import ConfigurationManager from '@src/common/config/ConfigurationManager';
import { ChatCompletionCreateParamsNonStreaming } from 'openai/resources';

// Initialize the debug logger for this file with a specific namespace.
const debug = Debug('app:buildChatCompletionRequestBody');

/**
 * Validates that the input messages array is indeed an array.
 * This prevents errors later in the function when processing the messages.
 * @param historyMessages - The array of messages to validate.
 * @throws Will throw an error if historyMessages is not an array.
 */
function validateMessages(historyMessages: IMessage[]): void {
    if (!Array.isArray(historyMessages)) {
        // Log an error if the validation fails.
        debug('Invalid input: historyMessages must be an array');
        throw new Error('Invalid input: historyMessages must be an array');
    }
}

/**
 * Initializes the messages array with a system message.
 * This message sets the context for the conversation in the OpenAI API.
 * @param systemMessageContent - The content of the system message to be included first in the array.
 * @returns An array starting with the system message object.
 */
function initializeMessages(systemMessageContent: string): Array<{ role: string; content: string, name?: string }> {
    return [{ role: 'system', content: systemMessageContent }];
}

/**
 * Processes the array of history messages to build the messages array for the OpenAI API.
 * Each message is examined to determine its role (user or assistant) and is added to the messages array.
 * Consecutive messages from the same role are concatenated.
 * @param historyMessages - The array of historical messages to process.
 * @param messages - The array that will be sent to the OpenAI API, built up with processed messages.
 * @param supportNameField - A boolean indicating whether to include the author's name in the message objects.
 */
function processHistoryMessages(historyMessages: IMessage[], messages: Array<{ role: string; content: string, name?: string }>, supportNameField: boolean): void {
    historyMessages.forEach((message) => {
        const currentRole = message.isFromBot() ? 'assistant' : 'user'; // Determine whether the message is from the bot or the user.
        const name = supportNameField ? message.getAuthorName() : undefined; // Optionally include the author's name if the configuration allows.

        // If the current message role differs from the last message, push a new message object.
        // Otherwise, append the text to the last message's content.
        if (messages[messages.length - 1].role !== currentRole) {
            messages.push({ role: currentRole, content: message.getText(), name });
        } else {
            messages[messages.length - 1].content += ' ' + message.getText();
        }
    });
}

/**
 * Adds a fallback message from the user if the last message in the array is not from a user.
 * This is to ensure the conversation always ends with a user input before querying the AI.
 * @param messages - The array of messages that will be sent to the OpenAI API.
 */
function appendFallbackUserMessage(messages: Array<{ role: string; content: string, name?: string }>): void {
    // Check if the last message is from the user, and if not, append a default user message with an emoji.
    if (messages[messages.length - 1].role !== 'user') {
        messages.push({ role: 'user', content: getEmoji() });
    }
}

/**
 * Constructs the final request body to be sent to the OpenAI API.
 * This includes the model to use, the array of messages, and other parameters like max tokens and temperature.
 * @param messages - The array of messages to send to the API.
 * @param maxTokens - The maximum number of tokens to generate in the response.
 * @returns The structured request body ready to be sent to the OpenAI API.
 */
function createRequestBody(messages: Array<{ role: string; content: string, name?: string }>, maxTokens: number): ChatCompletionCreateParamsNonStreaming {
    // Assemble the request body using the configuration settings and the processed messages.
    const requestBody: ChatCompletionCreateParamsNonStreaming = {
        model: ConfigurationManager.LLM_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: ConfigurationManager.LLM_TEMPERATURE,
    };
    // Optionally include stop sequences if they are configured in the system settings.
    const llmStop = ConfigurationManager.LLM_STOP.length > 0 ? ConfigurationManager.LLM_STOP : null;
    if (llmStop) {
        requestBody.stop = llmStop;
    }
    return requestBody;
}

/**
 * Main function to build the chat completion request body.
 * This function orchestrates the validation, processing, and final assembly of the request body.
 * @param historyMessages - The array of messages to use as input, representing the conversation history.
 * @param systemMessageContent - The content for the initial system message, providing context for the AI.
 * @param maxTokens - The maximum number of tokens to allow in the AI's response.
 * @returns The request body object ready to be sent to the OpenAI API.
 */
export function buildChatCompletionRequestBody(
    historyMessages: IMessage[] = [],
    systemMessageContent: string = ConfigurationManager.LLM_SYSTEM_PROMPT,
    maxTokens: number = ConfigurationManager.LLM_RESPONSE_MAX_TOKENS
): ChatCompletionCreateParamsNonStreaming {
    // Step 1: Validate that the input messages array is an array.
    validateMessages(historyMessages);

    // Step 2: Initialize the messages array with a system message to set the context.
    const messages = initializeMessages(systemMessageContent);

    // Step 3: Determine whether to support the name field in the messages, based on configuration.
    const supportNameField = ConfigurationManager.getConfig('LLM_SUPPORT_NAME_FIELD', true);

    // Step 4: Process the history messages to build up the array of messages for the API call.
    processHistoryMessages(historyMessages, messages, supportNameField);

    // Step 5: Append a fallback user message if necessary, ensuring the last message is user input.
    appendFallbackUserMessage(messages);

    // Step 6: Create the final request body, including all necessary parameters for the API.
    const requestBody = createRequestBody(messages, maxTokens);

    // Step 7: Log the built request body for debugging purposes.
    debug('Built request body: ', requestBody);

    // Step 8: Return the completed request body, ready to be sent to the OpenAI API.
    return requestBody;
}
