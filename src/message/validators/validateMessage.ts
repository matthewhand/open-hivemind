import { IMessage } from "@message/types/IMessage";
import logger from "@utils/logger";

export function validateMessage(message: IMessage): boolean {
    if (!(message instanceof IMessage)) {
        logger.error('[validateMessage] Invalid message object type. Expected IMessage instance, got: ' + message.constructor.name);
        return false;
    }

    if (!message.getText || typeof message.getText !== 'function') {
        logger.error('[validateMessage] Message object does not have a valid getText method.');
        return false;
    }

    if (!message.getText().trim()) {
        logger.info('[validateMessage] Received empty message.');
        return false;
    }

    logger.debug('[validateMessage] Message validated successfully.');
    return true;
}
