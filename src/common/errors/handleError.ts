import logger from '@src/utils/logger';

export function handleError(error: Error): void {
    logger.warn('[handleError]: DEPRECATED - use utils/commonUtils instead!');
    logger.error('An error occurred: ' + error.message);
    logger.error('Error Stack Trace: ' + error.stack);
}
