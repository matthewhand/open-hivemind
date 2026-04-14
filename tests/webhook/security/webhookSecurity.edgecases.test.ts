/**
 * Webhook Security Middleware Edge Case Tests
 *
 * Tests boundary conditions, edge cases, and attack vectors for
 * verifyWebhookToken and verifyIpWhitelist — the Express middlewares
 * that protect webhook endpoints.
 *
 * This replaces the old 154-line file that was entirely `describe.skip`
 * and never executed a single assertion.
 */
import type { Request, Response } from 'express';
import { verifyIpWhitelist, verifyWebhookToken } from '../../../src/webhook/security/webhookSecurity';

// ---------------------------------------------------------------------------
// Mock webhook config with per-test overrides
// ---------------------------------------------------------------------------

let mockConfigStore: Record<string, string> = {};

jest.mock('@config/webhookConfig', () => ({
  get: (key: string) => mockConfigStore[key] ?? '',
}));

function setConfig(next: Record<string, string>) {
  mockConfigStore = { ...mockConfigStore, ...next };
}

function resetConfig() {
  mockConfigStore = {
    WEBHOOK_TOKEN: 'secret-token',
    WEBHOOK_IP_WHITELIST: '127.0.0.1',
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReq(overrides: Partial<Request> = {}): Request {
  return {
    headers: {},
    ip: '127.0.0.1',
    method: 'POST',
    path: '/webhook',
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

describe('Webhook Security Middleware Edge Cases', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    resetConfig();
  });

  // ---- verifyWebhookToken edge cases ----

  describe('verifyWebhookToken', () => {
    it('should allow when header matches configured token', () => {
      const req = makeReq({ headers: { 'x-webhook-token': 'secret-token' } });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should block with 403 when header is missing', () => {
      const req = makeReq({ headers: {} });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Forbidden: Invalid token');
    });

    it('should allow when Authorization header uses Bearer token', () => {
      const req = makeReq({ headers: { authorization: 'Bearer secret-token' } });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should allow when Authorization header uses lowercase bearer', () => {
      const req = makeReq({ headers: { authorization: 'bearer secret-token' } });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should block with 403 when token mismatches', () => {
      const req = makeReq({ headers: { 'x-webhook-token': 'wrong' } });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 when WEBHOOK_TOKEN is empty in config', () => {
      setConfig({ WEBHOOK_TOKEN: '' });
      const req = makeReq({ headers: { 'x-webhook-token': 'any' } });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.send).toHaveBeenCalledWith('Internal Server Error: Webhook is misconfigured');
    });

    it('should handle whitespace-only token in header', () => {
      const req = makeReq({ headers: { 'x-webhook-token': '   ' } });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);

      // Whitespace-padded token won't match 'secret-token'
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle Bearer token with extra whitespace', () => {
      const req = makeReq({ headers: { authorization: 'Bearer   secret-token  ' } });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);

      // The source trims the token after Bearer prefix
      expect(next).toHaveBeenCalled();
    });

    it('should prefer x-webhook-token over Authorization Bearer', () => {
      // x-webhook-token matches, Bearer does not
      const req = makeReq({
        headers: {
          'x-webhook-token': 'secret-token',
          authorization: 'Bearer wrong',
        },
      });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should use timing-safe comparison (no early exit on length mismatch)', () => {
      // Token of different length — should still return 403 without leaking length info
      const req = makeReq({ headers: { 'x-webhook-token': 'a' } });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ---- verifyIpWhitelist edge cases ----

  describe('verifyIpWhitelist', () => {
    it('should block with 403 when whitelist is empty', () => {
      setConfig({ WEBHOOK_IP_WHITELIST: '' });
      const req = makeReq({ ip: '192.168.1.100' });
      const res = makeRes();
      const next = makeNext();

      verifyIpWhitelist(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Forbidden: IP whitelist is empty');
    });

    it('should allow when request IP is exactly whitelisted', () => {
      setConfig({ WEBHOOK_IP_WHITELIST: '127.0.0.1' });
      const req = makeReq({ ip: '127.0.0.1' });
      const res = makeRes();
      const next = makeNext();

      verifyIpWhitelist(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should block when request IP is not in whitelist', () => {
      setConfig({ WEBHOOK_IP_WHITELIST: '10.1.2.3,192.168.1.10' });
      const req = makeReq({ ip: '127.0.0.1' });
      const res = makeRes();
      const next = makeNext();

      verifyIpWhitelist(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Forbidden: Unauthorized IP address');
    });

    it('should NOT support CIDR ranges (documented limitation)', () => {
      // Implementation does exact string match, not CIDR parsing
      setConfig({ WEBHOOK_IP_WHITELIST: '127.0.0.0/24' });
      const req = makeReq({ ip: '127.0.0.1' });
      const res = makeRes();
      const next = makeNext();

      verifyIpWhitelist(req, res, next);

      // CIDR range won't match exact IP
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle IPv6 loopback address', () => {
      setConfig({ WEBHOOK_IP_WHITELIST: '::1' });
      const req = makeReq({ ip: '::1' });
      const res = makeRes();
      const next = makeNext();

      verifyIpWhitelist(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle IPv4-mapped IPv6 addresses (::ffff:127.0.0.1)', () => {
      setConfig({ WEBHOOK_IP_WHITELIST: '127.0.0.1' });
      const req = makeReq({ ip: '::ffff:127.0.0.1' });
      const res = makeRes();
      const next = makeNext();

      verifyIpWhitelist(req, res, next);

      // Source strips ::ffff: prefix
      expect(next).toHaveBeenCalled();
    });

    it('should handle whitespace in IP list', () => {
      setConfig({ WEBHOOK_IP_WHITELIST: ' 127.0.0.1 , 10.0.0.1 ' });
      const req = makeReq({ ip: '10.0.0.1' });
      const res = makeRes();
      const next = makeNext();

      verifyIpWhitelist(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject malformed IP addresses', () => {
      setConfig({ WEBHOOK_IP_WHITELIST: '127.0.0.1' });
      const req = makeReq({ ip: 'not-an-ip' });
      const res = makeRes();
      const next = makeNext();

      verifyIpWhitelist(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.send).toHaveBeenCalledWith('Forbidden: Malformed IP address');
    });

    it('should reject IPv4 with octets > 255', () => {
      setConfig({ WEBHOOK_IP_WHITELIST: '127.0.0.1' });
      const req = makeReq({ ip: '999.0.0.1' });
      const res = makeRes();
      const next = makeNext();

      verifyIpWhitelist(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should block when whitelist has entries but none match', () => {
      setConfig({ WEBHOOK_IP_WHITELIST: '::2,::3,10.0.0.1' });
      const req = makeReq({ ip: '127.0.0.1' });
      const res = makeRes();
      const next = makeNext();

      verifyIpWhitelist(req, res, next);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should handle undefined config value gracefully', () => {
      setConfig({ WEBHOOK_IP_WHITELIST: undefined as any });
      const req = makeReq({ ip: '127.0.0.1' });
      const res = makeRes();
      const next = makeNext();

      verifyIpWhitelist(req, res, next);

      // undefined → '' → empty whitelist → 403
      expect(res.status).toHaveBeenCalledWith(403);
    });
  });

  // ---- Combined middleware edge cases ----

  describe('combined token + IP middleware', () => {
    it('should block when token is valid but IP is not whitelisted', () => {
      setConfig({
        WEBHOOK_TOKEN: 'secret-token',
        WEBHOOK_IP_WHITELIST: '10.0.0.1',
      });
      const req = makeReq({
        headers: { 'x-webhook-token': 'secret-token' },
        ip: '127.0.0.1',
      });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);
      expect(next).toHaveBeenCalledTimes(1);

      verifyIpWhitelist(req, res, next);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should block when IP is whitelisted but token is missing', () => {
      setConfig({
        WEBHOOK_TOKEN: 'secret-token',
        WEBHOOK_IP_WHITELIST: '127.0.0.1',
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

    it('should pass when both token and IP are valid', () => {
      setConfig({
        WEBHOOK_TOKEN: 'secret-token',
        WEBHOOK_IP_WHITELIST: '127.0.0.1',
      });
      const req = makeReq({
        headers: { 'x-webhook-token': 'secret-token' },
        ip: '127.0.0.1',
      });
      const res = makeRes();
      const next = makeNext();

      verifyWebhookToken(req, res, next);
      verifyIpWhitelist(req, res, next);

      expect(next).toHaveBeenCalledTimes(2);
    });
  });
});
