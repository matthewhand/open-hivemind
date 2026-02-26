import { NextFunction, Request, Response } from 'express';
import { AuthManager } from '../../src/auth/AuthManager';
import { AuthMiddleware } from '../../src/auth/middleware';
import { AuthenticationError } from '../../src/types/errorClasses';

describe('AuthMiddleware Security Vulnerability', () => {
  let authMiddleware: AuthMiddleware;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let nextFunction: NextFunction;
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.ALLOW_LOCALHOST_ADMIN = 'true';

    // Reset AuthManager instance
    (AuthManager as any).instance = null;

    authMiddleware = new AuthMiddleware();
    mockRequest = {
      headers: {},
      ip: '123.123.123.123', // External IP
      connection: { remoteAddress: '123.123.123.123' } as any,
      get: jest.fn(),
      method: 'GET',
      path: '/api/admin/sensitive',
    };
    mockResponse = {};
    nextFunction = jest.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('should REJECT authentication bypass via Host header manipulation', async () => {
    // Mock Host header to be a domain that *contains* localhost but is NOT localhost
    (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
      if (header === 'host') return 'localhost.evil.com';
      return undefined;
    });

    await authMiddleware.authenticate(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Should NOT be authenticated as admin
    expect((mockRequest as any).user).toBeUndefined();

    // Should return error (because no token provided and localhost check failed)
    expect(nextFunction).toHaveBeenCalledTimes(1);
    const error = (nextFunction as jest.Mock).mock.calls[0][0];
    expect(error).toBeInstanceOf(AuthenticationError);
  });

  it('should REJECT authentication bypass via Origin header manipulation', async () => {
    // Mock Host to be safe, but Origin to be malicious
    (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
      if (header === 'host') return 'example.com';
      if (header === 'origin') return 'http://evil-localhost.com';
      return undefined;
    });

    await authMiddleware.authenticate(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect((mockRequest as any).user).toBeUndefined();
    expect(nextFunction).toHaveBeenCalledTimes(1);
    const error = (nextFunction as jest.Mock).mock.calls[0][0];
    expect(error).toBeInstanceOf(AuthenticationError);
  });

  it('should ALLOW valid localhost Host header', async () => {
    // Mock Host to be valid localhost
    (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
      if (header === 'host') return 'localhost:3000';
      return undefined;
    });

    await authMiddleware.authenticate(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Should be authenticated as admin
    expect((mockRequest as any).user).toBeDefined();
    expect((mockRequest as any).user.role).toBe('admin');
    expect(nextFunction).toHaveBeenCalledWith();
  });

  it('should ALLOW valid localhost IP Host header', async () => {
    // Mock Host to be valid IP
    (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
      if (header === 'host') return '127.0.0.1:8080';
      return undefined;
    });

    await authMiddleware.authenticate(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect((mockRequest as any).user).toBeDefined();
    expect((mockRequest as any).user.role).toBe('admin');
  });
});
