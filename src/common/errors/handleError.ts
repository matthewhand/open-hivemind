import debug from '@src/operations/debug';

export function handleError(error: Error): void {
    debug.warn('[handleError]: DEPRECATED - use operations/commonUtils instead!');
    debug.error('An error occurred: ' + error.message);
    debug.error('Error Stack Trace: ' + error.stack);
}
