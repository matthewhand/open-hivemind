/**
 * Tests for SessionManager
 * Mocks AuthManager and SessionStore to isolate session management logic.
 */

const mockStoreSession = jest.fn().mockResolvedValue('sess-id');
const mockValidateToken = jest.fn().mockResolvedValue(true);
const mockInvalidateToken = jest.fn().mockResolvedValue(undefined);
const mockInvalidateUserSessions = jest.fn().mockResolvedValue(undefined);

jest.mock('@src/auth/SessionStore', () => ({
  SessionStore: jest.fn().mockImplementation(() => ({
    storeSession: mockStoreSession,
    validateToken: mockValidateToken,
    invalidateToken: mockInvalidateToken,
    invalidateUserSessions: mockInvalidateUserSessions,
  })),
}));

const mockGetUser = jest.fn();
const mockGenerateAccessToken = jest.fn().mockReturnValue('new-access-token');
const mockVerifyAccessToken = jest.fn();

jest.mock('@src/auth/AuthManager', () => ({
  AuthManager: {
    getInstance: () => ({
      getUser: mockGetUser,
      generateAccessToken: mockGenerateAccessToken,
      verifyAccessToken: mockVerifyAccessToken,
    }),
  },
}));

import { SessionManager } from '@src/auth/SessionManager';

describe('SessionManager', () => {
  let manager: SessionManager;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset singleton for fresh instance
    (SessionManager as any).instance = undefined;
    manager = SessionManager.getInstance();
  });

  describe('getInstance', () => {
    it('returns a singleton instance', () => {
      const instance1 = SessionManager.getInstance();
      const instance2 = SessionManager.getInstance();
      expect(instance1).toBe(instance2);
    });
  });

  describe('createSession', () => {
    it('creates a session and returns an access token', async () => {
      mockGetUser.mockReturnValue({ id: 'user1', role: 'admin' });

      const token = await manager.createSession('user1', 'admin');

      expect(token).toBe('new-access-token');
      expect(mockInvalidateUserSessions).toHaveBeenCalledWith('user1');
      expect(mockGetUser).toHaveBeenCalledWith('user1');
      expect(mockStoreSession).toHaveBeenCalledWith('user1', 'new-access-token', 'admin');
    });

    it('throws when user is not found', async () => {
      mockGetUser.mockReturnValue(null);

      await expect(manager.createSession('unknown', 'user')).rejects.toThrow('User not found');
    });
  });

  describe('validateSession', () => {
    it('returns true for a valid session', async () => {
      mockValidateToken.mockResolvedValue(true);
      const result = await manager.validateSession('valid-token');
      expect(result).toBe(true);
    });

    it('returns false for an invalid session', async () => {
      mockValidateToken.mockResolvedValue(false);
      const result = await manager.validateSession('bad-token');
      expect(result).toBe(false);
    });
  });

  describe('rotateToken', () => {
    it('rotates a valid token and returns a new one', async () => {
      mockVerifyAccessToken.mockReturnValue({ userId: 'user1', role: 'admin' });
      mockGetUser.mockReturnValue({ id: 'user1', role: 'admin' });

      const newToken = await manager.rotateToken('old-token');

      expect(newToken).toBe('new-access-token');
      expect(mockInvalidateToken).toHaveBeenCalledWith('old-token');
      expect(mockStoreSession).toHaveBeenCalled();
    });

    it('throws when old token is invalid', async () => {
      mockVerifyAccessToken.mockReturnValue(null);
      await expect(manager.rotateToken('invalid-token')).rejects.toThrow('Invalid token');
    });

    it('throws when user not found during rotation', async () => {
      mockVerifyAccessToken.mockReturnValue({ userId: 'user1', role: 'admin' });
      mockGetUser.mockReturnValue(null);
      await expect(manager.rotateToken('old-token')).rejects.toThrow(
        'User not found during token rotation'
      );
    });
  });

  describe('invalidateUserSessions', () => {
    it('delegates to session store', async () => {
      await manager.invalidateUserSessions('user1');
      expect(mockInvalidateUserSessions).toHaveBeenCalledWith('user1');
    });
  });
});
