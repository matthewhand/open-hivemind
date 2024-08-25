import OpenAiManager from '@src/llm/openai/manager/OpenAiManager';
import { IMessage } from '@src/types/IMessage';
import logger from '@src/utils/logger';

export async function prepareMessageBody(prompt: string, channelId: string, historyMessages: IMessage[]): Promise<any> {
    try {
        const manager = OpenAiManager.getInstance();
        const requestBody = {
            model: 'text-davinci-003',
            prompt: prompt,
            max_tokens: 150,
            messages: historyMessages.map(msg => ({ role: msg.role, content: msg.getText() })),
        };
        logger.info('[prepareMessageBody] Request body prepared successfully.');
        return requestBody;
    } catch (error: any) {
        logger.error('[prepareMessageBody] Error preparing request body:', error);
        throw error;
    }
}
