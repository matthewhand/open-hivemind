import Debug from 'debug';
import type { TelegramUpdate } from './TelegramMessage';

const debug = Debug('app:TelegramPoller');

/** Subset of the fetch API the poller needs — injectable for tests. */
export type FetchLike = (
  url: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    signal?: AbortSignal;
  }
) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<any>;
}>;

export interface TelegramPollerOptions {
  /** Bot token from BotFather. */
  token: string;
  /** Called once per update, in order. Errors are logged, not fatal. */
  onUpdate: (update: TelegramUpdate) => Promise<void> | void;
  /** Telegram API base URL (override for tests/proxies). */
  apiBaseUrl?: string;
  /** Long-poll timeout sent to getUpdates, in seconds. */
  pollTimeoutSeconds?: number;
  /** Delay before retrying after a failed poll, in milliseconds. */
  errorBackoffMs?: number;
  /** Update types to subscribe to. */
  allowedUpdates?: string[];
  /** Injectable fetch implementation (defaults to global fetch). */
  fetchFn?: FetchLike;
}

/**
 * Long-polls the Telegram Bot API getUpdates endpoint with offset tracking.
 *
 * - The offset is advanced to `max(update_id) + 1` after each batch so
 *   processed updates are confirmed (Telegram deletes them server-side).
 * - The offset advances even when the update handler throws, so a poison
 *   message cannot wedge the loop into reprocessing forever.
 * - stop() aborts any in-flight long-poll request for prompt shutdown.
 */
export class TelegramPoller {
  private readonly token: string;
  private readonly onUpdate: (update: TelegramUpdate) => Promise<void> | void;
  private readonly apiBaseUrl: string;
  private readonly pollTimeoutSeconds: number;
  private readonly errorBackoffMs: number;
  private readonly allowedUpdates: string[];
  private readonly fetchFn: FetchLike;

  private offset?: number;
  private running = false;
  private abortController?: AbortController;
  private loopPromise?: Promise<void>;

  constructor(options: TelegramPollerOptions) {
    this.token = options.token;
    this.onUpdate = options.onUpdate;
    this.apiBaseUrl = (options.apiBaseUrl ?? 'https://api.telegram.org').replace(/\/+$/, '');
    this.pollTimeoutSeconds = options.pollTimeoutSeconds ?? 30;
    this.errorBackoffMs = options.errorBackoffMs ?? 5000;
    this.allowedUpdates = options.allowedUpdates ?? ['message'];
    this.fetchFn = options.fetchFn ?? (fetch as unknown as FetchLike);
  }

  /** Current getUpdates offset (undefined until the first batch arrives). */
  public getOffset(): number | undefined {
    return this.offset;
  }

  public isRunning(): boolean {
    return this.running;
  }

  /** Starts the long-poll loop. Idempotent. */
  public start(): void {
    if (this.running) {
      return;
    }
    this.running = true;
    this.loopPromise = this.runLoop();
  }

  /** Stops the loop and aborts any in-flight request. Resolves when the loop exits. */
  public async stop(): Promise<void> {
    this.running = false;
    this.abortController?.abort();
    try {
      await this.loopPromise;
    } catch {
      // Loop errors are already logged inside runLoop.
    }
    this.loopPromise = undefined;
  }

  /**
   * Performs a single getUpdates request and dispatches the resulting
   * updates. Exposed for tests; the run loop calls this repeatedly.
   *
   * @returns The number of updates processed.
   */
  public async pollOnce(signal?: AbortSignal): Promise<number> {
    const body: Record<string, unknown> = {
      timeout: this.pollTimeoutSeconds,
      allowed_updates: this.allowedUpdates,
    };
    if (this.offset !== undefined) {
      body.offset = this.offset;
    }

    const response = await this.fetchFn(`${this.apiBaseUrl}/bot${this.token}/getUpdates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal,
    });

    if (!response.ok) {
      throw new Error(`Telegram getUpdates returned HTTP ${response.status}`);
    }

    const data = await response.json();
    if (!data?.ok) {
      throw new Error(`Telegram getUpdates error: ${data?.description ?? 'malformed response'}`);
    }

    const updates: TelegramUpdate[] = Array.isArray(data.result) ? data.result : [];
    for (const update of updates) {
      if (typeof update?.update_id === 'number') {
        // Confirm this update regardless of handler outcome.
        this.offset = Math.max(this.offset ?? 0, update.update_id + 1);
      }
      try {
        await this.onUpdate(update);
      } catch (error: unknown) {
        debug(
          'Update handler failed for update %s: %s',
          update?.update_id,
          error instanceof Error ? error.message : String(error)
        );
      }
    }
    return updates.length;
  }

  private async runLoop(): Promise<void> {
    debug('Starting Telegram long-poll loop');
    while (this.running) {
      this.abortController = new AbortController();
      try {
        await this.pollOnce(this.abortController.signal);
      } catch (error: unknown) {
        if (!this.running) {
          break;
        }
        debug('Poll failed: %s', error instanceof Error ? error.message : String(error));
        await this.sleep(this.errorBackoffMs);
      }
    }
    debug('Telegram long-poll loop stopped');
  }

  /** Abort-aware sleep so stop() is not delayed by error backoff. */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.abortController?.signal.removeEventListener('abort', onAbort);
        resolve();
      }, ms);
      const onAbort = () => {
        clearTimeout(timer);
        resolve();
      };
      this.abortController?.signal.addEventListener('abort', onAbort, { once: true });
    });
  }
}
