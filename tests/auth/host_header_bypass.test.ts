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
    mockRequest.ip = '127.0.0.1';
    mockRequest.connection = { remoteAddress: '127.0.0.1' } as any;

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
    mockRequest.ip = '127.0.0.1';
    mockRequest.connection = { remoteAddress: '127.0.0.1' } as any;

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

  // IPv6 localhost tests
  it('should ALLOW IPv6 localhost IP (::1)', async () => {
    mockRequest.ip = '::1';
    mockRequest.connection = { remoteAddress: '::1' } as any;

    (mockRequest.get as jest.Mock).mockImplementation(() => undefined);

    await authMiddleware.authenticate(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect((mockRequest as any).user).toBeDefined();
    expect((mockRequest as any).user.role).toBe('admin');
  });

  it('should ALLOW IPv6 mapped localhost (::ffff:127.0.0.1)', async () => {
    mockRequest.ip = '::ffff:127.0.0.1';
    mockRequest.connection = { remoteAddress: '::ffff:127.0.0.1' } as any;

    (mockRequest.get as jest.Mock).mockImplementation(() => undefined);

    await authMiddleware.authenticate(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect((mockRequest as any).user).toBeDefined();
    expect((mockRequest as any).user.role).toBe('admin');
  });

  it('should ALLOW IPv6 localhost Host header [::1]', async () => {
    mockRequest.ip = '::1';
    mockRequest.connection = { remoteAddress: '::1' } as any;

    (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
      if (header === 'host') return '[::1]:3000';
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

  it('should REJECT spoofed Host header from external IPv6', async () => {
    mockRequest.ip = '2001:db8::1'; // External IPv6
    mockRequest.connection = { remoteAddress: '2001:db8::1' } as any;

    (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
      if (header === 'host') return 'localhost';
      return undefined;
    });

    await authMiddleware.authenticate(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect((mockRequest as any).user).toBeUndefined();
    const error = (nextFunction as jest.Mock).mock.calls[0][0];
    expect(error).toBeInstanceOf(AuthenticationError);
  });

  // Additional edge cases
  it('should REJECT when only Origin is spoofed (IP is localhost)', async () => {
    mockRequest.ip = '127.0.0.1';
    mockRequest.connection = { remoteAddress: '127.0.0.1' } as any;

    (mockRequest.get as jest.Mock).mockImplementation((header: string) => {
      if (header === 'host') return 'localhost:3000';
      if (header === 'origin') return 'http://evil.com'; // Spoofed origin
      return undefined;
    });

    await authMiddleware.authenticate(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Should be rejected due to non-localhost Origin
    expect((mockRequest as any).user).toBeUndefined();
    const error = (nextFunction as jest.Mock).mock.calls[0][0];
    expect(error).toBeInstanceOf(AuthenticationError);
  });

  it('should ALLOW localhost bypass with no Host or Origin headers', async () => {
    mockRequest.ip = '127.0.0.1';
    mockRequest.connection = { remoteAddress: '127.0.0.1' } as any;

    (mockRequest.get as jest.Mock).mockImplementation(() => undefined);

    await authMiddleware.authenticate(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    expect((mockRequest as any).user).toBeDefined();
    expect((mockRequest as any).user.role).toBe('admin');
  });

  it('should REJECT bypass when ALLOW_LOCALHOST_ADMIN is false', async () => {
    process.env.ALLOW_LOCALHOST_ADMIN = 'false';
    mockRequest.ip = '127.0.0.1';
    mockRequest.connection = { remoteAddress: '127.0.0.1' } as any;

    (mockRequest.get as jest.Mock).mockImplementation(() => undefined);

    await authMiddleware.authenticate(
      mockRequest as Request,
      mockResponse as Response,
      nextFunction
    );

    // Should require authentication when bypass is disabled
    expect((mockRequest as any).user).toBeUndefined();
    const error = (nextFunction as jest.Mock).mock.calls[0][0];
    expect(error).toBeInstanceOf(AuthenticationError);
  });
});
