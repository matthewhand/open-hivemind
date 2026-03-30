import Debug from 'debug';

const debug = Debug('app:providers:ReconnectionManager');

export type ConnectionState = 'connected' | 'reconnecting' | 'failed' | 'disconnected';

export interface ReconnectionConfig {
  initialDelayMs?: number;
  maxDelayMs?: number;
  maxRetries?: number;
  jitter?: boolean;
}

export interface ReconnectionStatus {
  state: ConnectionState;
  attempts: number;
  lastAttemptAt?: Date;
  nextAttemptAt?: Date;
  error?: Error;
}

export class ReconnectionManager {
  private state: ConnectionState = 'disconnected';
  private attempts = 0;
  private config: Required<ReconnectionConfig>;
  private reconnectTimer?: NodeJS.Timeout;
  private lastError?: Error;
  private lastAttemptAt?: Date;
  private nextAttemptAt?: Date;
  private stopped = false;

  constructor(
    private readonly providerId: string,
    private readonly connectFn: () => Promise<void>,
    config?: ReconnectionConfig
  ) {
    this.config = {
      initialDelayMs: config?.initialDelayMs ?? 1000,
      maxDelayMs: config?.maxDelayMs ?? 60000,
      maxRetries: config?.maxRetries ?? 10,
      jitter: config?.jitter ?? true,
    };
  }

  public async start(): Promise<void> {
    if (this.state === 'connected' || this.state === 'reconnecting') {
      return;
    }

    this.stopped = false;
    this.attempts = 0;
    this.state = 'reconnecting';
    await this.attemptConnection();
  }

  public stop(): void {
    this.stopped = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.state = 'disconnected';
    this.attempts = 0;
    this.nextAttemptAt = undefined;
    debug(`[${this.providerId}] ReconnectionManager stopped`);
  }

  public onConnected(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
    this.state = 'connected';
    this.attempts = 0;
    this.lastError = undefined;
    this.nextAttemptAt = undefined;
    debug(`[${this.providerId}] ReconnectionManager registered connected state`);
  }

  public onDisconnected(error?: Error): void {
    if (this.state === 'reconnecting' || this.stopped) return;

    this.state = 'disconnected';
    if (error) {
      this.lastError = error;
      debug(`[${this.providerId}] Disconnected with error: ${error.message}`);
    } else {
      debug(`[${this.providerId}] Disconnected`);
    }

    // Auto-start reconnection
    this.start().catch((err) => {
      debug(`[${this.providerId}] Failed to start reconnection: ${err.message}`);
    });
  }

  private async attemptConnection(): Promise<void> {
    if (this.state !== 'reconnecting' || this.stopped) return;

    this.attempts++;
    this.lastAttemptAt = new Date();

    try {
      debug(
        `[${this.providerId}] Attempting connection (Attempt ${this.attempts}/${this.config.maxRetries})`
      );
      await this.connectFn();
      // Re-check stopped flag after async connectFn to avoid acting on stale state
      if (this.stopped) return;
      this.onConnected();
    } catch (error: any) {
      // Re-check stopped flag after async connectFn to prevent scheduling new timers
      if (this.stopped) return;

      this.lastError = error;
      debug(`[${this.providerId}] Connection attempt failed: ${error.message}`);

      if (this.attempts >= this.config.maxRetries) {
        debug(`[${this.providerId}] Max retries (${this.config.maxRetries}) reached. Giving up.`);
        this.state = 'failed';
        return;
      }

      this.scheduleNextAttempt();
    }
  }

  private scheduleNextAttempt(): void {
    if (this.stopped) return;

    // Exponential backoff
    let delay = Math.min(
      this.config.initialDelayMs * Math.pow(2, this.attempts - 1),
      this.config.maxDelayMs
    );

    // Add jitter (±20%)
    if (this.config.jitter) {
      const jitterAmount = delay * 0.2;
      delay = delay + (Math.random() * jitterAmount * 2 - jitterAmount);
    }

    this.nextAttemptAt = new Date(Date.now() + delay);
    debug(
      `[${this.providerId}] Scheduling next attempt in ${Math.round(delay)}ms at ${this.nextAttemptAt.toISOString()}`
    );

    this.reconnectTimer = setTimeout(() => {
      this.attemptConnection().catch((err) => {
        debug(`[${this.providerId}] Error in scheduled connection attempt: ${err.message}`);
      });
    }, delay);
  }

  public getStatus(): ReconnectionStatus {
    return {
      state: this.state,
      attempts: this.attempts,
      lastAttemptAt: this.lastAttemptAt,
      nextAttemptAt: this.nextAttemptAt,
      error: this.lastError,
    };
  }
}
