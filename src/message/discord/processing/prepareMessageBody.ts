import debug from '@src/operations/debug';

/**
 * Prepares the body of the message to be sent to the LLM for processing.
 * @param systemPrompt - The initial system prompt.
 * @param channelId - The ID of the channel where the message was sent.
 * @param messages - An array of previous messages in the conversation.
 * @returns A JSON object ready to be sent to the LLM.
 */
export async function prepareMessageBody(systemPrompt: string, channelId: string, messages: string[]): Promise<object> {
    debug.info('Preparing message body for channel ID: ' + channelId);

    // Simulate preparing a request body to send to an LLM API.
    return {
        system_prompt: systemPrompt,
        channel_id: channelId,
        messages: messages,
    };
}
