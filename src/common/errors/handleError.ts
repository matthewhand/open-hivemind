import Debug from 'debug';

const debug = Debug('app:errors:handleError');

/**
 * Handles and logs errors across the application.
 * 
 * Provides centralized error handling and logging functionality to capture and
 * manage exceptions and errors occurring within the application.
 * 
 * This ensures that errors are logged with appropriate context and can be managed
 * gracefully to avoid unexpected crashes or unhandled exceptions.
 * 
 * @param {Error} error - The error object to handle.
 * @param {boolean} [isFatal=false] - Indicates if the error is fatal.
 */
export function handleError(error: Error, isFatal: boolean = false): void {
    if (isFatal) {
        debug('Fatal error occurred:', error);
        process.exit(1);
    } else {
        debug('Non-fatal error occurred:', error.message);
    }
}
