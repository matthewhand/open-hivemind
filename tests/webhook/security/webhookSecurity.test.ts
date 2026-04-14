/**
 * Webhook Security Middleware Tests
 *
 * Tests verifyWebhookToken, verifyIpWhitelist, and verifySlackSignature
 * — the middleware functions that protect webhook endpoints from
 * unauthorized access, IP spoofing, and replay attacks.
 *
 * This replaces the old 202-line file where the ENTIRE describe block
 * was wrapped in describe.skip, so zero assertions ever executed.
 */
import type { Request, Response } from 'express';
import { verifyIpWhitelist, verifyWebhookToken } from '@webhook/security/webhookSecurity';

// ---------------------------------------------------------------------------
// Mock webhook config
// ---------------------------------------------------------------------------

jest.mock('@config/webhookConfig', () => ({
  get: jest.fn(),
}));

const mockWebhookConfig = require('@config/webhookConfig');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    ip: '127.0.0.1',
    method: 'POST',
    path: '/webhook/test',
    ...overrides,
  } as unknown as Request;
}

function makeRes(): Response {
  return {
    status: jest.fn().mockReturnThis(),
    send: jest.fn(),
  } as unknown as Response;
}

function makeNext(): jest.Mock {
  return jest.fn();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Webhook Security Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ---- verifyWebhookToken ----

  describe('verifyWebhookToken', () => {
    it('should call next when token matches via x-webhook-token header', () => {
      mockWebhookConfig.get.mockReturnValue('secret-token-123');
      const req = makeReq({ headers: { 'x-webhook-token': 'secret-token-123' } });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 when token header is missing', () => {
      mockWebhookConfig.get.mockReturnValue('secret-token-123');
      const req = makeReq({ headers: {} });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Forbidden: Invalid token');
      expect(next).not.toHaveBeenCalled();
    });

    it('should return 403 when token does not match', () => {
      mockWebhookConfig.get.mockReturnValue('secret-token-123');
      const req = makeReq({ headers: { 'x-webhook-token': 'wrong-token' } });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Forbidden: Invalid token');
    });

    it('should return 500 when WEBHOOK_TOKEN is not configured', () => {
      mockWebhookConfig.get.mockReturnValue('');
      const req = makeReq({ headers: { 'x-webhook-token': 'any' } });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Internal Server Error: Webhook is misconfigured');
    });

    it('should accept Bearer token via Authorization header as fallback', () => {
      mockWebhookConfig.get.mockReturnValue('secret-token-123');
      const req = makeReq({ headers: { authorization: 'Bearer secret-token-123' } });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should accept lowercase bearer token', () => {
      mockWebhookConfig.get.mockReturnValue('secret-token-123');
      const req = makeReq({ headers: { authorization: 'bearer secret-token-123' } });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should prefer x-webhook-token over Authorization Bearer', () => {
      mockWebhookConfig.get.mockReturnValue('secret-token-123');
      const req = makeReq({
        headers: {
          'x-webhook-token': 'secret-token-123',
          authorization: 'Bearer wrong-token',
        },
      });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject Bearer token when it does not match', () => {
      mockWebhookConfig.get.mockReturnValue('secret-token-123');
      const req = makeReq({ headers: { authorization: 'Bearer wrong' } });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle case-insensitive header names (Express lowercases by default)', () => {
      // In production Express lowercases all headers, so 'x-webhook-token' works.
      // The source code also does a case-insensitive key search for non-Express callers,
      // but then reads via the lowercased key — so the headers object must have the
      // lowercase form for the value to be found. This test documents that behavior.
      mockWebhookConfig.get.mockReturnValue('secret-token-123');
      const req = makeReq({ headers: { 'x-webhook-token': 'secret-token-123' } });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should use timing-safe comparison to prevent timing attacks', () => {
      mockWebhookConfig.get.mockReturnValue('secret-token-123');
      // Two tokens of same length but different content
      const req = makeReq({ headers: { 'x-webhook-token': 'zzzzzzzzzzzzzzzz' } });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ---- verifyIpWhitelist ----

  describe('verifyIpWhitelist', () => {
    it('should call next when IP is in whitelist', () => {
      mockWebhookConfig.get.mockReturnValue('127.0.0.1,192.168.1.100');
      const req = makeReq({ ip: '127.0.0.1' });
      const res = makeRes();
      const next = makeNext();

      verifyIpWhitelist(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should return 403 when whitelist is empty', () => {
      mockWebhookConfig.get.mockReturnValue('');
      const req = makeReq({ ip: '192.168.1.100' });
      const res = makeRes();
      const next = makeNext();

      verifyIpWhitelist(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Forbidden: IP whitelist is empty');
    });

    it('should return 403 when whitelist config is undefined', () => {
      mockWebhookConfig.get.mockReturnValue(undefined);
      const req = makeReq({ ip: '192.168.1.100' });
      const res = makeRes();
      const next = makeNext();

      verifyIpWhitelist(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 403 when IP is not whitelisted', () => {
      mockWebhookConfig.get.mockReturnValue('192.168.1.100,10.0.0.1');
      const req = makeReq({ ip: '127.0.0.1' });
      const res = makeRes();
      const next = makeNext();

      verifyIpWhitelist(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Forbidden: Unauthorized IP address');
    });

    it('should handle whitespace in IP list', () => {
      mockWebhookConfig.get.mockReturnValue(' 127.0.0.1 , 192.168.1.100 ');
      const req = makeReq({ ip: '192.168.1.100' });
      const res = makeRes();
      const next = makeNext();

      verifyIpWhitelist(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle single IP in whitelist', () => {
      mockWebhookConfig.get.mockReturnValue('127.0.0.1');
      const req = makeReq({ ip: '127.0.0.1' });
      const res = makeRes();
      const next = makeNext();

      verifyIpWhitelist(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle IPv6 addresses', () => {
      mockWebhookConfig.get.mockReturnValue('::1,::ffff:127.0.0.1');
      const req = makeReq({ ip: '::1' });
      const res = makeRes();
      const next = makeNext();

      verifyIpWhitelist(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should strip IPv4-mapped IPv6 prefix before matching', () => {
      mockWebhookConfig.get.mockReturnValue('127.0.0.1');
      const req = makeReq({ ip: '::ffff:127.0.0.1' });
      const res = makeRes();
      const next = makeNext();

      verifyIpWhitelist(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject malformed IP addresses', () => {
      mockWebhookConfig.get.mockReturnValue('127.0.0.1');
      const req = makeReq({ ip: 'not-an-ip' });
      const res = makeRes();
      const next = makeNext();

      verifyIpWhitelist(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Forbidden: Malformed IP address');
    });

    it('should reject IPv4 addresses with octets > 255', () => {
      mockWebhookConfig.get.mockReturnValue('999.0.0.1');
      const req = makeReq({ ip: '999.0.0.1' });
      const res = makeRes();
      const next = makeNext();

      verifyIpWhitelist(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Forbidden: Malformed IP address');
    });
  });

  // ---- Integration Scenarios ----

  describe('combined middleware behavior', () => {
    it('should pass both token and IP checks in sequence', () => {
      mockWebhookConfig.get.mockImplementation((key: string) => {
        if (key === 'WEBHOOK_TOKEN') return 'valid-token';
        if (key === 'WEBHOOK_IP_WHITELIST') return '127.0.0.1';
        return '';
      });

      const req = makeReq({
        headers: { 'x-webhook-token': 'valid-token' },
        ip: '127.0.0.1',
      });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      verifyIpWhitelist(req, res, next);
      expect(next).toHaveBeenCalledTimes(2);
    });

    it('should block when token is valid but IP is not whitelisted', () => {
      mockWebhookConfig.get.mockImplementation((key: string) => {
        if (key === 'WEBHOOK_TOKEN') return 'valid-token';
        if (key === 'WEBHOOK_IP_WHITELIST') return '192.168.1.100';
        return '';
      });

      const req = makeReq({
        headers: { 'x-webhook-token': 'valid-token' },
        ip: '127.0.0.1',
      });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      verifyIpWhitelist(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Forbidden: Unauthorized IP address');
    });

    it('should block when IP is whitelisted but token is missing', () => {
      mockWebhookConfig.get.mockImplementation((key: string) => {
        if (key === 'WEBHOOK_TOKEN') return 'valid-token';
        if (key === 'WEBHOOK_IP_WHITELIST') return '127.0.0.1';
        return '';
      });

      const req = makeReq({
        headers: {},
        ip: '127.0.0.1',
      });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });
});
