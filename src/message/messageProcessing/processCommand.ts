import { IMessage } from '@src/message/types/IMessage';
import { processAIResponse } from './processAIResponse';
import { sendMessagePart } from '@src/message/helpers/sendMessagePart';
import logger from '@src/utils/logger';

export async function processCommand(command: IMessage): Promise<void> {
    try {
        const aiResponse = await someOpenAiManagerFunction(command.content);
        await processAIResponse(command.client, command.channelId, aiResponse);
    } catch (error: any) {
        logger.error('Failed to process command:', error);
    }
}
