import Debug from "debug";
import { OpenAiService } from '@src/llm/openai/OpenAiService';
import { IMessage } from '@src/message/interfaces/IMessage';
import ConfigurationManager from '@config/ConfigurationManager';
import { buildChatCompletionRequestBody } from '@src/llm/openai/operations/chatCompletions/buildChatCompletionRequestBody';

const debug = Debug('app:prepareMessageBody');

/**
 * Prepare Message Body for OpenAI Chat Completion
 *
 * This function prepares the request body specifically for OpenAI's chat completion API.
 * It formats the prompt and message history into the required structure for chat completions.
 *
 * Key Features:
 * - Formats the prompt and message history for OpenAI's chat completion.
 * - Delegates to OpenAiService for API-specific processing.
 * - Logs detailed information about the preparation process.
 *
 * @param {string} prompt - The prompt for the AI to generate a response to.
 * @param {string} channelId - The ID of the Discord channel.
 * @param {IMessage[]} historyMessages - The history of messages to provide context to the AI.
 * @returns {Promise<any>} A promise that resolves with the prepared request body.
 */
export async function prepareMessageBody(prompt: string, channelId: string, historyMessages: IMessage[]): Promise<any> {
    if (typeof prompt !== 'string' || !Array.isArray(historyMessages)) {
        debug('Invalid input: Prompt must be a string and historyMessages must be an array.');
        throw new Error('Invalid input: Prompt must be a string and historyMessages must be an array.');
    }
    try {
        // Use buildChatCompletionRequestBody instead of buildRequestBody
        const requestBody = buildChatCompletionRequestBody(historyMessages);
        debug('Request body prepared successfully.');
        return requestBody;
    } catch (error: any) {
        debug('Error preparing request body: ' + (error instanceof Error ? error.message : String(error)));
        throw error;
    }
}
