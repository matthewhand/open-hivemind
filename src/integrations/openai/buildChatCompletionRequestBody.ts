import Debug from 'debug';
import ConfigurationManager from '@config/ConfigurationManager';

const debug = Debug('app:buildChatCompletionRequestBody');
const configManager = new ConfigurationManager();

/**
 * Builds the request body for a chat completion.
 *
 * This function constructs the request body needed for making a chat completion request to the OpenAI API.
 * It includes various configuration options like model, max tokens, temperature, and more.
 *
 * Key Features:
 * - Constructs a request body for OpenAI chat completions.
 * - Utilizes configurations set in ConfigurationManager.
 * - Provides detailed logging for debugging purposes.
 *
 * @param historyMessages - The list of previous messages in the conversation.
 * @returns {Promise<object>} - The constructed request body.
 */
export async function buildChatCompletionRequestBody(historyMessages: any[]): Promise<object> {
    try {
        const requestBody = {
            model: configManager.OPENAI_MODEL,
            messages: historyMessages,
            max_tokens: configManager.OPENAI_MAX_TOKENS,
            temperature: configManager.OPENAI_TEMPERATURE,
            top_p: configManager.LLM_TOP_P,
            frequency_penalty: configManager.OPENAI_FREQUENCY_PENALTY,
            presence_penalty: configManager.OPENAI_PRESENCE_PENALTY,
            stop: configManager.LLM_STOP
        };
        debug('buildChatCompletionRequestBody: Request body constructed: ' + JSON.stringify(requestBody));
        return requestBody;
    } catch (error: any) {
        debug('buildChatCompletionRequestBody: Error constructing request body: ' + (error instanceof Error ? error.message : String(error)));
        return {}; // Return an empty object in case of failure
    }
}
