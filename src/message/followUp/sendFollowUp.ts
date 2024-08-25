import OpenAiManager from '@src/llm/openai/manager/OpenAiManager';
import { sendMessageToChannel } from '@src/message/discord/utils/sendMessageToChannel';
import logger from '@src/utils/logger';

export async function sendFollowUp(manager: OpenAiManager, channelId: string, originalMessage: string): Promise<void> {
    try {
        const prompt = `User asked: ${originalMessage}. Suggest a follow-up response.`;
        const requestBody = {
            model: 'text-davinci-003',
            prompt: prompt,
            max_tokens: 100,
        };
        const response = await manager.getClient().completions.create(requestBody);
        const followUpMessage = response.choices[0].text.trim();
        await sendMessageToChannel(manager.getClient(), channelId, followUpMessage);
    } catch (error: any) {
        logger.error('Failed to send follow-up message:', error);
    }
}
