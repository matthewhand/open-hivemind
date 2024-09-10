import Debug from 'debug';
const debug = Debug('app:retry');

/**
 * Retry a function for a set number of attempts.
 * @param func - The asynchronous function to retry.
 * @param retries - The number of retry attempts.
 * @returns The result of the function call if successful, otherwise throws an error.
 */
export async function retryRequest(func: () => Promise<any>, retries: number): Promise<any> {
  let attempts = 0;
  while (attempts < retries) {
    try {
      return await func();
    } catch (error) {
      attempts++;
      if (attempts >= retries) {
        throw error;
      }
      debug(`Retry attempt ${attempts} failed, retrying...`);
    }
  }
}
