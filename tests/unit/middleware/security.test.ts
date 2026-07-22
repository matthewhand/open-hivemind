import { NextFunction, Request, Response } from 'express';
import {
  adminIPGuard,
  getClientIP,
  isTrustedAdminIP,
  securityHeaders,
} from '../../../src/server/middleware/security';

describe('security middleware', () => {
  describe('getClientIP', () => {
    it('should return the client IP from request', () => {
      const req = {
        ip: '192.168.1.1',
        connection: {},
        socket: {},
        headers: {},
      } as unknown as Request;
      expect(getClientIP(req)).toBe('192.168.1.1');
    });
  });

  describe('isTrustedAdminIP', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      // Ensure FORCE_TRUSTED_LOGIN path can work in non-production by default
      process.env.NODE_ENV = 'test';
      delete process.env.FORCE_TRUSTED_LOGIN;
      delete process.env.ALLOW_LOCALHOST_ADMIN;
      delete process.env.ADMIN_IP_WHITELIST;
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return true if FORCE_TRUSTED_LOGIN is true (non-production)', () => {
      process.env.FORCE_TRUSTED_LOGIN = 'true';
      process.env.NODE_ENV = 'development';
      const req = { headers: {} } as Request;
      expect(isTrustedAdminIP(req)).toBe(true);
    });

    it('should ignore FORCE_TRUSTED_LOGIN in production and fall through to normal checks', () => {
      process.env.FORCE_TRUSTED_LOGIN = 'true';
      process.env.NODE_ENV = 'production';
      process.env.ALLOW_LOCALHOST_ADMIN = 'false';
      const req = { ip: '127.0.0.1', headers: {} } as unknown as Request;
      expect(isTrustedAdminIP(req)).toBe(false);
    });

    it('should still allow localhost via whitelist in production even if FORCE_TRUSTED_LOGIN is set', () => {
      process.env.FORCE_TRUSTED_LOGIN = 'true';
      process.env.NODE_ENV = 'production';
      process.env.ALLOW_LOCALHOST_ADMIN = 'true';
      const req = {
        ip: '127.0.0.1',
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;
      expect(isTrustedAdminIP(req)).toBe(true);
    });

    it('should return true for localhost if ALLOW_LOCALHOST_ADMIN is true', () => {
      process.env.ALLOW_LOCALHOST_ADMIN = 'true';
      const req = {
        ip: '127.0.0.1',
        headers: {},
        socket: { remoteAddress: '127.0.0.1' },
      } as unknown as Request;
      expect(isTrustedAdminIP(req)).toBe(true);
    });

    it('should return false for external IP by default', () => {
      process.env.ALLOW_LOCALHOST_ADMIN = 'true';
      const req = {
        ip: '8.8.8.8',
        headers: {},
        socket: { remoteAddress: '8.8.8.8' },
      } as unknown as Request;
      expect(isTrustedAdminIP(req)).toBe(false);
    });
  });

  describe('adminIPGuard', () => {
    const originalEnv = process.env;

    beforeEach(() => {
      process.env = { ...originalEnv };
      process.env.NODE_ENV = 'test';
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should call next() for trusted IP', () => {
      process.env.FORCE_TRUSTED_LOGIN = 'true';
      process.env.NODE_ENV = 'development';
      const req = { headers: {} } as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn() as NextFunction;

      adminIPGuard(req, res, next);
      expect(next).toHaveBeenCalled();
    });

    it('should return 403 when FORCE_TRUSTED_LOGIN is set in production without whitelist', () => {
      process.env.FORCE_TRUSTED_LOGIN = 'true';
      process.env.NODE_ENV = 'production';
      process.env.ALLOW_LOCALHOST_ADMIN = 'false';
      const req = {
        ip: '8.8.8.8',
        headers: {},
        socket: { remoteAddress: '8.8.8.8' },
      } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn() as NextFunction;

      adminIPGuard(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 for untrusted IP', () => {
      process.env.FORCE_TRUSTED_LOGIN = 'false';
      process.env.ALLOW_LOCALHOST_ADMIN = 'false';
      const req = { ip: '8.8.8.8', headers: {} } as unknown as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn() as NextFunction;

      adminIPGuard(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('securityHeaders', () => {
    it('should set security headers and call next', () => {
      const req = {} as Request;
      const res = { setHeader: jest.fn(), removeHeader: jest.fn() } as unknown as Response;
      const next = jest.fn() as NextFunction;

      securityHeaders(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(next).toHaveBeenCalled();
    });

    it('sets the additive cross-origin isolation headers but NOT COEP', () => {
      const req = {} as Request;
      const res = { setHeader: jest.fn(), removeHeader: jest.fn() } as unknown as Response;
      const next = jest.fn() as NextFunction;

      securityHeaders(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('Cross-Origin-Opener-Policy', 'same-origin');
      expect(res.setHeader).toHaveBeenCalledWith('Cross-Origin-Resource-Policy', 'same-origin');
      expect(res.setHeader).toHaveBeenCalledWith('Origin-Agent-Cluster', '?1');
      // COEP: require-corp is intentionally omitted (would break cross-origin fonts/images).
      const headerNames = (res.setHeader as jest.Mock).mock.calls.map((c) => c[0]);
      expect(headerNames).not.toContain('Cross-Origin-Embedder-Policy');
    });
  });
});
