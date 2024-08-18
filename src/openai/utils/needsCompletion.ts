/**
 * Determines whether a response needs further completion based on certain conditions.
 * @param maxTokensReached - Boolean indicating if the max token limit was reached in the response.
 * @param finishReason - The reason the OpenAI API stopped generating content.
 * @param content - The current content generated by the OpenAI API.
 * @returns Boolean indicating if the response requires further completion.
 */
export function needsCompletion(
    maxTokensReached: boolean,
    finishReason: string,
    content: string
): boolean {
    const endsInPunctuation = /[.!?]$/.test(content.trim());
    return maxTokensReached && finishReason !== 'stop' && !endsInPunctuation;
}
