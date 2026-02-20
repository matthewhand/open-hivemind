import { Request, Response } from 'express';
import { csrfProtection, csrfTokenHandler, generateCsrfToken, csrfConfig } from '../../../src/server/middleware/csrf';

describe('CSRF Middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {
      headers: {},
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as any,
      get: jest.fn((header: string) => mockReq.headers[header.toLowerCase()] as string),
      cookies: {},
      method: 'POST',
    };
    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      cookie: jest.fn().mockReturnThis(),
      locals: {},
    };
    mockNext = jest.fn();
  });

  describe('generateCsrfToken', () => {
    it('should generate a token', () => {
      const token = generateCsrfToken();

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.length).toBeGreaterThan(32);
    });

    it('should generate different tokens each time', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();

      expect(token1).not.toBe(token2);
    });
  });

  describe('csrfConfig', () => {
    it('should have default configuration', () => {
      expect(csrfConfig.tokenLength).toBe(32);
      expect(csrfConfig.cookieName).toBe('_csrf');
      expect(csrfConfig.headerName).toBe('x-csrf-token');
      expect(csrfConfig.tokenExpiration).toBe(24 * 60 * 60 * 1000);
    });
  });

  describe('csrfTokenHandler', () => {
    it('should return a CSRF token', () => {
      mockReq.ip = '127.0.0.1';
      mockReq.headers['user-agent'] = 'test-user-agent';

      csrfTokenHandler(mockReq as Request, mockRes as Response);

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          csrfToken: expect.any(String),
          expiresIn: expect.any(Number),
        })
      );
      expect(mockRes.cookie).toHaveBeenCalledWith(
        '_csrf',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'strict',
        })
      );
    });
  });

  describe('csrfProtection middleware', () => {
    it('should skip CSRF check for GET requests', () => {
      mockReq.method = 'GET';

      csrfProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should skip CSRF check for HEAD requests', () => {
      mockReq.method = 'HEAD';

      csrfProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should skip CSRF check for OPTIONS requests', () => {
      mockReq.method = 'OPTIONS';

      csrfProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });

    it('should reject POST request without CSRF token', () => {
      mockReq.method = 'POST';
      mockReq.headers['user-agent'] = 'test-user-agent';

      csrfProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'CSRF Token Required',
          code: 'CSRF_TOKEN_MISSING',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject PUT request without CSRF token', () => {
      mockReq.method = 'PUT';
      mockReq.headers['user-agent'] = 'test-user-agent';

      csrfProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject DELETE request without CSRF token', () => {
      mockReq.method = 'DELETE';
      mockReq.headers['user-agent'] = 'test-user-agent';

      csrfProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should reject request with invalid CSRF token', () => {
      mockReq.method = 'POST';
      mockReq.headers['x-csrf-token'] = 'invalid-token';
      mockReq.headers['user-agent'] = 'test-user-agent';

      csrfProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: 'Invalid CSRF Token',
          code: 'CSRF_TOKEN_INVALID',
        })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should accept request with valid CSRF token', () => {
      // First generate a token using the handler
      mockReq.ip = '127.0.0.1';
      mockReq.headers['user-agent'] = 'test-user-agent';
      
      csrfTokenHandler(mockReq as Request, mockRes as Response);
      
      // Get the token from the mock response
      const callArgs = (mockRes.json as jest.Mock).mock.calls[0][0];
      const token = callArgs.csrfToken;

      // Reset mocks
      (mockRes.status as jest.Mock).mockClear();
      (mockRes.json as jest.Mock).mockClear();
      mockNext.mockClear();

      // Now test the protection middleware with the token
      mockReq.method = 'POST';
      mockReq.headers['x-csrf-token'] = token;

      csrfProtection(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockRes.status).not.toHaveBeenCalled();
    });
  });
});
