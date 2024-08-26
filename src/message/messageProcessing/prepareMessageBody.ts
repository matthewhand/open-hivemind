import Debug from "debug";
import { OpenAiService } from '@src/llm/openai/OpenAiService';
import { IMessage } from '@src/message/interfaces/IMessage';

const debug = Debug('app:prepareMessageBody');

/**
 * Prepares the request body for the OpenAI service by formatting the prompt and message history.
 *
 * This function takes in a prompt, a Discord channel ID, and a history of messages to create a request body
 * that the OpenAiService can use to generate a response. It handles message formatting, ensures the history
 * is correctly structured, and prepares everything for API interaction.
 *
 * Key Features:
 * - Formats the prompt and history messages into a structured request body
 * - Provides detailed logging for successful preparation and error handling
 * - Validates input to ensure that the prompt and history messages are correctly structured
 *
 * @param {string} prompt - The prompt for the AI to generate a response to.
 * @param {string} channelId - The ID of the Discord channel.
 * @param {IMessage[]} historyMessages - The history of messages to provide context to the AI.
 * @returns {Promise<any>} A promise that resolves with the prepared request body.
 */
export async function prepareMessageBody(prompt: string, channelId: string, historyMessages: IMessage[]): Promise<any> {
    if (typeof prompt !== 'string' || !Array.isArray(historyMessages)) {
        debug('[prepareMessageBody] Invalid input: Prompt must be a string and historyMessages must be an array.');
        throw new Error('Invalid input: Prompt must be a string and historyMessages must be an array.');
    }
    try {
        const manager = OpenAiService.getInstance();
        const requestBody = {
            model: 'text-davinci-003',
            prompt: prompt,
            max_tokens: 150,
            messages: historyMessages.map(msg => ({ role: msg.role, content: msg.getText() })),
        };
        debug('[prepareMessageBody] Request body prepared successfully.');
        return requestBody;
    } catch (error: any) {
        debug('[prepareMessageBody] Error preparing request body: ' + (error instanceof Error ? error.message : String(error)));
        throw error;
    }
}
