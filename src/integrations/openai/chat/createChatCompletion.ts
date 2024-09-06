import { OpenAI } from 'openai';
import openaiConfig from '@integrations/openai/interfaces/openaiConfig';
import { ChatCompletionCreateParams } from 'openai';
import { IMessage } from '@src/message/interfaces/IMessage';

/**
 * Creates a chat completion using OpenAI's API.
 * 
 * @param {IMessage[]} historyMessages - The history of messages in the conversation.
 * @param {string} systemMessageContent - The system message content for context.
 * @param {number} maxTokens - Maximum number of tokens for the completion.
 * @returns {Promise<string>} - The generated completion text.
 */
export async function createChatCompletion(
    openai: OpenAI,
    historyMessages: IMessage[],
    systemMessageContent: string,
    maxTokens: number
): Promise<string> {
    const messages: ChatCompletionCreateParams['messages'] = historyMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
    }));

    messages.unshift({ role: 'system', content: systemMessageContent });

    const response = await openai.chat.completions.create({
        model: openaiConfig.get('OPENAI_MODEL', 'gpt-3.5-turbo'),
        messages,
        max_tokens: maxTokens,
        temperature: openaiConfig.get('OPENAI_TEMPERATURE', 0.7),
    });

    if (!response.choices || response.choices.length === 0) {
        throw new Error('No completion choices returned from OpenAI API.');
    }

    return response.choices[0].message?.content?.trim() || '';
}
