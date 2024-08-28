import Debug from 'debug';
import { OpenAiService } from '@src/integrations/openai/OpenAiService';
import ConfigurationManager from '@config/ConfigurationManager';

const debug = Debug('app:summarizeText');
const configManager = new ConfigurationManager();

/**
 * Summarize Text
 *
 * This function summarizes a given text using the OpenAiService. It sends the text to the OpenAI API
 * and returns the summarized version.
 *
 * Key Features:
 * - Integrates with OpenAiService to summarize large texts.
 * - Handles the request and response flow for text summarization.
 * - Provides detailed logging for debugging purposes.
 *
 * @param content - The content to summarize.
 * @returns {Promise<string>} - The summarized text.
 */
export async function summarizeText(content: string): Promise<string> {
    try {
        const openAiService = new OpenAiService();
        const response = await openAiService.createChatCompletion({
            model: configManager.OPENAI_MODEL,
            messages: [{ role: 'user', content }],
            max_tokens: configManager.OPENAI_MAX_TOKENS,
            temperature: configManager.OPENAI_TEMPERATURE,
            top_p: configManager.LLM_TOP_P,
            frequency_penalty: configManager.OPENAI_FREQUENCY_PENALTY,
            presence_penalty: configManager.OPENAI_PRESENCE_PENALTY,
            stop: configManager.LLM_STOP
        });
        debug('summarizeText: Full response: ' + JSON.stringify(response));
        return response.choices[0].message.content;
    } catch (error: any) {
        debug('summarizeText: Error summarizing text: ' + (error instanceof Error ? error.message : String(error)));
        return ''; // Return an empty string in case of failure
    }
}
