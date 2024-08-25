export function handleError(error: Error): void {
    debug('[handleError]: DEPRECATED - use operations/commonUtils instead!');
    debug('An error occurred: ' + error.message);
    debug('Error Stack Trace: ' + error.stack);
}
