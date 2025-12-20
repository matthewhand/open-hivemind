import Debug from 'debug';

const debug = Debug('app:SessionStore');

/**
 * SessionStore handles secure storage and retrieval of session data
 */
export class SessionStore {
  private sessions: Map<string, { userId: string; token: string; role: string; createdAt: Date; expiresAt: Date }>;
  private userIdToSessionIds: Map<string, string[]>;

  constructor() {
    this.sessions = new Map();
    this.userIdToSessionIds = new Map();
    debug('SessionStore initialized');
  }

  /**
   * Store a session
   * @param userId User ID
   * @param token Session token
   * @param role User role
   * @returns Session ID
   */
  public async storeSession(userId: string, token: string, role: string): Promise<string> {
    const sessionId = this.generateSessionId();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + (24 * 60 * 60 * 1000)); // 24 hours

    this.sessions.set(sessionId, {
      userId,
      token,
      role,
      createdAt: now,
      expiresAt
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
        const updatedUserSessions = userSessions.filter(id => id !== sessionId);
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
        const updatedUserSessions = userSessions.filter(id => id !== sessionId);
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
    return `sess_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}
