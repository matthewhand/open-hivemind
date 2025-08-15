import Debug from 'debug';

const debug = Debug('app:utils:retry');

export type RetryOptions = {
  retries?: number; // number of retries after the initial attempt
  minDelayMs?: number; // initial backoff delay in ms
  maxDelayMs?: number; // maximum backoff delay in ms
  factor?: number; // exponential factor
  jitter?: 'none' | 'full'; // add full jitter to spread retries
  shouldRetry?: (err: any, attempt: number) => boolean; // classify retryable errors
  onRetry?: (err: any, attempt: number, delayMs: number) => void; // hook per retry
};

export async function retry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const {
    retries = 3,
    minDelayMs = 200,
    maxDelayMs = 5000,
    factor = 2,
    jitter = 'full',
    shouldRetry = defaultShouldRetry,
    onRetry,
  } = opts;

  let attempt = 0;
  let delay = minDelayMs;
  // attempt 0 is the first try, then up to retries more attempts
  for (;;) {
    try {
      return await fn();
    } catch (err) {
      if (attempt >= retries || !shouldRetry(err, attempt)) {
        debug('retry: giving up', { attempt, retries, err: toErrorMessage(err) });
        throw err;
      }
      const delayWithJitter = computeDelayWithJitter(delay, jitter, maxDelayMs);
      debug('retry: scheduling retry', { attempt, delayWithJitter, err: toErrorMessage(err) });
      onRetry?.(err, attempt + 1, delayWithJitter);
      await sleep(delayWithJitter);
      attempt += 1;
      delay = Math.min(maxDelayMs, Math.round(delay * factor));
    }
  }
}

function computeDelayWithJitter(delayMs: number, jitter: 'none' | 'full', maxDelayMs: number): number {
  const bounded = Math.min(delayMs, maxDelayMs);
  if (jitter === 'full') {
    return Math.floor(Math.random() * (bounded + 1));
  }
  return bounded;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function toErrorMessage(err: any): string {
  if (!err) return 'unknown_error';
  if (typeof err === 'string') return err;
  if (err instanceof Error) return err.message;
  return JSON.stringify(err);
}

// Default retry classifier: 429 or 5xx or network-like errors.
export function defaultShouldRetry(err: any, _attempt: number): boolean {
  try {
    const status = (err?.status ?? err?.code ?? err?.response?.status) as number | string | undefined;
    if (typeof status === 'number') {
      if (status === 429) return true;
      if (status >= 500) return true;
    }
    if (typeof status === 'string') {
      // some SDKs will set code like 'ETIMEDOUT', 'ECONNRESET', or '429'
      if (status === '429') return true;
      if (/E(CONNRESET|TIMEDOUT|HOSTUNREACH|NETUNREACH)/.test(status)) return true;
    }
    // Slack may provide retry_after header or property on error data
    if (err?.data?.retry_after || err?.response?.headers?.['retry-after']) return true;
  } catch {
    // be conservative
  }
  return false;
}
