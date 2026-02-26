import { EventEmitter } from 'events';

export interface TypingState {
  userId: string;
  channelId: string;
  startedAt: number;
  expiresAt: number;
}

export class TypingMonitor extends EventEmitter {
  private static instance: TypingMonitor;
  private typingStates = new Map<string, TypingState>(); // key: channelId:userId
  private readonly TYPING_TTL_MS = 10000; // 10 seconds (Discord default is ~10s)

  public static getInstance(): TypingMonitor {
    if (!TypingMonitor.instance) {
      TypingMonitor.instance = new TypingMonitor();
    }
    return TypingMonitor.instance;
  }

  public recordTyping(channelId: string, userId: string): void {
    const key = `${channelId}:${userId}`;
    const now = Date.now();
    this.typingStates.set(key, {
      userId,
      channelId,
      startedAt: now,
      expiresAt: now + this.TYPING_TTL_MS,
    });

    // Clean up expired entries periodically or on access
    this.cleanup();
  }

  public isAnyoneTyping(channelId: string, excludeUserIds: string[] = []): boolean {
    this.cleanup();
    const now = Date.now();
    for (const state of this.typingStates.values()) {
      if (state.channelId === channelId && state.expiresAt > now) {
        if (!excludeUserIds.includes(state.userId)) {
          return true;
        }
      }
    }
    return false;
  }

  public getTypingUsers(channelId: string): string[] {
    this.cleanup();
    const now = Date.now();
    const users: string[] = [];
    for (const state of this.typingStates.values()) {
      if (state.channelId === channelId && state.expiresAt > now) {
        users.push(state.userId);
      }
    }
    return users;
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [key, state] of this.typingStates.entries()) {
      if (state.expiresAt <= now) {
        this.typingStates.delete(key);
      }
    }
  }
}

export default TypingMonitor;
