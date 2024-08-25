import Debug from "debug";
const debug = Debug("app");

import OpenAiService from '@src/llm/openai/OpenAiService';
import { IMessage } from '@src/message/interfaces/IMessage';
import Debug from 'debug';

const debug = Debug('app:message:prepareMessageBody');

/**
 * Prepares the request body for the OpenAI service by formatting the prompt and message history.
 * 
 * @param {string} prompt - The prompt for the AI to generate a response to.
 * @param {string} channelId - The ID of the Discord channel.
 * @param {IMessage[]} historyMessages - The history of messages to provide context to the AI.
 * @returns {Promise<any>} A promise that resolves with the prepared request body.
 */
export async function prepareMessageBody(prompt: string, channelId: string, historyMessages: IMessage[]): Promise<any> {
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
