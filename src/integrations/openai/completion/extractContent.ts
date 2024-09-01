import { ChatCompletionResponseMessage } from 'openai';

/**
 * Extracts the content from the response choice provided by OpenAI.
 * @param choice - The response choice object from OpenAI.
 * @returns The extracted content as a string.
 */
export function extractContent(choice: ChatCompletionResponseMessage): string {
    return choice.text?.trim() || '';
}
