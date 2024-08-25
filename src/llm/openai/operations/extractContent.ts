/**
 * Extracts the content from the response choice provided by OpenAI.
 * @param choice - The response choice object from OpenAI.
 * @returns The extracted content as a string.
 */
export function extractContent(choice: any): string {
    return choice.message?.content?.trim() || '';
}
