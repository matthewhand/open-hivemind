import Debug from 'debug';
import messageConfig from '@config/messageConfig';

const debug = Debug('app:AdaptiveHistoryTuner');

interface ChannelState {
  desiredLimit: number;
  lastSeenCount: number;
  lastUtilization: number;
}

/**
 * Tracks a per-channel desired history fetch limit and adapts it based on
 * how much the prompt-builder trims history to fit the input token budget.
 */
export class AdaptiveHistoryTuner {
  private static instance: AdaptiveHistoryTuner;
  private state: Map<string, ChannelState> = new Map();

  public static getInstance(): AdaptiveHistoryTuner {
    if (!AdaptiveHistoryTuner.instance) {
      AdaptiveHistoryTuner.instance = new AdaptiveHistoryTuner();
    }
    return AdaptiveHistoryTuner.instance;
  }

  private getMin(): number {
    return Number(messageConfig.get('MESSAGE_HISTORY_ADAPTIVE_MIN_LIMIT')) || 6;
  }

  private getMax(): number {
    return Number(messageConfig.get('MESSAGE_HISTORY_ADAPTIVE_MAX_LIMIT')) || 60;
  }

  private getStep(): number {
    return Number(messageConfig.get('MESSAGE_HISTORY_ADAPTIVE_STEP')) || 5;
  }

  private getTargetUtilization(): number {
    return Number(messageConfig.get('MESSAGE_HISTORY_ADAPTIVE_TARGET_UTILIZATION')) || 0.75;
  }

  private isEnabled(): boolean {
    const raw = messageConfig.get('MESSAGE_HISTORY_ADAPTIVE_ENABLED');
    return raw === undefined ? true : Boolean(raw);
  }

  public getDesiredLimit(key: string, baseLimit: number): number {
    const base = Math.max(1, Number(baseLimit) || 10);
    const s = this.state.get(key);
    if (!this.isEnabled()) return base;
    if (!s) {
      const initial = Math.min(this.getMax(), Math.max(this.getMin(), base));
      this.state.set(key, { desiredLimit: initial, lastSeenCount: 0, lastUtilization: 0 });
      return initial;
    }
    return Math.min(this.getMax(), Math.max(this.getMin(), s.desiredLimit));
  }

  public recordResult(key: string, info: {
    requestedLimit: number;
    receivedCount: number;
    keptCount: number;
    estimatedTotalTokens: number;
    inputBudgetTokens: number;
  }): void {
    if (!this.isEnabled()) return;

    const step = this.getStep();
    const min = this.getMin();
    const max = this.getMax();
    const target = this.getTargetUtilization();

    const utilization = info.inputBudgetTokens > 0 ? info.estimatedTotalTokens / info.inputBudgetTokens : 1;
    const trimmed = Math.max(0, info.receivedCount - info.keptCount);
    const saturating = info.receivedCount >= info.requestedLimit;

    const prev = this.state.get(key) || { desiredLimit: info.requestedLimit, lastSeenCount: 0, lastUtilization: 0 };
    let next = prev.desiredLimit;

    // If we trimmed anything or we're very close to budget, reduce desired limit.
    if (trimmed > 0 || utilization >= 0.95) {
      const over = Math.max(0, utilization - target);
      const scale = over >= 0.35 ? 3 : over >= 0.2 ? 2 : 1;
      next = prev.desiredLimit - (scale * step);
    } else if (saturating && utilization <= 0.55) {
      // If we fetched a full window and are far under budget, try fetching more next time.
      const under = Math.max(0, target - utilization);
      const scale = under >= 0.35 ? 3 : under >= 0.2 ? 2 : 1;
      next = prev.desiredLimit + (scale * step);
    }

    next = Math.min(max, Math.max(min, next));
    this.state.set(key, {
      desiredLimit: next,
      lastSeenCount: info.receivedCount,
      lastUtilization: utilization
    });

    debug(`historyTune key=${key} requested=${info.requestedLimit} received=${info.receivedCount} kept=${info.keptCount} util=${utilization.toFixed(2)} next=${next}`);
  }

  /** For tests */
  public reset(): void {
    this.state.clear();
  }
}

export default AdaptiveHistoryTuner;

