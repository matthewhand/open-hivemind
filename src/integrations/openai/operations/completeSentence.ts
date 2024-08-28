import Debug from 'debug';
import OpenAI from 'openai';
import constants from '@config/ConfigurationManager';

const debug = Debug('app:completeSentence');

/**
 * Completes a sentence by making an additional request to the OpenAI API.
 * @param openaiClient - The initialized OpenAI client instance.
 * @param partialContent - The partially completed sentence that needs completion.
 * @param config - The configuration constants for the API call.
 * @returns The completed content as a string.
 */
export async function completeSentence(
    openaiClient: OpenAI,
    partialContent: string,
    config: typeof constants
): Promise<string> {
    debug('[completeSentence] Completing sentence using OpenAI API.');
    const requestBody = {
        model: config.OPENAI_MODEL,
        prompt: partialContent,
        max_tokens: config.LLM_RESPONSE_MAX_TOKENS,
        temperature: config.OPENAI_TEMPERATURE,
    };
    const response = await openaiClient.completions.create(requestBody);
    return response.choices[0].text.trim();
}