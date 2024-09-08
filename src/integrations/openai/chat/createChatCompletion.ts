import { OpenAI } from 'openai';
import openaiConfig from '@integrations/openai/interfaces/openaiConfig';
import { IMessage } from '@src/message/interfaces/IMessage';

function convertIMessageToChatParam(historyMessages: IMessage[]): { role: string; content: string; name: string }[] {
    return historyMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        name: msg.getAuthorId() || 'unknown',
    }));
}

export async function createChatCompletion(
    openai: OpenAI,
    historyMessages: IMessage[],
    systemMessageContent: string,
    maxTokens: number
): Promise<string> {
    const messages = convertIMessageToChatParam(historyMessages);
    messages.unshift({ role: 'system', content: systemMessageContent, name: 'system' });

    // Update to correct type path
    const response = await openai.chat.completions.create({
        model: openaiConfig.get('OPENAI_MODEL'),
        messages,
        max_tokens: maxTokens,
        temperature: openaiConfig.get('OPENAI_TEMPERATURE')
    });

    if (!response || !response.choices || response.choices.length === 0) {
        return '';
    }

    return response.choices[0].message?.content?.trim() || '';
}
