import { Request, Response, NextFunction } from 'express';
import { AuthManager } from '../../src/auth/AuthManager';
import { authenticate, requireRole, requirePermission, requireAdmin, optionalAuth } from '../../src/auth/middleware';
import { AuthMiddlewareRequest } from '../../src/auth/types';

// Mock jsonwebtoken at the top level
jest.mock('jsonwebtoken', () => ({
  sign: jest.fn(() => 'mock-jwt-token'),
  verify: jest.fn(() => ({ userId: 'test-user-id', permissions: ['read'] })),
}));

// Mock bcrypt to avoid native binary issues on ARM64 Linux
jest.mock('bcrypt', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
  compare: jest.fn().mockResolvedValue(true),
  genSalt: jest.fn().mockResolvedValue('$2b$10$salt'),
}));

describe('Authentication Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;
  let authManager: AuthManager;

  beforeEach(() => {
    // Reset singleton instance for each test
    (AuthManager as any).instance = null;
    authManager = AuthManager.getInstance();
  });

  beforeEach(() => {
    // Reset singleton instance
    (AuthManager as any).instance = null;
    authManager = AuthManager.getInstance();

    mockReq = {
      headers: {},
      user: null,
      permissions: null
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis()
    };

    mockNext = jest.fn();
  });

  describe('authenticate middleware', () => {
    it('should call next for valid JWT token', async () => {
      // Mock a user for the test
      const mockUser = {
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      // Mock the auth manager methods
      jest.spyOn(authManager, 'verifyAccessToken').mockReturnValue({ userId: 'test-user-id', permissions: ['read'] });
      jest.spyOn(authManager, 'getUser').mockReturnValue(mockUser as any);
      jest.spyOn(authManager, 'getUserPermissions').mockReturnValue(['read']);

      mockReq.headers.authorization = 'Bearer valid-jwt-token';

      await authenticate(mockReq as AuthMiddlewareRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.username).toBe('testuser');
      expect(mockReq.permissions).toBeDefined();
    });

    const authErrorCases = [
      {
        desc: 'should return 401 for missing authorization header',
        setup: () => {},
        expectedStatus: 401,
        expectedJson: {
          error: 'Authentication required',
          message: 'Bearer token required in Authorization header'
        }
      },
      {
        desc: 'should return 401 for invalid token format',
        setup: () => { mockReq.headers.authorization = 'InvalidFormat'; },
        expectedStatus: 401,
        expectedJson: {
          error: 'Authentication required',
          message: 'Bearer token required in Authorization header'
        }
      },
      {
        desc: 'should return 401 for invalid JWT token',
        setup: () => { mockReq.headers.authorization = 'Bearer invalid-token'; },
        expectedStatus: 401,
        expectedJson: {
          error: 'Authentication failed',
          message: 'Invalid or expired token'
        }
      }
    ];

    it.each(authErrorCases)('$desc', async ({ setup, expectedStatus, expectedJson }) => {
      setup();

      try {
        await authenticate(mockReq as AuthMiddlewareRequest, mockRes as Response, mockNext);
        fail('Expected authentication to throw an error');
      } catch (error: any) {
        expect(mockNext).not.toHaveBeenCalled();
        expect(error.statusCode).toBe(expectedStatus);
        expect(error.message).toContain(expectedJson.error);
      }
    });
  });

  describe('requireRole middleware', () => {
    beforeEach(() => {
      // Set up authenticated user directly
      const mockUser = {
        id: 'test-user-id',
        username: 'testuser',
        email: 'test@example.com',
        role: 'user',
        isActive: true,
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString()
      };

      (mockReq as AuthMiddlewareRequest).user = mockUser;
      (mockReq as AuthMiddlewareRequest).permissions = ['read'];
    });

    it('should call next for user with sufficient role', () => {
      const middleware = requireRole('user');

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    const roleErrorCases = [
      {
        desc: 'should return 403 for user with insufficient role',
        setup: () => {},
        middleware: () => requireRole('admin'),
        expectedStatus: 403,
        expectedJson: {
          error: 'Insufficient permissions',
          message: 'Required role: admin, your role: user'
        }
      },
      {
        desc: 'should return 401 for unauthenticated request',
        setup: () => { mockReq.user = null; },
        middleware: () => requireRole('user'),
        expectedStatus: 401,
        expectedJson: {
          error: 'Authentication required',
          message: 'User not authenticated'
        }
      }
    ];

    it.each(roleErrorCases)('$desc', ({ setup, middleware, expectedStatus, expectedJson }) => {
      setup();
      const mw = middleware();
      mw(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(expectedStatus);
      expect(mockRes.json).toHaveBeenCalledWith(expectedJson);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requirePermission middleware', () => {
    beforeEach(async () => {
      // Set up authenticated user
      await authManager.register({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      const loginResult = await authManager.login({
        username: 'testuser',
        password: 'password123'
      });

      mockReq.headers.authorization = `Bearer ${loginResult.accessToken}`;
      await authenticate(mockReq as AuthMiddlewareRequest, mockRes as Response, mockNext);
      mockNext.mockClear(); // Reset next call
    });

    it('should call next for user with required permission', () => {
      const middleware = requirePermission('config:read');

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 for user without required permission', () => {
      const middleware = requirePermission('users:write');

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        message: 'Required permission: users:write'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated request', () => {
      const middleware = requirePermission('config:read');
      mockReq.user = null;

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'User not authenticated'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireAdmin middleware', () => {
    it('should function as admin role requirement', async () => {
      // Set up admin user
      const loginResult = await authManager.login({
        username: 'admin',
        password: 'admin123!'
      });

      mockReq.headers.authorization = `Bearer ${loginResult.accessToken}`;
      await authenticate(mockReq as AuthMiddlewareRequest, mockRes as Response, mockNext);
      mockNext.mockClear();

      // Test requireAdmin middleware
      requireAdmin(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  describe('optionalAuth middleware', () => {
    it('should call next and attach user for valid token', async () => {
      // Register and login a user to get a token
      await authManager.register({
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123'
      });

      const loginResult = await authManager.login({
        username: 'testuser',
        password: 'password123'
      });

      mockReq.headers.authorization = `Bearer ${loginResult.accessToken}`;

      await optionalAuth(mockReq as AuthMiddlewareRequest, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.username).toBe('testuser');
    });

    it('should call next without user for missing token', async () => {
      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
    });

    it('should call next without user for invalid token', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
    });

    it('should call next without user for invalid token format', async () => {
      mockReq.headers.authorization = 'InvalidFormat';

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeUndefined();
    });
  });

  describe('Integration with admin user', () => {
    it('should allow admin user to access admin routes', async () => {
      // Login as admin
      const loginResult = await authManager.login({
        username: 'admin',
        password: 'admin123!'
      });

      mockReq.headers.authorization = `Bearer ${loginResult.accessToken}`;
      await authenticate(mockReq as Request, mockRes as Response, mockNext);
      mockNext.mockClear();

      // Test admin middleware
      const adminMiddleware = requireRole('admin');
      adminMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user.role).toBe('admin');
    });

    it('should allow admin user to access any permission', async () => {
      // Login as admin
      const loginResult = await authManager.login({
        username: 'admin',
        password: 'admin123!'
      });

      mockReq.headers.authorization = `Bearer ${loginResult.accessToken}`;
      await authenticate(mockReq as Request, mockRes as Response, mockNext);
      mockNext.mockClear();

      // Test permission middleware
      const permissionMiddleware = requirePermission('system:admin');
      permissionMiddleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });
});