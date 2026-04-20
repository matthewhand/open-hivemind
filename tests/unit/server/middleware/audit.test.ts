import { Response, NextFunction } from 'express';
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
});
