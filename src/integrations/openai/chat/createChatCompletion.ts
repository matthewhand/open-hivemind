import { OpenAI } from 'openai';
import openaiConfig from '@integrations/openai/interfaces/openaiConfig';
import { IMessage } from '@src/message/interfaces/IMessage';

/**
 * Converts IMessage to ChatCompletionMessageParam format, ensuring necessary properties.
 * @param {IMessage[]} historyMessages - The messages in conversation history.
 * @returns {Array<{ role: string; content: string; name: string }>} - Converted messages for OpenAI.
 */
function convertIMessageToChatParam(historyMessages: IMessage[]): { role: string; content: string; name: string }[] {
    return historyMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        name: msg.getAuthorId() || 'unknown', // Ensure name is always a string, default to 'unknown'
    }));
}

/**
 * Creates a chat completion using OpenAI's API.
 * @param {IMessage[]} historyMessages - The conversation history in IMessage format.
 * @param {string} systemMessageContent - The system message content for context.
 * @param {number} maxTokens - The maximum number of tokens allowed for the completion.
 * @returns {Promise<string>} - The generated response from OpenAI.
 */
export async function createChatCompletion(
    openai: OpenAI,
    historyMessages: IMessage[],
    systemMessageContent: string,
    maxTokens: number
): Promise<string> {
    const messages = convertIMessageToChatParam(historyMessages);
    messages.unshift({ role: 'system', content: systemMessageContent, name: 'system' });

    // Log the request being sent to the OpenAI API
    console.debug('[DEBUG] Sending chat completion request with messages:', messages);

    const response = await openai.chat.completions.create({
        model: openaiConfig.get('OPENAI_MODEL'),
        messages,
        max_tokens: maxTokens,
        temperature: openaiConfig.get('OPENAI_TEMPERATURE')
    });

    // Log the response from the OpenAI API
    console.debug('[DEBUG] Received response from OpenAI API:', response);

    if (!response.choices || response.choices.length === 0) {
        throw new Error('No completion choices returned from OpenAI API.');
    }

    return response.choices[0].message?.content?.trim() || '';
}
