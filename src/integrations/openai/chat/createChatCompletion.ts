import Debug from 'debug';
import { IMessage } from '@src/message/interfaces/IMessage';
import { getEmoji } from '@src/common/getEmoji';
import ConfigurationManager from "@src/config/ConfigurationManager";

// Custom type definitions
interface ChatCompletionMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
    name?: string;
}

interface ChatCompletionCreateParams {
    model: string;
    messages: ChatCompletionMessage[];
    max_tokens: number;
    temperature?: number;
    stop?: string[];
}

const debug = Debug('app:createChatCompletion');
const configManager = ConfigurationManager.getInstance();

/**
 * Validates that the input is an array of IMessage objects.
 * This prevents errors during the processing of history messages.
 * 
 * @param historyMessages - The array of IMessage objects to validate.
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
 * This message provides initial context to the AI for the conversation.
 * 
 * @param systemMessageContent - The content of the system message to be included at the start.
 * @returns An array starting with the system message.
 */
function initializeMessages(systemMessageContent: string): ChatCompletionMessage[] {
    return [{ role: 'system', content: systemMessageContent }];
}

/**
 * Processes an array of history messages into the format expected by the OpenAI API.
 * Messages are processed and grouped by role, and consecutive messages from the same role are concatenated.
 * 
 * @param historyMessages - The array of historical IMessage objects to process.
 * @param messages - The array being constructed for the OpenAI API request.
 * @param supportNameField - Whether to include the author's name in the message object.
 */
function processHistoryMessages(historyMessages: IMessage[], messages: ChatCompletionMessage[], supportNameField: boolean): void {
    historyMessages.forEach((message, index) => {
        debug(`Processing message ${index + 1}/${historyMessages.length} with ID: ${message.getMessageId()}`);

        const role: ChatCompletionMessage['role'] = message.isFromBot()
            ? 'assistant'
            : 'user';

        let newMessage: ChatCompletionMessage = {
            role,
            content: message.getText()
        };

        if (supportNameField && message.getAuthorName) {
            newMessage.name = message.getAuthorName();
        }

        debug(`Constructed message: ${JSON.stringify(newMessage)}`);

        // Check if the last message in the array has the same role, then concatenate content
        if (messages.length === 0 || messages[messages.length - 1].role !== role) {
            messages.push(newMessage);
        } else {
            messages[messages.length - 1].content += ' ' + newMessage.content;
        }

        debug(`Updated messages array: ${JSON.stringify(messages)}`);
    });
}

/**
 * Appends a fallback user message if the last message in the array is not from a user.
 * This ensures the conversation context ends with a user input before querying the AI.
 * 
 * @param messages - The array of messages that will be sent to the OpenAI API.
 */
function appendFallbackUserMessage(messages: ChatCompletionMessage[]): void {
    if (messages.length === 0 || messages[messages.length - 1].role !== 'user') {
        messages.push({ role: 'user', content: getEmoji() });
        debug('Appended fallback user message with emoji.');
    }
}

/**
 * Constructs the request body to be sent to the OpenAI API for chat completion.
 * 
 * @param messages - The array of messages representing the conversation history.
 * @param maxTokens - The maximum number of tokens allowed in the AI's response.
 * @returns The structured request body ready to be sent to the OpenAI API.
 */
function createRequestBody(messages: ChatCompletionMessage[], maxTokens: number): ChatCompletionCreateParams {
    const requestBody: ChatCompletionCreateParams = {
        model: configManager.OPENAI_MODEL,
        messages,
        max_tokens: maxTokens,
        temperature: configManager.OPENAI_TEMPERATURE
    };

    const llmStop = configManager.LLM_STOP.length > 0 ? configManager.LLM_STOP : undefined;
    if (llmStop !== undefined) {
        requestBody.stop = llmStop;
    }

    debug('Created request body for OpenAI API.');
    return requestBody;
}

/**
 * Main function to build the chat completion request body for the OpenAI API.
 * It orchestrates validation, processing, and final assembly of the request body.
 * 
 * @param historyMessages - The array of IMessage objects representing the conversation history.
 * @param systemMessageContent - The content of the system message to initialize the conversation context.
 * @param maxTokens - The maximum number of tokens to generate in the AI's response.
 * @returns The structured request body ready to be sent to the OpenAI API.
 */
export function createChatCompletion(
    historyMessages: IMessage[] = [],
    systemMessageContent: string = configManager.getConfig("llm").LLM_SYSTEM_PROMPT,
    maxTokens: number = configManager.getConfig("llm").LLM_RESPONSE_MAX_TOKENS
): ChatCompletionCreateParams {
    validateMessages(historyMessages);

    const messages: ChatCompletionMessage[] = initializeMessages(systemMessageContent);
    const supportNameField = configManager.getConfig("llm").LLM_INCLUDE_USERNAME_IN_CHAT_COMPLETION;

    processHistoryMessages(historyMessages, messages, supportNameField);
    appendFallbackUserMessage(messages);

    const requestBody = createRequestBody(messages, maxTokens);
    debug('Built request body:', JSON.stringify(requestBody));
    return requestBody;
}
