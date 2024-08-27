import Debug from "debug";
import constants from '@config/ConfigurationManager';
import { OpenAiService } from '../../llm/openai/OpenAiService';
import { summarizeText } from '@src/llm/openai/operations/summarizeText';

const debug = Debug('app:summarizeMessage');

/**
 * Summarizes a given text using the OpenAiService.
 *
 * This function reduces the length of responses that exceed Discord's message length limits.
 * It uses the OpenAiService to generate a summary based on the provided content.
 *
 * Key Features:
 * - Validates input content to ensure it's a string.
 * - Utilizes the summarizeText function from OpenAiService.
 * - Logs detailed information about the summarization process.
 *
 * @param {string} content - The content to be summarized.
 * @param {number} [targetSize=constants.LLM_RESPONSE_MAX_TOKENS] - The target size for the summary.
 * @returns {Promise<string>} The summarized text.
 */
export async function summarizeMessage(content: string, targetSize: number = constants.LLM_RESPONSE_MAX_TOKENS): Promise<string> {
    if (typeof content !== 'string') {
        debug('Invalid content type: ' + typeof content + ' - Content: ' + content);
        throw new Error('Content must be a string.');
    }

    try {
        const openAiService = OpenAiService.getInstance(constants.LLM_API_KEY);
        const response = await summarizeText(openAiService, content);
        debug('Summarization completed successfully.');
        return response.getContent();
    } catch (error: any) {
        debug('Error summarizing message: ' + (error instanceof Error ? error.message : String(error)));
        throw error;
    }
}
