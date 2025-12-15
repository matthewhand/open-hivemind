import Debug from 'debug';

const debug = Debug('app:TypingActivity');

/**
 * Tracks recent "typingStart" signals from other users in a channel.
 * Used to delay starting our own typing indicator to feel less interruptive.
 */
export class TypingActivity {
  private static instance: TypingActivity;
  private byChannel: Map<string, Map<string, number>> = new Map();

  public static getInstance(): TypingActivity {
    if (!TypingActivity.instance) {
      TypingActivity.instance = new TypingActivity();
    }
    return TypingActivity.instance;
  }

  public recordTyping(channelId: string, userId: string): void {
    if (!channelId || !userId) return;
    const now = Date.now();
    let byUser = this.byChannel.get(channelId);
    if (!byUser) {
      byUser = new Map();
      this.byChannel.set(channelId, byUser);
    }
    byUser.set(userId, now);
    debug(`Typing recorded channel=${channelId} user=${userId}`);
  }

  public getActiveTypistCount(channelId: string, windowMs: number): number {
    const now = Date.now();
    const byUser = this.byChannel.get(channelId);
    if (!byUser) return 0;

    for (const [userId, ts] of byUser.entries()) {
      if (now - ts >= windowMs) {
        byUser.delete(userId);
      }
    }
    return byUser.size;
  }

  public isOthersTyping(channelId: string, windowMs: number): boolean {
    return this.getActiveTypistCount(channelId, windowMs) > 0;
  }

  // For tests
  public clear(channelId?: string): void {
    if (channelId) {
      this.byChannel.delete(channelId);
      return;
    }
    this.byChannel.clear();
  }
}

export default TypingActivity;

