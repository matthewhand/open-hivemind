import { Request, Response, NextFunction } from 'express';
import { AuthManager } from '../../src/auth/AuthManager';
import { authenticate, requireRole, requirePermission, requireAdmin, optionalAuth } from '../../src/auth/middleware';
import { AuthMiddlewareRequest } from '../../src/auth/types';

// Skip tests on ARM64 Linux due to bcrypt native binary compatibility issues
const isARM64Linux = process.platform === 'linux' && process.arch === 'arm64';
const describeARM64 = isARM64Linux ? describe.skip : describe;

describeARM64('Authentication Middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: jest.Mock;
  let authManager: AuthManager;

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

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.username).toBe('testuser');
      expect(mockReq.permissions).toBeDefined();
    });

    it('should return 401 for missing authorization header', async () => {
      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'Bearer token required in Authorization header'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid token format', async () => {
      mockReq.headers.authorization = 'InvalidFormat';

      await authenticate(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication required',
        message: 'Bearer token required in Authorization header'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for invalid JWT token', async () => {
      mockReq.headers.authorization = 'Bearer invalid-token';

      await authenticate(mockReq as AuthMiddlewareRequest, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Authentication failed',
        message: 'Invalid or expired token'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('requireRole middleware', () => {
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

    it('should call next for user with sufficient role', () => {
      const middleware = requireRole('user');

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should return 403 for user with insufficient role', () => {
      const middleware = requireRole('admin');

      middleware(mockReq, mockRes, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith({
        error: 'Insufficient permissions',
        message: 'Required role: admin, your role: user'
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should return 401 for unauthenticated request', () => {
      const middleware = requireRole('user');
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

      await optionalAuth(mockReq as Request, mockRes as Response, mockNext);

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