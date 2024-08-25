import constants from '@config/ConfigurationManager';
import OpenAiService from '../../llm/openai/manager/OpenAiService';

/**
 * Summarizes a given text to a specified target size using the OpenAiService API.
 * This function reduces the length of responses that exceed Discord's message length limits.
 * 
 * @param {string} content - The content to be summarized.
 * @param {number} [targetSize=constants.LLM_RESPONSE_MAX_TOKENS] - The target size for the summary.
 * @returns {Promise<string>} - The summarized text if successful, the original text otherwise.
 */
export async function summarizeMessage(content: string, targetSize: number = constants.LLM_RESPONSE_MAX_TOKENS): Promise<string> {
    if (typeof content !== 'string') {
        debug.error('[summarizeMessage] Invalid content type: ' + typeof content, { content });
        throw new Error('Content must be a string.');
    }

    const openAiManager = OpenAiService.getInstance();
    try {
        const response = await openAiManager.summarizeText(content);
        const summary = typeof response === 'string' ? response : JSON.stringify(response);
        debug.info('[summarizeMessage] Content summarized to ' + summary.length + ' characters.', { summary });
        return summary;
    } catch (error: any) {
        debug.error('[summarizeMessage] Failed to summarize content: ' + error.message + ', returning original content.', { error });
        return content;  // Return the original content if summarization fails
    }
}
