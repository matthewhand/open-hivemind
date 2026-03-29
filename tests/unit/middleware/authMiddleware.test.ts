import { NextFunction, Request, Response } from 'express';
import { AuthManager } from '../../../src/auth/AuthManager';
import { AuthMiddleware } from '../../../src/auth/middleware';
import { AuthenticationError, AuthorizationError } from '../../../src/types/errorClasses';

jest.mock('../../../src/auth/AuthManager');

describe('AuthMiddleware RBAC checks', () => {
  let authMiddleware: AuthMiddleware;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  let authManagerMock: any;

  beforeEach(() => {
    authManagerMock = {
      verifyAccessToken: jest.fn(),
      getUser: jest.fn(),
      getUserPermissions: jest.fn(),
    };
    (AuthManager.getInstance as jest.Mock).mockReturnValue(authManagerMock);
    authMiddleware = new AuthMiddleware();
    req = {
      headers: {},
      ip: '1.2.3.4',
      get: jest.fn().mockReturnValue(undefined),
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
    next = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('requireRole', () => {
    it('should throw AuthenticationError if user is not authenticated', () => {
      const middleware = authMiddleware.requireRole('admin');
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(next.mock.calls[0][0].message).toBe('User not authenticated');
    });

    it('should pass if user has the exact required role', () => {
      req.user = { id: '1', username: 'admin_user', role: 'admin' } as any;
      const middleware = authMiddleware.requireRole('admin');
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(); // called without errors
    });

    it('should pass if user has a higher role (admin > bot-manager)', () => {
      req.user = { id: '1', username: 'admin_user', role: 'admin' } as any;
      const middleware = authMiddleware.requireRole('bot-manager');
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(); // called without errors
    });

    it('should throw AuthorizationError if user has a lower role', () => {
      req.user = { id: '2', username: 'normal_user', role: 'user' } as any;
      const middleware = authMiddleware.requireRole('admin');
      middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
      expect(next.mock.calls[0][0].message).toContain('Required role: admin, your role: user');
    });
  });

  describe('requireAdmin', () => {
    it('should pass for admin user', () => {
      req.user = { id: '1', username: 'admin_user', role: 'admin' } as any;
      authMiddleware.requireAdmin(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith();
    });

    it('should fail for non-admin user', () => {
      req.user = { id: '2', username: 'bot_mgr', role: 'bot-manager' } as any;
      authMiddleware.requireAdmin(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledWith(expect.any(AuthorizationError));
    });
  });

  describe('authenticate', () => {
    it('should successfully authenticate with a valid token', async () => {
      const mockUser = { id: 'user-123', username: 'testuser', role: 'user' };
      const mockPayload = { userId: 'user-123', permissions: ['read'] };

      req.headers!.authorization = 'Bearer valid-token';
      authManagerMock.verifyAccessToken.mockReturnValue(mockPayload);
      authManagerMock.getUser.mockReturnValue(mockUser);

      await authMiddleware.authenticate(req as Request, res as Response, next);

      expect(authManagerMock.verifyAccessToken).toHaveBeenCalledWith('valid-token');
      expect(authManagerMock.getUser).toHaveBeenCalledWith('user-123');
      expect((req as any).user).toEqual(mockUser);
      expect((req as any).permissions).toEqual(mockPayload.permissions);
      expect(next).toHaveBeenCalledWith();
    });

    it('should fail if Authorization header is missing', async () => {
      await authMiddleware.authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(next.mock.calls[0][0].message).toContain('Bearer token required');
    });

    it('should fail if Authorization header does not start with Bearer', async () => {
      req.headers!.authorization = 'Basic basic-token';

      await authMiddleware.authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(next.mock.calls[0][0].message).toContain('Bearer token required');
    });

    it('should fail if token is malformed or invalid', async () => {
      req.headers!.authorization = 'Bearer malformed-token';
      authManagerMock.verifyAccessToken.mockImplementation(() => {
        throw new Error('Invalid token');
      });

      await authMiddleware.authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(next.mock.calls[0][0].message).toContain('Invalid or expired token');
    });

    it('should fail if user in token is not found', async () => {
      const mockPayload = { userId: 'non-existent', permissions: [] };
      req.headers!.authorization = 'Bearer valid-token';
      authManagerMock.verifyAccessToken.mockReturnValue(mockPayload);
      authManagerMock.getUser.mockReturnValue(null);

      await authMiddleware.authenticate(req as Request, res as Response, next);

      expect(next).toHaveBeenCalledWith(expect.any(AuthenticationError));
      expect(next.mock.calls[0][0].message).toContain('User not found');
    });

    it('should bypass authentication for localhost if enabled', async () => {
      process.env.ALLOW_LOCALHOST_ADMIN = 'true';
      req.ip = '127.0.0.1';
      (req.get as jest.Mock).mockReturnValue('localhost');

      await authMiddleware.authenticate(req as Request, res as Response, next);

      expect((req as any).user.username).toBe('localhost-admin');
      expect(next).toHaveBeenCalledWith();

      delete process.env.ALLOW_LOCALHOST_ADMIN;
    });
  });
});
