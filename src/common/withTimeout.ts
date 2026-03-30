/**
 * Wraps an async operation with an AbortController-based timeout.
 *
 * The supplied `operation` receives an `AbortSignal` that it should forward to
 * any underlying I/O (fetch, axios, SDK clients, etc.).  If the operation does
 * not complete within `timeoutMs` the controller is aborted and a descriptive
 * error is thrown.
 *
 * A `Promise.race` is used as a fallback so that the timeout is enforced even
 * when the operation does not honour the AbortSignal.
 *
 * @param operation     - Async function that accepts an AbortSignal.
 * @param timeoutMs     - Maximum time (in ms) before the operation is aborted.
 * @param operationName - Human-readable label used in the timeout error message.
 * @returns The resolved value of `operation`.
 */
export async function withTimeout<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T> {
  const controller = new AbortController();
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeoutPromise = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      controller.abort();
      reject(new Error(`${operationName} timed out after ${timeoutMs}ms`));
    }, timeoutMs);
  });

  try {
    return await Promise.race([operation(controller.signal), timeoutPromise]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}
