import { OpenAI } from 'openai';
import { IMessage } from '@src/message/interfaces/IMessage';
import { createChatCompletion } from './createChatCompletion';
import { completeSentence } from '../operations/completeSentence';
import Debug from 'debug';

const debug = Debug('app:OpenAiService');

/**
 * Generates a chat response using the OpenAI API.
 * This method wraps the process of building a request body and sending it to the API,
 * ensuring that the service is not busy before making the request.
 *
 * @param openai - The OpenAI client instance.
 * @param message - The message to send to OpenAI.
 * @param historyMessages - The chat history as an array of IMessage objects.
 * @param options - Additional options like parallel execution, max retries, and finish reason.
 * @returns {Promise<string | null>} - The OpenAI API's response, or null if an error occurs.
 */
export async function generateChatResponse(
    openai: OpenAI,
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
    if (!openai.apiKey) {
        debug('generateChatResponse: API key is missing');
        return null;
    }

    debug('generateChatResponse: Building request body');
    const requestBody = await createChatCompletion([
        ...historyMessages,
        { role: 'user', content: message } as IMessage,
    ]);

    if (!options.parallelExecution && options.isBusy()) {
        debug('generateChatResponse: Service is busy');
        return null;
    }

    try {
        if (!options.parallelExecution) {
            options.setBusy(true);
        }

        debug('generateChatResponse: Sending request to OpenAI API');
        const response = await openai.chat.completions.create(requestBody);

        let finishReason = response.choices[0].finish_reason;
        let content = response.choices[0].message.content;

        for (let attempt = 1; attempt <= options.maxRetries && finishReason === options.finishReasonRetry; attempt++) {
            debug(`generateChatResponse: Retrying due to ${finishReason} (attempt ${attempt})`);
            content = await completeSentence(openai, content ?? '');
            finishReason = finishReason === 'stop' ? 'stop' : finishReason;
        }

        return content;
    } catch (error: any) {
        debug('generateChatResponse: Error occurred:', error);
        return null;
    } finally {
        if (!options.parallelExecution) {
            options.setBusy(false);
            debug('generateChatResponse: Service busy status reset');
        }
    }
}
