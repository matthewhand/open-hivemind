import logger from '@src/operations/logger';

export function handleError(error: Error): void {
    logger.warn('[handleError]: DEPRECATED - use operations/commonUtils instead!');
    logger.error('An error occurred: ' + error.message);
    logger.error('Error Stack Trace: ' + error.stack);
}
