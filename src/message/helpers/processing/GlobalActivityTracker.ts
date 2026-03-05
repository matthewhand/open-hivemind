import Debug from 'debug';

const debug = Debug('app:GlobalActivityTracker');

interface ActivityState {
  score: number;
  lastUpdate: number;
}

/**
 * Tracks global activity for each bot instance to simulate "fatigue".
 * Higher scores mean the bot has been very active recently across ALL channels.
 * Scores decay over time.
 */
export class GlobalActivityTracker {
  private static instance: GlobalActivityTracker;
  private states = new Map<string, ActivityState>();

  // Configuration defaults
  private readonly DECAY_PER_MINUTE = 0.5; // Score drops by 0.5 every minute
  private readonly SCORE_LIMIT = 5.0; // Arbitrary cap to prevent runaway scores

  private constructor() {}

  public static getInstance(): GlobalActivityTracker {
    if (!GlobalActivityTracker.instance) {
      GlobalActivityTracker.instance = new GlobalActivityTracker();
    }
    return GlobalActivityTracker.instance;
  }

  /**
   * Record new activity for a bot (increment score).
   * Call this when the bot successfully sends a message.
   */
  public recordActivity(botId: string, cost = 1.0): void {
    const currentState = this.getUpdatedState(botId);

    currentState.score = Math.min(this.SCORE_LIMIT, currentState.score + cost);
    currentState.lastUpdate = Date.now();

    this.states.set(botId, currentState);
    debug(`Recorded activity for ${botId}: +${cost} => score: ${currentState.score.toFixed(2)}`);
  }

  /**
   * Get the current fatigue score for a bot (decayed based on elapsed time).
   * Returns a float >= 0.
   */
  public getScore(botId: string): number {
    return this.getUpdatedState(botId).score;
  }

  /**
   * Helper to retrieve state and apply pending decay.
   */
  private getUpdatedState(botId: string): ActivityState {
    const now = Date.now();
    const state = this.states.get(botId) || { score: 0, lastUpdate: now };

    if (state.score > 0) {
      const minutesElapsed = (now - state.lastUpdate) / 60000;
      if (minutesElapsed > 0) {
        const decay = minutesElapsed * this.DECAY_PER_MINUTE;
        state.score = Math.max(0, state.score - decay);
        state.lastUpdate = now;

        // Cleanup if score hits 0
        if (state.score === 0) {
          this.states.delete(botId);
          return { score: 0, lastUpdate: now };
        }

        // Update map with decayed state
        this.states.set(botId, state);
      }
    } else {
      // Ensure specific entry exists if requested (though score is 0)
      // Actually, if it doesn't exist, returning {0, now} is fine, no need to set map unless writing
    }

    return state;
  }
}
