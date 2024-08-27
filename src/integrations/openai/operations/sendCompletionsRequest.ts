import OpenAI from 'openai';
import ConfigurationManager from '@src/common/config/ConfigurationManager';

/**
 * Sends a completions request to the OpenAI API.
 * @param prompt - The prompt to complete.
 * @returns The response from the OpenAI API.
 */
export async function sendCompletionsRequest(prompt: string): Promise<any> {
    const client = new OpenAI({
        apiKey: ConfigurationManager.OPENAI_API_KEY,
        baseURL: ConfigurationManager.OPENAI_BASE_URL,
        timeout: ConfigurationManager.OPENAI_TIMEOUT,
        organization: ConfigurationManager.OPENAI_ORGANIZATION,
    });

    const requestBody = {
        model: ConfigurationManager.OPENAI_MODEL,
        prompt: prompt,
        max_tokens: ConfigurationManager.OPENAI_MAX_TOKENS,
        temperature: ConfigurationManager.OPENAI_TEMPERATURE,
        frequency_penalty: ConfigurationManager.OPENAI_FREQUENCY_PENALTY,
        presence_penalty: ConfigurationManager.OPENAI_PRESENCE_PENALTY,
        stop: ConfigurationManager.LLM_STOP,
        top_p: ConfigurationManager.LLM_TOP_P,
    };

    return client.completions.create(requestBody);
}

/**
 * Validates the OpenAI completion response and ensures that it contains valid data.
 * @param response - The response object returned by OpenAI.
 * @returns Extracted text content from the response.
 */
export function validateCompletionResponse(response: any): string {
    if (!response || !response.choices || response.choices.length === 0) {
        throw new Error('Invalid response from OpenAI API. No choices returned.');
    }

    const choice = response.choices[0];
    return choice.text.trim();
}

/**
 * Enhances the completion prompt with additional context if required.
 * @param prompt - The original prompt to be completed.
 * @param context - Additional context to enhance the prompt.
 * @returns The enhanced prompt string.
 */
export function enhancePrompt(prompt: string, context: string): string {
    return `${context}
${prompt}`;
}
