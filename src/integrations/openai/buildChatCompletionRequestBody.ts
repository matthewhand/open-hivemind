import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { getEmoji } from '@src/utils/getEmoji';
import ConfigurationManager from '@src/common/config/ConfigurationManager';
import { ChatCompletionCreateParamsNonStreaming, ChatCompletionMessageParam, ChatCompletionUserMessageParam, ChatCompletionAssistantMessageParam, ChatCompletionSystemMessageParam } from 'openai/resources';

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
function initializeMessages(systemMessageContent: string): ChatCompletionMessageParam[] {
    return [{ role: 'system', content: systemMessageContent }];
}

/**
 * Processes the array of history messages to build the messages array for the OpenAI API.
 * Each message is examined to determine its role (user, assistant, or system) and is added to the messages array.
 * Consecutive messages from the same role are concatenated.
 * @param historyMessages - The array of historical messages to process.
 * @param messages - The array that will be sent to the OpenAI API, built up with processed messages.
 * @param supportNameField - A boolean indicating whether to include the author's name in the message objects.
 */
function processHistoryMessages(historyMessages: IMessage[], messages: ChatCompletionMessageParam[], supportNameField: boolean): void {
    historyMessages.forEach((message, index) => {
        debug(`Processing message ${index + 1}/${historyMessages.length} with ID: ${message.getMessageId()}`);
        
        let newMessage: ChatCompletionMessageParam;
        const currentRole: 'user' | 'assistant' | 'system' = message.isFromBot() ? 'assistant' : 'user';
        debug(`Message role determined as: ${currentRole}`);

        if (currentRole === 'user') {
            newMessage = { role: 'user', content: message.getText() } as ChatCompletionUserMessageParam;
            if (supportNameField) {
                (newMessage as ChatCompletionUserMessageParam).name = message.getAuthorName();
            }
        } else if (currentRole === 'assistant') {
            newMessage = { role: 'assistant', content: message.getText() } as ChatCompletionAssistantMessageParam;
            if (supportNameField) {
                (newMessage as ChatCompletionAssistantMessageParam).name = message.getAuthorName();
            }
        } else {
            newMessage = { role: 'system', content: message.getText() } as ChatCompletionSystemMessageParam;
            if (supportNameField) {
                (newMessage as ChatCompletionSystemMessageParam).name = message.getAuthorName();
            }
        }

        debug(`Constructed message: ${JSON.stringify(newMessage)}`);

        if (messages[messages.length - 1].role !== currentRole) {
            messages.push(newMessage);
            debug(`New message added to array. Total messages: ${messages.length}`);
        } else {
            if (newMessage.content) {
                messages[messages.length - 1].content += ' ' + newMessage.content;
                debug(`Appended content to previous message. Updated content: ${messages[messages.length - 1].content}`);
            }
        }
    });
}

/**
 * Adds a fallback message from the user if the last message in the array is not from a user.
 * This is to ensure the conversation always ends with a user input before querying the AI.
 * @param messages - The array of messages that will be sent to the OpenAI API.
 */
function appendFallbackUserMessage(messages: ChatCompletionMessageParam[]): void {
    if (messages[messages.length - 1].role !== 'user') {
        messages.push({ role: 'user', content: getEmoji() });
        debug('Appended fallback user message with emoji.');
    }
}

/**
 * Constructs the final request body to be sent to the OpenAI API.
 * This includes the model to use, the array of messages, and other parameters like max tokens and temperature.
 * @param messages - The array of messages to send to the API.
 * @param maxTokens - The maximum number of tokens to generate in the response.
 * @returns The structured request body ready to be sent to the OpenAI API.
 */
function createRequestBody(messages: ChatCompletionMessageParam[], maxTokens: number): ChatCompletionCreateParamsNonStreaming {
    const requestBody: ChatCompletionCreateParamsNonStreaming = {
        model: ConfigurationManager.OPENAI_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: ConfigurationManager.LLM_TEMPERATURE,
    };
    const llmStop = ConfigurationManager.LLM_STOP.length > 0 ? ConfigurationManager.LLM_STOP : null;
    if (llmStop) {
        requestBody.stop = llmStop;
    }
    debug('Created request body for OpenAI API.');
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
    validateMessages(historyMessages);
    const messages = initializeMessages(systemMessageContent);
    const supportNameField = ConfigurationManager.getConfig('LLM_SUPPORT_NAME_FIELD', true);
    processHistoryMessages(historyMessages, messages, supportNameField);
    appendFallbackUserMessage(messages);
    const requestBody = createRequestBody(messages, maxTokens);
    debug('Built request body: ', requestBody);
    return requestBody;
}
