
/**
 * A utility to retry a failed promise a given number of times with exponential backoff.
 * Useful for making network requests more resilient to transient failures.
 *
 * @param operation The asynchronous function to execute and potentially retry.
 * @param retries The maximum number of retry attempts (default is 3).
 * @param delayMs The initial delay in milliseconds before the first retry (default is 1000). The delay increases by 2x with each retry.
 * @param onRetry Optional callback to fire before attempting a retry. Useful for updating UI state.
 * @returns A promise resolving to the result of the `operation` if successful.
 * @throws The error from the final failed attempt if all retries are exhausted.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delayMs = 1000,
  onRetry?: (error: any, attempt: number, maxRetries: number, delayMs: number) => void,
  originalRetries?: number
): Promise<T> {
  const maxRetries = originalRetries ?? retries;
  try {
    return await operation();
  } catch (error: any) {
    if (retries <= 0) {
      throw error;
    }

    // Check if the error is transient before retrying
    const isTransient = error.message && (error.message.toLowerCase().includes('network') || error.message.toLowerCase().includes('timeout') || error.message.toLowerCase().includes('fetch'));
    if (!isTransient && error.name !== 'TypeError') { throw error; }

    const currentAttempt = maxRetries - retries + 1;
    if (onRetry) {
      onRetry(error, currentAttempt, maxRetries, delayMs);
    }

    // Apply +/- 10% proportional jitter to prevent thundering herd
    const jitterRange = delayMs * 0.2;
    const jitteredDelayMs = Math.max(0, Math.floor(delayMs + (Math.random() * jitterRange - jitterRange / 2)));

    await new Promise(resolve => setTimeout(resolve, jitteredDelayMs));
    return withRetry(operation, retries - 1, delayMs * 2, onRetry, maxRetries);
  }
}
