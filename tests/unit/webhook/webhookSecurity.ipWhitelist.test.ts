import type { NextFunction, Request, Response } from 'express';
import webhookConfig from '@config/webhookConfig';
import { verifyIpWhitelist } from '@webhook/security/webhookSecurity';

/**
 * Tests for proxy-aware client IP resolution + CIDR whitelist matching in
 * verifyIpWhitelist.
 */
describe('verifyIpWhitelist - CIDR + proxy-aware', () => {
  const originalWhitelist = webhookConfig.get('WEBHOOK_IP_WHITELIST');
  const originalTrustedProxies = process.env.TRUSTED_PROXIES;

  afterEach(() => {
    webhookConfig.set('WEBHOOK_IP_WHITELIST', originalWhitelist);
    if (originalTrustedProxies === undefined) {
      delete process.env.TRUSTED_PROXIES;
    } else {
      process.env.TRUSTED_PROXIES = originalTrustedProxies;
    }
    jest.clearAllMocks();
  });

  const buildRes = () => {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res as Response);
    res.send = jest.fn().mockReturnValue(res as Response);
    return res as Response;
  };

  const run = (req: Partial<Request>) => {
    const res = buildRes();
    const next = jest.fn() as unknown as NextFunction;
    verifyIpWhitelist(req as Request, res, next);
    return { res, next };
  };

  it('allows an exact single-IP match (backward compatible)', () => {
    webhookConfig.set('WEBHOOK_IP_WHITELIST', '203.0.113.5');
    const { res, next } = run({
      ip: '203.0.113.5',
      socket: { remoteAddress: '203.0.113.5' } as any,
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('allows an IP inside a CIDR range', () => {
    webhookConfig.set('WEBHOOK_IP_WHITELIST', '203.0.113.0/24');
    const { res, next } = run({
      ip: '203.0.113.42',
      socket: { remoteAddress: '203.0.113.42' } as any,
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('rejects an IP outside a CIDR range', () => {
    webhookConfig.set('WEBHOOK_IP_WHITELIST', '203.0.113.0/24');
    const { res, next } = run({
      ip: '198.51.100.1',
      socket: { remoteAddress: '198.51.100.1' } as any,
    });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith('Forbidden: Unauthorized IP address');
  });

  it('supports a mixed list of exact IPs and CIDR ranges', () => {
    webhookConfig.set('WEBHOOK_IP_WHITELIST', '10.0.0.0/8, 203.0.113.5');
    const cidrHit = run({ ip: '10.4.5.6', socket: { remoteAddress: '10.4.5.6' } as any });
    expect(cidrHit.next).toHaveBeenCalledTimes(1);

    const exactHit = run({ ip: '203.0.113.5', socket: { remoteAddress: '203.0.113.5' } as any });
    expect(exactHit.next).toHaveBeenCalledTimes(1);
  });

  it('uses X-Forwarded-For client IP when the direct connection is a trusted proxy', () => {
    // 127.0.0.1 is a default trusted proxy; the real client is in the XFF header.
    webhookConfig.set('WEBHOOK_IP_WHITELIST', '203.0.113.0/24');
    const { res, next } = run({
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' } as any,
      headers: { 'x-forwarded-for': '203.0.113.77' },
    });
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('does NOT trust X-Forwarded-For when the direct connection is not a trusted proxy', () => {
    // Untrusted direct connection: the spoofed XFF header must be ignored.
    webhookConfig.set('WEBHOOK_IP_WHITELIST', '203.0.113.0/24');
    const { res, next } = run({
      ip: '198.51.100.9',
      socket: { remoteAddress: '198.51.100.9' } as any,
      headers: { 'x-forwarded-for': '203.0.113.77' },
    });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
  });

  it('blocks when the whitelist is empty', () => {
    webhookConfig.set('WEBHOOK_IP_WHITELIST', '');
    const { res, next } = run({
      ip: '203.0.113.5',
      socket: { remoteAddress: '203.0.113.5' } as any,
    });
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.send).toHaveBeenCalledWith('Forbidden: IP whitelist is empty');
  });
});
