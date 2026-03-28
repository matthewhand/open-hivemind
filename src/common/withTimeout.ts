/**
 * Wraps an async operation with an AbortController-based timeout.
 *
 * The supplied `operation` receives an `AbortSignal` that it should forward to
 * any underlying I/O (fetch, axios, SDK clients, etc.).  If the operation does
 * not complete within `timeoutMs` the controller is aborted and a descriptive
 * error is thrown.
 *
 * @param operation     - Async function that accepts an AbortSignal.
 * @param timeoutMs     - Maximum time (in ms) before the operation is aborted.
 * @param operationName - Human-readable label used in the timeout error message.
 * @returns The resolved value of `operation`.
 */
export async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  operationName: string,
): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await operation(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`${operationName} timed out after ${timeoutMs}ms`);
    }
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
