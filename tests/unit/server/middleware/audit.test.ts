import { NextFunction, Response } from 'express';
import { auditMiddleware, type AuditedRequest } from '../../../../src/server/middleware/audit';

describe('auditMiddleware', () => {
  let req: Partial<AuditedRequest>;
  let res: Partial<Response>;
  let next: NextFunction;

  beforeEach(() => {
    req = {
      headers: {
        'user-agent': 'test-agent',
      },
      ip: '127.0.0.1',
    };
    res = {};
    next = jest.fn();
  });

  it('should attach anonymous user and info for unauthenticated requests', () => {
    auditMiddleware(req as AuditedRequest, res as Response, next);

    expect(req.auditUser).toBe('anonymous');
    expect(req.auditIp).toBe('127.0.0.1');
    expect(req.auditUserAgent).toBe('test-agent');
    expect(next).toHaveBeenCalled();
  });

  it('should attach username for authenticated requests', () => {
    req.user = { id: '1', username: 'test-admin' } as any;
    auditMiddleware(req as AuditedRequest, res as Response, next);

    expect(req.auditUser).toBe('test-admin');
    expect(next).toHaveBeenCalled();
  });

  it('should handle missing headers and IP gracefully', () => {
    const emptyReq: Partial<AuditedRequest> = {
      headers: {},
    };
    auditMiddleware(emptyReq as AuditedRequest, res as Response, next);

    expect(emptyReq.auditUser).toBe('anonymous');
    expect(emptyReq.auditIp).toBe('unknown');
    expect(emptyReq.auditUserAgent).toBe('unknown');
  });

  it('does not let a spoofed X-Forwarded-For header override the real client IP', () => {
    // Direct connection from a public (non-trusted-proxy) address, with an
    // attacker-supplied X-Forwarded-For. The audit IP must be the real socket
    // address, NOT the spoofed header — otherwise audit trails are forgeable.
    const spoofReq: Partial<AuditedRequest> = {
      headers: {
        'user-agent': 'attacker-agent',
        'x-forwarded-for': '1.2.3.4',
        'x-real-ip': '5.6.7.8',
      },
      socket: { remoteAddress: '203.0.113.5' } as never,
    };

    auditMiddleware(spoofReq as AuditedRequest, res as Response, next);

    expect(spoofReq.auditIp).toBe('203.0.113.5');
    expect(spoofReq.auditIp).not.toBe('1.2.3.4');
    expect(spoofReq.auditIp).not.toBe('5.6.7.8');
  });
});
