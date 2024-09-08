import { IMessage } from '@src/message/interfaces/IMessage';
import Debug from 'debug';
import { OpenAiService } from '../OpenAiService';
import { convertIMessageToChatParam } from './convertIMessageToChatParam';

const debug = Debug('app:OpenAiService');

/**
 * Attempts to fetch the first available OpenAI model.
 * @param openAiService - The OpenAiService instance to use for the request.
 * @returns {Promise<string>} - The first model's ID.
 */
async function getFirstAvailableModel(openAiService: OpenAiService): Promise<string> {
    const models = await openAiService.openai.models.list();
    const model = models.data[0]?.id;

    if (!model) {
        throw new Error('No OpenAI model available');
    }
    return model;
}

/**
 * Prepares the request body for the OpenAI API.
 * @param message - The user message.
 * @param historyMessages - History of the chat.
 * @param model - The model to use for the request.
 * @param options - Additional options such as max tokens.
 * @returns {Array<{ role: string, content: string, name?: string }>}
 */
function prepareRequestBody(
    message: string,
    historyMessages: IMessage[],
    model: string,
    options: { maxTokens: number }
): Array<{ role: string; content: string; name?: string }> {
    return [
        { role: 'user', content: message },
        ...historyMessages.map((msg) => {
            const authorId = msg.getAuthorId();
            return {
                ...convertIMessageToChatParam(msg),
                name: authorId ? authorId : '', // Ensure name is always a string, even if empty
            };
        }),
    ];
}

/**
 * Handles retries for the chat completion.
 * @param func - The function to retry.
 * @param retries - Number of retry attempts.
 * @returns {Promise<any>} - The result of the function.
 */
async function retry(func: () => Promise<any>, retries: number): Promise<any> {
    let attempts = 0;
    while (attempts < retries) {
        try {
            return await func();
        } catch (error) {
            attempts++;
            if (attempts >= retries) {
                throw error;
            }
            debug(`Retry attempt ${attempts} failed, retrying...`);
        }
    }
}

/**
 * Generates a chat response using the OpenAI API via the OpenAiService.
 *
 * This function maps `IMessage` objects to OpenAI's message format and
 * sends a request to the OpenAI API through the OpenAiService to generate a response.
 * It includes guards to validate input data, and debugging statements to track the execution flow and data.
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
        debug('generateChatResponse: message:', message);
        debug('generateChatResponse: historyMessages:', historyMessages);
        debug('generateChatResponse: options:', options);

        if (!message) {
            throw new Error('No input message provided.');
        }
        if (!historyMessages || historyMessages.length === 0) {
            throw new Error('No history messages provided.');
        }

        const model = await getFirstAvailableModel(openAiService);

        const requestBody = prepareRequestBody(message, historyMessages, model, { maxTokens: 150 });
        debug('Request Body:', requestBody);

        if (options.isBusy()) {
            debug('Service is busy, cannot process request.');
            return null;
        }
        options.setBusy(true);

        const response = await retry(() => openAiService.openai.chat.completions.create({
            model,
            messages: requestBody,
            max_tokens: 150,
            temperature: 0.7,
        }), options.maxRetries);

        options.setBusy(false);
        debug('Response:', response);

        return response.choices[0].message.content || '';
    } catch (error: any) {
        debug('Error generating chat response:', error.message);
        options.setBusy(false);
        throw new Error(`Failed to generate chat response: ${error.message}`);
    }
}
