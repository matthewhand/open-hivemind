import { IMessage } from '@src/message/interfaces/IMessage';
import { shouldReplyToMessage } from '@src/message/responseManager/shouldReplyToMessage';
import { handleAIResponse } from './handleAIResponse';
import logger from '@src/utils/logger';

/**
 * Handles an incoming message, determining if an AI response is needed,
 * preparing the request, and sending the response.
 * @param message - The incoming message.
 */
export async function handleMessage(message: IMessage): Promise<void> {
    logger.info(`Received message: ${message.content}`);
    
    if (!shouldReplyToMessage(message)) {
        logger.info('No AI response needed.');
        return;
    }

    await handleAIResponse(message);
}
