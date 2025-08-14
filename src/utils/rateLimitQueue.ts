import Debug from 'debug';

const debug = Debug('app:utils:rateLimitQueue');

export type RateLimitQueueOptions = {
  tokensPerInterval: number; // how many operations per interval
  intervalMs: number; // the interval window
  maxConcurrency?: number; // parallelism cap
  maxQueueSize?: number; // optional: drop when saturated
};

type Task<T> = {
  run: () => Promise<T>;
  resolve: (value: T | PromiseLike<T>) => void;
  reject: (reason?: any) => void;
};

export class RateLimitQueue {
  private tokens: number;
  private queue: Task<any>[] = [];
  private running = 0;
  private readonly maxConcurrency: number;
  private readonly maxQueueSize: number | undefined;

  constructor(private readonly opts: RateLimitQueueOptions) {
    this.tokens = opts.tokensPerInterval;
    this.maxConcurrency = Math.max(1, opts.maxConcurrency ?? 1);
    this.maxQueueSize = opts.maxQueueSize;
    setInterval(() => this.refill(), opts.intervalMs).unref?.();
  }

  private refill() {
    this.tokens = this.opts.tokensPerInterval;
    this.drain();
  }

  private drain() {
    while (this.tokens > 0 && this.running < this.maxConcurrency && this.queue.length > 0) {
      const task = this.queue.shift()!;
      this.tokens -= 1;
      this.running += 1;
      task.run()
        .then((res) => task.resolve(res))
        .catch((err) => task.reject(err))
        .finally(() => {
          this.running -= 1;
          this.drain();
        });
    }
  }

  public enqueue<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      // If we can run immediately, do not count against queue size
      if (this.tokens > 0 && this.running < this.maxConcurrency) {
        this.tokens -= 1;
        this.running += 1;
        fn()
          .then((res) => resolve(res))
          .catch((err) => reject(err))
          .finally(() => {
            this.running -= 1;
            this.drain();
          });
        return;
      }

      // Otherwise we need to queue; enforce saturation policy
      if (this.maxQueueSize !== undefined && this.queue.length >= this.maxQueueSize) {
        const err = new Error('RateLimitQueue saturated');
        debug(err.message);
        reject(err);
        return;
      }

      this.queue.push({ run: fn, resolve, reject });
      this.drain();
    });
  }
}

// default factory using environment variables but safe defaults for tests
export function createDefaultSlackSendQueue(): RateLimitQueue | null {
  try {
    const enabled = process.env.SLACK_SEND_QUEUE_ENABLED;
    if (enabled && enabled.toLowerCase() === 'false') return null; // explicit disable

    const tokens = Number(process.env.SLACK_SEND_TOKENS_PER_INTERVAL ?? 20);
    const intervalMs = Number(process.env.SLACK_SEND_INTERVAL_MS ?? 1000);
    const maxConc = Number(process.env.SLACK_SEND_MAX_CONCURRENCY ?? 2);
    const maxQueue = process.env.SLACK_SEND_MAX_QUEUE_SIZE !== undefined
      ? Number(process.env.SLACK_SEND_MAX_QUEUE_SIZE)
      : undefined;

    if (tokens <= 0 || intervalMs <= 0) return null; // invalid config disables queue

    return new RateLimitQueue({ tokensPerInterval: tokens, intervalMs, maxConcurrency: maxConc, maxQueueSize: maxQueue });
  } catch (e) {
    debug('Failed to create default slack send queue', e);
    return null;
  }
}
