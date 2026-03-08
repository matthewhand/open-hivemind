import { Request, Response, NextFunction } from 'express';
import { AuthMiddleware } from '../../../src/auth/middleware';
import { AuthenticationError, AuthorizationError } from '../../../src/types/errorClasses';
import { AuthManager } from '../../../src/auth/AuthManager';

jest.mock('../../../src/auth/AuthManager');

describe('AuthMiddleware RBAC checks', () => {
  let authMiddleware: AuthMiddleware;
  let req: Partial<Request>;
  let res: Partial<Response>;
  let next: jest.Mock;

  beforeEach(() => {
    (AuthManager.getInstance as jest.Mock).mockReturnValue({
      verifyAccessToken: jest.fn(),
      getUser: jest.fn(),
      getUserPermissions: jest.fn(),
    });
    authMiddleware = new AuthMiddleware();
    req = { headers: {} };
    res = {};
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
});
