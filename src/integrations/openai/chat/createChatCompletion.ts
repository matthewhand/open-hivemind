import { OpenAI } from 'openai';
import openaiConfig from '@integrations/openai/interfaces/openaiConfig';
import { IMessage } from '@src/message/interfaces/IMessage';

interface ChatCompletionMessageParam {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string;
  name?: string;
}

function convertIMessageToChatParam(historyMessages: IMessage[]): ChatCompletionMessageParam[] {
    return historyMessages.map((msg) => ({
        role: msg.role as 'user' | 'assistant' | 'function',
        content: msg.content,
        name: msg.role === 'function' ? 'FunctionName' : '' // Ensure name is always a string
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

    if (!messages.length || !messages[0].role || !messages[0].content) {
        throw new Error('Invalid message format');
    }

    const response = await openai.chat.completions.create({
        model: openaiConfig.get<string>('OPENAI_MODEL'),
        messages,
        max_tokens: maxTokens,
        temperature: openaiConfig.get<number>('OPENAI_TEMPERATURE')!,
    });

    if (!response || !response.choices || response.choices.length === 0) {
        return '';
    }

    return response.choices[0].message?.content?.trim() || '';
}
