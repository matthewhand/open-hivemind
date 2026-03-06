/**
 * A utility to retry a failed promise a given number of times with exponential backoff.
 * Useful for making network requests more resilient to transient failures.
 *
 * @param operation The asynchronous function to execute and potentially retry.
 * @param retries The maximum number of retry attempts (default is 3).
 * @param delayMs The initial delay in milliseconds before the first retry (default is 1000). The delay increases by 1.5x with each retry.
 * @returns A promise resolving to the result of the `operation` if successful.
 * @throws The error from the final failed attempt if all retries are exhausted.
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  retries = 3,
  delayMs = 1000
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries <= 0) {
      throw error;
    }
    await new Promise(resolve => setTimeout(resolve, delayMs));
    return withRetry(operation, retries - 1, delayMs * 1.5);
  }
}
