import { IMessage } from '@src/message/interfaces/IMessage';
import { OpenAI } from 'openai';
import Debug from 'debug';
import ConfigurationManager from '@config/ConfigurationManager';
import { convertIMessageToChatParam } from './convertIMessageToChatParam';

const configManager = ConfigurationManager.getInstance();
const llmConfig = configManager.getConfig('llm');
const debug = Debug('app:OpenAiService');

if (!llmConfig) {
    throw new Error('LLM configuration not found. Please ensure the LLM config is loaded.');
}

/**
 * Creates a chat completion request payload for OpenAI's API.
 * 
 * This function maps the application's `IMessage` interface to the format expected by OpenAI's SDK.
 * It constructs the necessary request body, ensuring that all required fields are correctly mapped.
 * Debugging statements and guards are added to validate the inputs and track the execution flow.
 *
 * Key Features:
 * - **Type Mapping**: Converts `IMessage` objects to OpenAI's `ChatCompletionMessageParam` format.
 *   - Expected OpenAI type `ChatCompletionMessageParam`:
 *     - `role: 'system' | 'user' | 'assistant'`
 *     - `content: string`
 *     - `name?: string`
 * - **Validation and Guards**: Ensures that the input data is complete and correctly formatted.
 * - **Debugging**: Logs key values and the execution flow for easier debugging.
 *
 * @param openai - The OpenAI API client instance.
 * @param historyMessages - The chat history as an array of `IMessage` objects.
 * @param systemMessageContent - The content for the system message.
 * @param maxTokens - The maximum number of tokens for the completion.
 * @returns A payload to send to OpenAI's create chat completion API.
 */
export async function createChatCompletion(
    openai: OpenAI,
    historyMessages: IMessage[],
    systemMessageContent: string = llmConfig?.get('LLM_SYSTEM_PROMPT') || '',
    maxTokens: number = parseInt(llmConfig?.get<string>('LLM_RESPONSE_MAX_TOKENS') || '150')
): Promise<OpenAI.Chat.ChatCompletion> {
    try {
        // Debugging the input values
        debug('createChatCompletion: historyMessages:', historyMessages);
        debug('createChatCompletion: systemMessageContent:', systemMessageContent);
        debug('createChatCompletion: maxTokens:', maxTokens);

        if (!historyMessages || historyMessages.length === 0) {
            throw new Error('No history messages provided.');
        }

        // Retrieve the model ID
        const model = await openai.models.list().then(models => models[0]?.id);

        if (!model) {
            throw new Error('No model available');
        }

        // Constructing the request body
        const requestBody = {
            model,
            messages: [
                { role: 'system', content: systemMessageContent },
                ...historyMessages.map(convertIMessageToChatParam),
            ],
            max_tokens: maxTokens,
            temperature: llmConfig?.get('LLM_TEMPERATURE') || 0.7,
            frequency_penalty: llmConfig?.get('LLM_FREQUENCY_PENALTY') || 0,
            presence_penalty: llmConfig?.get('LLM_PRESENCE_PENALTY') || 0,
            stop: llmConfig?.get('LLM_STOP') || undefined,
            top_p: llmConfig?.get('LLM_TOP_P') || 1,
            stream: false,
        };

        // Debugging the request body before sending
        debug('createChatCompletion: requestBody:', requestBody);

        const response = await openai.chat.completions.create(requestBody);
        debug('createChatCompletion: response received:', response);

        return response as unknown as OpenAI.Chat.ChatCompletion;
    } catch (error: any) {
        debug('createChatCompletion: Error occurred:', error);
        throw new Error(`Failed to create chat completion: ${error.message}`);
    }
}
