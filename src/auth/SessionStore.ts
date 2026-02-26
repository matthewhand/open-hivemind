import crypto from 'crypto';
import Debug from 'debug';
import TimerRegistry from '@src/utils/TimerRegistry';

const debug = Debug('app:SessionStore');

/**
 * SessionStore handles secure storage and retrieval of session data.
 *
 * Memory-bounded with automatic TTL cleanup to prevent unbounded growth.
 */
export class SessionStore {
  private sessions: Map<
    string,
    { userId: string; token: string; role: string; createdAt: Date; expiresAt: Date }
  >;
  private userIdToSessionIds: Map<string, string[]>;

  // Bounded cache configuration
  private readonly MAX_SESSIONS = parseInt(process.env.SESSION_STORE_MAX_SESSIONS || '10000', 10);
  private readonly CLEANUP_INTERVAL_MS = parseInt(
    process.env.SESSION_STORE_CLEANUP_INTERVAL_MS || '300000',
    10
  ); // 5 minutes
  private cleanupTimerId: string | null = null;

  constructor() {
    this.sessions = new Map();
    this.userIdToSessionIds = new Map();
    debug(
      'SessionStore initialized with MAX_SESSIONS=%d, CLEANUP_INTERVAL_MS=%d',
      this.MAX_SESSIONS,
      this.CLEANUP_INTERVAL_MS
    );
    this.startCleanup();
  }

  /**
   * Store a session
   * @param userId User ID
   * @param token Session token
   * @param role User role
   * @returns Session ID
   */
  public async storeSession(userId: string, token: string, role: string): Promise<string> {
    // Enforce max sessions limit before adding new session
    this.enforceMaxSessions();

    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 hours

    this.sessions.set(sessionId, {
      userId,
      token,
      role,
      createdAt: now,
      expiresAt,
    });

    // Track sessions by user
    if (!this.userIdToSessionIds.has(userId)) {
      this.userIdToSessionIds.set(userId, []);
    }
    this.userIdToSessionIds.get(userId)!.push(sessionId);

    debug('Session stored for user: %s, session ID: %s', userId, sessionId);
    return sessionId;
  }

  /**
   * Validate a session token
   * @param token Session token
   * @returns True if valid
   */
  public async validateToken(token: string): Promise<boolean> {
    for (const [, session] of this.sessions.entries()) {
      if (session.token === token) {
        // Check if session has expired
        if (new Date() > session.expiresAt) {
          await this.invalidateToken(token);
          debug('Session expired for token: %s', token);
          return false;
        }
        return true;
      }
    }
    debug('Session not found for token: %s', token);
    return false;
  }

  /**
   * Invalidate a specific token
   * @param token Token to invalidate
   */
  public async invalidateToken(token: string): Promise<void> {
    for (const [sessionId, session] of this.sessions.entries()) {
      if (session.token === token) {
        this.sessions.delete(sessionId);

        // Remove from user's session list
        const userSessions = this.userIdToSessionIds.get(session.userId) || [];
        const updatedUserSessions = userSessions.filter((id) => id !== sessionId);
        this.userIdToSessionIds.set(session.userId, updatedUserSessions);

        debug('Token invalidated: %s', token);
        return;
      }
    }
  }

  /**
   * Invalidate all sessions for a user
   * @param userId User ID
   */
  public async invalidateUserSessions(userId: string): Promise<void> {
    const sessionIds = this.userIdToSessionIds.get(userId) || [];

    for (const sessionId of sessionIds) {
      const session = this.sessions.get(sessionId);
      if (session && session.userId === userId) {
        this.sessions.delete(sessionId);
      }
    }

    this.userIdToSessionIds.delete(userId);
    debug('All sessions invalidated for user: %s', userId);
  }

  /**
   * Clean expired sessions
   */
  public async cleanExpiredSessions(): Promise<void> {
    const now = new Date();
    const expiredSessionIds: string[] = [];

    for (const [sessionId, session] of this.sessions.entries()) {
      if (now > session.expiresAt) {
        expiredSessionIds.push(sessionId);
      }
    }

    for (const sessionId of expiredSessionIds) {
      const session = this.sessions.get(sessionId);
      if (session) {
        // Remove from user's session list
        const userSessions = this.userIdToSessionIds.get(session.userId) || [];
        const updatedUserSessions = userSessions.filter((id) => id !== sessionId);
        this.userIdToSessionIds.set(session.userId, updatedUserSessions);

        this.sessions.delete(sessionId);
      }
    }

    debug('Cleaned %d expired sessions', expiredSessionIds.length);
  }

  /**
   * Generate a unique session ID
   * @returns Session ID
   */
  private generateSessionId(): string {
    return `sess_${crypto.randomBytes(16).toString('hex')}`;
  }

  /**
   * Start periodic cleanup of expired sessions.
   * Uses TimerRegistry for proper cleanup on shutdown.
   */
  private startCleanup(): void {
    this.cleanupTimerId = TimerRegistry.getInstance().registerInterval(
      'session-store-cleanup',
      () => this.cleanExpiredSessions(),
      this.CLEANUP_INTERVAL_MS,
      'SessionStore periodic cleanup'
    );
  }

  /**
   * Enforce max sessions limit (LRU-style: remove oldest sessions first).
   */
  private enforceMaxSessions(): void {
    if (this.sessions.size >= this.MAX_SESSIONS) {
      // Get all sessions sorted by creation date (oldest first)
      const entries = [...this.sessions.entries()];
      entries.sort((a, b) => a[1].createdAt.getTime() - b[1].createdAt.getTime());

      // Remove oldest sessions (10% of max)
      const toRemove = entries.slice(0, Math.floor(this.MAX_SESSIONS * 0.1));
      for (const [sessionId, session] of toRemove) {
        this.sessions.delete(sessionId);

        // Remove from user's session list
        const userSessions = this.userIdToSessionIds.get(session.userId) || [];
        const updatedUserSessions = userSessions.filter((id) => id !== sessionId);
        if (updatedUserSessions.length === 0) {
          this.userIdToSessionIds.delete(session.userId);
        } else {
          this.userIdToSessionIds.set(session.userId, updatedUserSessions);
        }
      }

      debug('Removed %d old sessions due to limit', toRemove.length);
    }
  }

  /**
   * Get statistics about the session store.
   */
  public getStats(): { totalSessions: number; totalUsers: number; maxSessions: number } {
    return {
      totalSessions: this.sessions.size,
      totalUsers: this.userIdToSessionIds.size,
      maxSessions: this.MAX_SESSIONS,
    };
  }

  /**
   * Shutdown the session store and cleanup resources.
   */
  public shutdown(): void {
    if (this.cleanupTimerId) {
      TimerRegistry.getInstance().clear(this.cleanupTimerId);
      this.cleanupTimerId = null;
    }
    this.sessions.clear();
    this.userIdToSessionIds.clear();
    debug('SessionStore shutdown complete');
  }
}
