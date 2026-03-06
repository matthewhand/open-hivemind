/**
 * A utility to retry a failed promise a given number of times.
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
