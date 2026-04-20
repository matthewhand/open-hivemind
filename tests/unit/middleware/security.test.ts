import { Request, Response, NextFunction } from 'express';
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
    });

    afterAll(() => {
      process.env = originalEnv;
    });

    it('should return true if FORCE_TRUSTED_LOGIN is true', () => {
      process.env.FORCE_TRUSTED_LOGIN = 'true';
      const req = { headers: {} } as Request;
      expect(isTrustedAdminIP(req)).toBe(true);
    });

    it('should return true for localhost if ALLOW_LOCALHOST_ADMIN is true', () => {
      process.env.ALLOW_LOCALHOST_ADMIN = 'true';
      const req = { ip: '127.0.0.1', headers: {} } as unknown as Request;
      expect(isTrustedAdminIP(req)).toBe(true);
    });

    it('should return false for external IP by default', () => {
      process.env.ALLOW_LOCALHOST_ADMIN = 'true';
      const req = { ip: '8.8.8.8', headers: {} } as unknown as Request;
      expect(isTrustedAdminIP(req)).toBe(false);
    });
  });

  describe('adminIPGuard', () => {
    it('should call next() for trusted IP', () => {
      process.env.FORCE_TRUSTED_LOGIN = 'true';
      const req = { headers: {} } as Request;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn() } as unknown as Response;
      const next = jest.fn() as NextFunction;

      adminIPGuard(req, res, next);
      expect(next).toHaveBeenCalled();
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
      const res = { setHeader: jest.fn() } as unknown as Response;
      const next = jest.fn() as NextFunction;

      securityHeaders(req, res, next);

      expect(res.setHeader).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(res.setHeader).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
      expect(next).toHaveBeenCalled();
    });
  });
});
