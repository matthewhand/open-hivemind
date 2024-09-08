import { OpenAI } from 'openai';
import openaiConfig from '@integrations/openai/interfaces/openaiConfig';
import { IMessage } from '@src/message/interfaces/IMessage';

// Added type for ChatCompletionMessageParam with optional name property
interface ChatCompletionMessageParam {
  role: string;
  content: string;
  name?: string;
}

// Converts IMessage to ChatCompletionMessageParam, ensuring name is added when required
function convertIMessageToChatParam(historyMessages: IMessage[]): ChatCompletionMessageParam[] {
    return historyMessages.map((msg) => ({
        role: msg.role,
        content: msg.content,
        name: msg.role === 'function' ? 'FunctionName' : undefined, // Example condition
    }));
}

export async function createChatCompletion(
    openai: OpenAI,
    historyMessages: IMessage[],
    systemMessageContent: string,
    maxTokens: number
): Promise<string> {
    const messages = convertIMessageToChatParam(historyMessages);
    messages.unshift({ role: 'system', content: systemMessageContent });

    // Debug log for OpenAI request parameters
    console.debug('Sending request to OpenAI with messages:', messages);

    // Ensure messages array is valid before making API call
    if (!messages.length || !messages[0].role || !messages[0].content) {
        throw new Error('Invalid message format');
    }

    const response = await openai.chat.completions.create({
        model: openaiConfig.get(`OPENAI_MODEL`) as string,
        messages,
        max_tokens: maxTokens,
        temperature: openaiConfig.get<number>(`OPENAI_TEMPERATURE`)!,
    });

    if (!response || !response.choices || response.choices.length === 0) {
        return '';
    }

    console.debug('Received response from OpenAI:', response);
    return response.choices[0].message?.content?.trim() || '';
}
