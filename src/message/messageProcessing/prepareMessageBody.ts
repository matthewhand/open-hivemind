import OpenAiService from '@src/llm/openai/OpenAiService';
import { IMessage } from '@src/message/interfaces/IMessage';
import debug from '@src/operations/debug';

export async function prepareMessageBody(prompt: string, channelId: string, historyMessages: IMessage[]): Promise<any> {
    try {
        const manager = OpenAiService.getInstance();
        const requestBody = {
            model: 'text-davinci-003',
            prompt: prompt,
            max_tokens: 150,
            messages: historyMessages.map(msg => ({ role: msg.role, content: msg.getText() })),
        };
        debug.info('[prepareMessageBody] Request body prepared successfully.');
        return requestBody;
    } catch (error: any) {
        debug.error('[prepareMessageBody] Error preparing request body:', error);
        throw error;
    }
}
