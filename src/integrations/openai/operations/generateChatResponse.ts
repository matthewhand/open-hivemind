import { IMessage } from '@src/message/interfaces/IMessage';
import Debug from 'debug';
import { OpenAiService } from '../OpenAiService';
import { convertIMessageToChatParam } from './convertIMessageToChatParam';
import openaiConfig from '@integrations/openai/interfaces/openaiConfig';

const debug = Debug('app:OpenAiService');

/**
 * Fetch the first available OpenAI model.
 * @param openAiService - Instance for the request.
 * @returns {Promise<string>} - Model's ID.
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
 * Prepare the request body for the OpenAI API.
 * @param message - User message.
 * @param historyMessages - History of the chat.
 * @param model - Model to use.
 * @returns {Array<{ role: string, content: string, name?: string }>}
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
 * Handle retries for the chat completion.
 * @param func - Function to retry.
 * @param retries - Max retry attempts.
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
 * Generate a chat response using OpenAI.
 * @param openAiService - OpenAiService instance.
 * @param message - User message.
 * @param historyMessages - Chat history.
 * @param options - Additional options.
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

        const maxTokens = openaiConfig.get<number>('OPENAI_MAX_TOKENS')!;
        const temperature = openaiConfig.get<number>('OPENAI_TEMPERATURE')!;

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
