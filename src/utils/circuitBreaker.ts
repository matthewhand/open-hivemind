import Debug from 'debug';

const debug = Debug('app:utils:circuitBreaker');

type State = 'closed' | 'open' | 'half_open';

export class CircuitBreaker {
  private state: State = 'closed';
  private failures = 0;
  private nextAttempt = 0; // epoch ms when we can try again after open

  constructor(
    private readonly failureThreshold: number = 5,
    private readonly resetTimeoutMs: number = 10000
  ) {}

  public canExecute(): boolean {
    const now = Date.now();
    if (this.state === 'open') {
      if (now >= this.nextAttempt) {
        this.state = 'half_open';
        debug('transition to half_open');
        return true;
      }
      return false;
    }
    return true;
  }

  public onSuccess(): void {
    if (this.state !== 'closed') debug('success: closing breaker');
    this.failures = 0;
    this.state = 'closed';
  }

  public onFailure(): void {
    this.failures += 1;
    debug('onFailure', { failures: this.failures, failureThreshold: this.failureThreshold });
    if (this.state === 'half_open' || this.failures >= this.failureThreshold) {
      this.trip();
    }
  }

  private trip(): void {
    this.state = 'open';
    this.nextAttempt = Date.now() + this.resetTimeoutMs;
    debug('breaker tripped', { nextAttempt: this.nextAttempt });
  }

  // Expose for metrics
  public getState(): State {
    return this.state;
  }
}
