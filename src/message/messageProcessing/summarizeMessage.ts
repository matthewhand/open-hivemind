import Debug from "debug";
import constants from '@config/ConfigurationManager';
import { OpenAiService } from '../../llm/openai/OpenAiService';

const debug = Debug('app:summarizeMessage');

/**
 * Summarizes a given text to a specified target size using the OpenAiService API.
 * This function reduces the length of responses that exceed Discord's message length limits.
 *
 * Key Features:
 * - Validates input content to ensure it's a string.
 * - Uses OpenAiService to generate a summary.
 * - Provides detailed logging for debugging and monitoring.
 *
 * @param {string} content - The content to be summarized.
 * @param {number} [targetSize=constants.LLM_RESPONSE_MAX_TOKENS] - The target size for the summary.
 * @returns {Promise<string>} - The summarized text if successful, the original text otherwise.
 */
export async function summarizeMessage(content: string, targetSize: number = constants.LLM_RESPONSE_MAX_TOKENS): Promise<string> {
    if (typeof content !== 'string') {
        debug('[summarizeMessage] Invalid content type: ' + typeof content + ' - Content: ' + content);
        throw new Error('Content must be a string.');
    }
    const openAiService = OpenAiService.getInstance(constants.OPENAI_API_KEY);
    try {
        const response = await openAiService.summarizeText(content);
        const summary = typeof response === 'string' ? response : JSON.stringify(response);
        debug('[summarizeMessage] Content summarized to ' + summary.length + ' characters. Summary: ' + summary);
        return summary;
    } catch (error: any) {
        debug('[summarizeMessage] Failed to summarize content: ' + error.message + '. Returning original content.', { error });
        return content;  // Return the original content if summarization fails
    }
}
