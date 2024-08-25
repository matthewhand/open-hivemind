import OpenAiManager from '@src/llm/openai/manager/OpenAiManager';
import { sendMessageToChannel } from '@src/message/discord/utils/sendMessageToChannel';
import logger from '@src/utils/logger';
import { Client } from 'discord.js';

export async function sendFollowUp(client: Client<boolean>, channelId: string, originalMessage: string): Promise<void> {
    try {
        const prompt = `User asked: ${originalMessage}. Suggest a follow-up response.`;
        const requestBody = {
            model: 'text-davinci-003',
            prompt: prompt,
            max_tokens: 100,
        };
        const response = await client.completions.create(requestBody);
        const followUpMessage = response.choices[0].text.trim();
        await sendMessageToChannel(client, channelId, followUpMessage);
    } catch (error: any) {
        logger.error('Failed to send follow-up message:', error);
    }
}
