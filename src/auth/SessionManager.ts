import Debug from 'debug';
import type { NextFunction, Request, Response } from 'express';
import { AuthManager } from './AuthManager';
import { SessionStore } from './SessionStore';

const debug = Debug('app:SessionManager');

/**
 * SessionManager handles secure session management with token rotation
 */
export class SessionManager {
  private static instance: SessionManager;
  private sessionStore: SessionStore;
  private authManager: AuthManager;

  private constructor() {
    this.sessionStore = new SessionStore();
    this.authManager = AuthManager.getInstance();
    debug('SessionManager initialized');
  }

  public static getInstance(): SessionManager {
    if (!SessionManager.instance) {
      SessionManager.instance = new SessionManager();
    }
    return SessionManager.instance;
  }

  /**
   * Create a new session with token rotation
   * @param userId User ID
   * @param role User role
   * @returns Session token
   */
  public async createSession(userId: string, role: string): Promise<string> {
    // Invalidate any existing sessions for this user
    await this.invalidateUserSessions(userId);

    // Get user from AuthManager to ensure valid data for token generation
    const user = this.authManager.getUser(userId);
    if (!user) {
      throw new Error(`User not found: ${userId}`);
    }

    // Create new access token
    const accessToken = this.authManager.generateAccessToken(user);

    // Store session in secure storage
    await this.sessionStore.storeSession(userId, accessToken, role);

    debug('Session created for user: %s', userId);
    return accessToken;
  }

  /**
   * Invalidate all sessions for a user
   * @param userId User ID
   */
  public async invalidateUserSessions(userId: string): Promise<void> {
    await this.sessionStore.invalidateUserSessions(userId);
    debug('Invalidated all sessions for user: %s', userId);
  }

  /**
   * Rotate session token
   * @param oldToken Old token
   * @returns New token
   */
  public async rotateToken(oldToken: string): Promise<string> {
    const payload = this.authManager.verifyAccessToken(oldToken);
    if (!payload) {
      throw new Error('Invalid token');
    }

    // Invalidate old token
    await this.sessionStore.invalidateToken(oldToken);

    // Get user
    const user = this.authManager.getUser(payload.userId);
    if (!user) {
      throw new Error('User not found during token rotation');
    }

    // Create new token
    const newToken = this.authManager.generateAccessToken(user);

    // Store new session
    await this.sessionStore.storeSession(payload.userId, newToken, payload.role);

    debug('Token rotated for user: %s', payload.userId);
    return newToken;
  }

  /**
   * Validate session
   * @param token Session token
   * @returns Validation result
   */
  public async validateSession(token: string): Promise<boolean> {
    const isValid = await this.sessionStore.validateToken(token);
    debug('Session validation result: %s', isValid);
    return isValid;
  }

  /**
   * Session middleware for Express
   */
  public sessionMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      const authHeader = req.headers['authorization'];
      const token = authHeader && authHeader.split(' ')[1];

      if (token) {
        try {
          const isValid = await this.validateSession(token);
          if (!isValid) {
            res.status(401).json({ error: 'Session expired or invalid' });
            return;
          }
        } catch (error) {
          debug('Session validation error: %s', error);
          res.status(401).json({ error: 'Session validation failed' });
          return;
        }
      }

      next();
    };
  }
}
