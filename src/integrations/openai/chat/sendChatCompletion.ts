import openai from 'openai';
import llmConfig from '@llm/interfaces/llmConfig';
import { IMessage } from '@message/interfaces/IMessage';
import Debug from 'debug';

const debug = Debug('app:sendChatCompletion');

/**
 * Sends a chat completion request to OpenAI's API.
 *
 * This function handles the configuration, retry logic, and sending of a chat completion request. It uses the settings defined
 * in llmConfig, such as the model, retry count, and other parameters. It also manages the API response and any errors.
 *
 * Key Features:
 * - **Configuration Handling**: Retrieves settings from llmConfig for controlling the chat completion.
 * - **Retry Logic**: Implements retry logic for incomplete responses or errors.
 * - **Debugging and Error Handling**: Includes detailed logging for debugging purposes and handles errors gracefully.
 */
export async function sendChatCompletion(messages: IMessage[]): Promise<string> {
    try {
        const model = llmConfig.get<string>('LLM_MODEL');
        const maxRetries = llmConfig.get<number>('LLM_MAX_RETRIES');
        const retryDelay = llmConfig.get<number>('LLM_RETRY_DELAY');
        
        debug(`Sending chat completion with model: ${model}`);
        debug(`Number of messages: ${messages.length}`);

        let response;
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                response = await openai.ChatCompletion.create({
                    model,
                    messages: messages.map(msg => ({ role: msg.role, content: msg.content })),
                });
                if (response?.choices?.[0]?.finish_reason !== 'length') {
                    return response.choices[0].message.content;
                }
                debug(`Retrying due to finish reason: ${response.choices[0].finish_reason}`);
            } catch (error: any) {
                debug(`Attempt ${attempt} failed with error: ${error.message}`);
                if (attempt === maxRetries) throw new Error('Max retries reached, unable to complete request.');
                await new Promise(res => setTimeout(res, retryDelay));
            }
        }
        throw new Error('Failed to get a complete response from OpenAI.');
    } catch (error: any) {
        debug('Failed to send chat completion: ' + error.message);
        throw error;
    }
}
