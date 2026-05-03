import Debug from 'debug';

const debug = Debug('app:IncomingMessageDensity');

/**
 * Tracks incoming message density to adjust response probability.
 * "If 5 messages in a minute, chance is 1/5".
 */
export class IncomingMessageDensity {
  private static instance: IncomingMessageDensity;
  private channelHistory = new Map<string, { ts: number; isBot: boolean }[]>();
  private participantLastSeen = new Map<string, Map<string, number>>();
  private readonly WINDOW_MS = 300000; // 5 minutes

  public static getInstance(): IncomingMessageDensity {
    if (!IncomingMessageDensity.instance) {
      IncomingMessageDensity.instance = new IncomingMessageDensity();
    }
    return IncomingMessageDensity.instance;
  }

  /**
   * Trim history to entries within the sliding time window.
   */
  private filterRecentMessages(
    history: { ts: number; isBot: boolean }[],
    windowMs: number,
    now: number
  ): { ts: number; isBot: boolean }[] {
    const threshold = now - windowMs;
    let keepCount = 0;
    for (let i = history.length - 1; i >= 0; i--) {
      if (history[i].ts <= threshold) break;
      keepCount++;
    }
    return keepCount === history.length ? history : history.slice(history.length - keepCount);
  }

  /**
   * Records an incoming message.
   */
  public recordMessage(channelId: string, authorId: string | undefined, isBot: boolean): void {
    const now = Date.now();
    let history = this.channelHistory.get(channelId) || [];

    // Prune old (use the class-level max window)
    history = this.filterRecentMessages(history, this.WINDOW_MS, now);

    // Record new
    history.push({ ts: now, isBot });
    this.channelHistory.set(channelId, history);

    if (authorId) {
      let byParticipant = this.participantLastSeen.get(channelId);
      if (!byParticipant) {
        byParticipant = new Map();
        this.participantLastSeen.set(channelId, byParticipant);
      }
      byParticipant.set(authorId, now);
    }
  }

  /**
   * Backwards-compatible convenience method used by older call sites and tests.
   * Records a message and returns the legacy 1/N density modifier (based on total messages in 1 min).
   */
  public recordMessageAndGetModifier(channelId: string, authorId?: string, isBot = false): number {
    this.recordMessage(channelId, authorId, isBot);
    const modifier = this.getDensityModifier(channelId);
    debug(
      `recordMessageAndGetModifier channel=${channelId} isBot=${isBot} -> ${modifier.toFixed(3)}`
    );
    return modifier;
  }

  /**
   * Returns the message counts for users and bots in a specific window.
   */
  public getDensity(
    channelId: string,
    windowMs = 60000
  ): { userCount: number; botCount: number; total: number } {
    const now = Date.now();
    const history = this.channelHistory.get(channelId) || [];
    const recent = this.filterRecentMessages(history, windowMs, now);

    let userCount = 0;
    let botCount = 0;
    for (const item of recent) {
      if (item.isBot) botCount++;
      else userCount++;
    }

    return { userCount, botCount, total: recent.length };
  }

  /**
   * (Deprecated) Legacy multiplier getter, kept for transitional safety if needed.
   * Uses total count.
   */
  public getDensityModifier(channelId: string): number {
    const { total } = this.getDensity(channelId);
    return 1 / Math.max(1, total);
  }

  /**
   * Returns how many unique participants have been seen in the last window.
   * Uses last-seen timestamps (not message counts).
   */
  public getUniqueParticipantCount(channelId: string, windowMs: number): number {
    const now = Date.now();
    const byParticipant = this.participantLastSeen.get(channelId);
    if (!byParticipant) {
      return 0;
    }

    // Prune old entries to prevent unbounded growth.
    for (const [participantId, ts] of byParticipant.entries()) {
      if (now - ts >= windowMs) {
        byParticipant.delete(participantId);
      }
    }
    return byParticipant.size;
  }

  // For testing
  public clear(): void {
    this.channelHistory.clear();
    this.participantLastSeen.clear();
  }
}
