import OpenAiManager from '../../llm/openai/manager/OpenAiManager';
import logger from '@src/utils/logger';
import { sendMessageToChannel } from './messageSendingUtils';

export async function sendFollowUp(manager: OpenAiManager, channelId: string, originalMessage: string): Promise<void> {
    try {
        const prompt = `User asked: ${originalMessage}. Suggest a follow-up response.`;
        const requestBody = {
            model: 'text-davinci-003',
            prompt: prompt,
            max_tokens: 100,
        };
        const response = await manager.getClient().completions.create(requestBody);
        await sendMessageToChannel(response.choices[0].text.trim(), channelId, Date.now());
    } catch (error: any) {
        logger.error('Failed to send follow-up message:', error);
    }
}
