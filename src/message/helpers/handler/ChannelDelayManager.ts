import Debug from 'debug';

const debug = Debug('app:ChannelDelayManager');

interface ChannelDelayState {
  delayUntil: number;
  isLeaderAssigned: boolean;
  leaderMessageId?: string; // Kept for reference
  latestMessageId?: string; // The most recent message in the burst
  pendingMessageIds: Set<string>;
  lastMessageIdFromTrigger?: string;
  triggerUserId?: string;
}

/**
 * Coalesces bursts of incoming messages into a single delayed processing run.
 *
 * - The first message becomes the "leader" and waits until delay expires.
 * - Subsequent messages extend the delay (up to max) and return immediately.
 * - The leader refetches channel history after the delay, so it naturally includes
 *   messages that arrived during the waiting period.
 */
export class ChannelDelayManager {
  private static instance: ChannelDelayManager;
  private states = new Map<string, ChannelDelayState>();

  public static getInstance(): ChannelDelayManager {
    if (!ChannelDelayManager.instance) {
      ChannelDelayManager.instance = new ChannelDelayManager();
    }
    return ChannelDelayManager.instance;
  }

  public getKey(channelId: string, botId: string): string {
    return `${channelId}:${botId}`;
  }

  public registerMessage(
    key: string,
    messageId: string,
    userId: string,
    baseDelayMs: number,
    maxDelayMs: number
  ): { isLeader: boolean } {
    const now = Date.now();
    const existing = this.states.get(key);

    if (!existing) {
      const state: ChannelDelayState = {
        delayUntil: now + baseDelayMs,
        isLeaderAssigned: true,
        leaderMessageId: messageId,
        latestMessageId: messageId,
        pendingMessageIds: new Set([messageId]),
        triggerUserId: userId,
        lastMessageIdFromTrigger: messageId,
      };
      this.states.set(key, state);
      debug(`[${key}] leader=${messageId} delayUntil=${state.delayUntil}`);
      return { isLeader: true };
    }

    existing.pendingMessageIds.add(messageId);
    existing.latestMessageId = messageId; // Update latest
    if (existing.triggerUserId === userId) {
      existing.lastMessageIdFromTrigger = messageId;
    }

    // Extend delay window (but keep bounded)
    if (existing.delayUntil - now < maxDelayMs) {
      const remaining = Math.max(0, existing.delayUntil - now);
      const extended = Math.min(maxDelayMs, remaining + baseDelayMs);
      existing.delayUntil = now + extended;
      debug(
        `[${key}] extended delayUntil=${existing.delayUntil} pending=${existing.pendingMessageIds.size}`
      );
      console.info(
        `⏳ DELAY EXTENDED | key: ${key} | added: ${baseDelayMs}ms | total_pending: ${existing.pendingMessageIds.size}`
      );
    }

    return { isLeader: false };
  }

  public ensureMinimumDelay(key: string, minDelayMs: number, maxDelayMs: number): void {
    const state = this.states.get(key);
    if (!state) {
      return;
    }
    const now = Date.now();
    const desiredUntil = now + minDelayMs;
    const maxUntil = now + maxDelayMs;
    state.delayUntil = Math.min(maxUntil, Math.max(state.delayUntil, desiredUntil));
  }

  public getRemainingDelayMs(key: string): number {
    const state = this.states.get(key);
    if (!state) {
      return 0;
    }
    return Math.max(0, state.delayUntil - Date.now());
  }

  public getReplyToMessageId(key: string): string | undefined {
    const state = this.states.get(key);
    if (!state) {
      return undefined;
    }

    // User requested: only reply-to if delay was extended (i.e. compounding happened).
    // If only 1 message, it implies direct response, so no explicit reply needed.
    if (state.pendingMessageIds.size <= 1) {
      return undefined;
    }

    // User requested: "reply to the most recent message" if more messages came in.
    return state.latestMessageId || state.leaderMessageId;
  }

  public async waitForDelay(key: string): Promise<void> {
    const remaining = this.getRemainingDelayMs(key);
    if (remaining > 0) {
      debug(`[${key}] Enforcing delay: sleeping for ${remaining}ms`);
      await new Promise((resolve) => setTimeout(resolve, remaining));
    }
  }

  public clear(key: string): void {
    this.states.delete(key);
  }
}

export default ChannelDelayManager;
