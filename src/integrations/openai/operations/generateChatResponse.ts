import { IMessage } from '@src/message/interfaces/IMessage';
import Debug from 'debug';
import { OpenAiService } from '../OpenAiService';
import { convertIMessageToChatParam } from './convertIMessageToChatParam';
import openaiConfig from '@integrations/openai/interfaces/openaiConfig';

const debug = Debug('app:OpenAiService');

/**
 * Fetches the first available OpenAI model.
 * @param openAiService - OpenAI service instance.
 * @returns {Promise<string>} - The model's ID.
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
 * @param historyMessages - Conversation history.
 * @param model - OpenAI model to use.
 * @returns {Array<{ role: string; content: string; name?: string }>} - Request payload.
 */
function prepareRequestBody(
    message: string,
    historyMessages: IMessage[],
    model: string
): Array<{ role: string; content: string; name?: string }> {
    return [
        { role: 'user', content: message },
        ...historyMessages.map((msg) => ({
            ...convertIMessageToChatParam(msg),
            name: msg.getAuthorId() || '',
        })),
    ];
}

/**
 * Handles retries for the OpenAI API call.
 * @param func - Function to retry.
 * @param retries - Maximum retry attempts.
 * @returns {Promise<any>} - Function result.
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
 * Generates a chat response using OpenAI.
 * @param openAiService - OpenAiService instance.
 * @param message - The user message.
 * @param historyMessages - Chat history.
 * @param options - Options for retries and parallel execution.
 * @returns {Promise<string | null>} - Chat response or null.
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
        debug('message:', message);
        debug('historyMessages:', historyMessages);
        debug('options:', options);

        if (!message) {
            throw new Error('No input message provided.');
        }
        if (!historyMessages || historyMessages.length === 0) {
            throw new Error('No history messages provided.');
        }

        const model = await getFirstAvailableModel(openAiService);

        const requestBody = prepareRequestBody(message, historyMessages, model);
        debug('Request Body:', requestBody);

        if (options.isBusy()) {
            debug('Service is busy.');
            return null;
        }
        options.setBusy(true);

        // Correct type constraints for max_tokens and temperature
        const maxTokens = openaiConfig.get<number>('OPENAI_MAX_TOKENS') as number;
        const temperature = openaiConfig.get<number>('OPENAI_TEMPERATURE') as number;

        const response = await retry(() => openAiService.openai.chat.completions.create({
            model,
            messages: requestBody,
            max_tokens: maxTokens,
            temperature: temperature,
        }), options.maxRetries);

        options.setBusy(false);
        debug('Response:', response);

        if (!response || !response.choices || response.choices.length === 0) {
            throw new Error('No completion choices returned.');
        }

        return response.choices[0].message?.content || '';
    } catch (error: any) {
        debug('Error:', error.message);
        options.setBusy(false);
        throw new Error(`Failed: ${error.message}`);
    }
}
