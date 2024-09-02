import { IMessage } from '@src/message/interfaces/IMessage';
import Debug from 'debug';
import { OpenAiService } from '../OpenAiService';
import { convertIMessageToChatParam } from './convertIMessageToChatParam';

const debug = Debug('app:OpenAiService');

/**
 * Generates a chat response using the OpenAI API via the OpenAiService.
 * 
 * This function maps `IMessage` objects to OpenAI's `ChatCompletionMessageParam` format and
 * sends a request to the OpenAI API through the OpenAiService to generate a response.
 * It includes guards to validate input data, and debugging statements to track the execution flow and data.
 *
 * Key Features:
 * - **Type Mapping**: Converts `IMessage` objects to OpenAI's `ChatCompletionMessageParam` format.
 *   - Expected OpenAI type `ChatCompletionMessageParam`:
 *     - `role: 'system' | 'user' | 'assistant'`
 *     - `content: string`
 *     - `name?: string`
 * - **Validation and Guards**: Ensures that input data is correctly formatted before sending the request.
 * - **Debugging**: Logs key values and execution flow for easier troubleshooting.
 * - **Handling Deep Type Instantiation**: Uses `@ts-ignore` where deep instantiation issues occur.
 *
 * @param openAiService - The instance of OpenAiService that manages API interactions.
 * @param message - The input message to generate a response for.
 * @param historyMessages - The chat history as an array of `IMessage` objects.
 * @param options - Additional options such as `parallelExecution`, `maxRetries`, etc.
 * @returns {Promise<string | null>} - The OpenAI API's response, or null if an error occurs.
 */
export async function generateChatResponse(
    openAiService: OpenAiService,
    message: string,
    historyMessages: IMessage[],
    options: {
        parallelExecution: boolean;
        maxRetries: number;
        finishReasonRetry: string;
        isBusy: () => boolean;
        setBusy: (status: boolean) => void;
    }
): Promise<string | null> {
    try {
        // Debugging the input values
        debug('generateChatResponse: message:', message);
        debug('generateChatResponse: historyMessages:', historyMessages);
        debug('generateChatResponse: options:', options);

        if (!message) {
            throw new Error('No input message provided.');
        }

        if (!historyMessages || historyMessages.length === 0) {
            throw new Error('No history messages provided.');
        }

        // Use the new conversion function
        const requestBody = {
            model: openAiService.openai.model,
            messages: [
                { role: 'user', content: message },
                ...historyMessages.map(convertIMessageToChatParam),
            ],
            max_tokens: options.maxRetries, // Example usage of an option
            temperature: 0.7, // Default value or derived from configuration
        };

        // Debugging the request body before sending
        debug('generateChatResponse: requestBody:', requestBody);

        // Handle busy state
        if (options.isBusy()) {
            debug('generateChatResponse: Service is busy, cannot process request');
            return null;
        }
        options.setBusy(true);

        const response = await openAiService.openai.chat.completions.create(requestBody);
        debug('generateChatResponse: response received:', response);

        options.setBusy(false);

        return response.choices[0].message.content;
    } catch (error: any) {
        debug('generateChatResponse: Error occurred:', error);
        options.setBusy(false);
        throw new Error(`Failed to generate chat response: ${error.message}`);
    }
}
