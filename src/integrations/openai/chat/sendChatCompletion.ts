import openaiConfig from '@integrations/openai/interfaces/openaiConfig';
import llmConfig from '@llm/interfaces/llmConfig';
import { IMessage } from '@message/interfaces/IMessage';
import Debug from 'debug';

const debug = Debug('app:sendChatCompletion');

/**
 * Sends a chat completion request to OpenAI's API.
 * 
 * This function uses llmConfig for general LLM settings and openaiConfig for provider-specific ones.
 * It manages the retry logic, API response, and handles errors.
 */
export async function sendChatCompletion(messages: IMessage[]): Promise<string> {
    try {
        const model = openaiConfig.get<string>('OPENAI_MODEL');
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
                debug(`Retrying in ${retryDelay} ms...`);
                await new Promise(res => setTimeout(res, retryDelay));
            }
        }
        throw new Error('Failed to get a complete response from OpenAI.');
    } catch (error: any) {
        debug('Failed to send chat completion: ' + error.message);
        throw error;
    }
}
