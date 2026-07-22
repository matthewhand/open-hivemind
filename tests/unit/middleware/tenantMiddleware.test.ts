import { NextFunction, Request, Response } from 'express';
import {
  isTenantIsolationEnabled,
  requireTenant,
  resolveTenantId,
} from '../../../src/auth/middleware';

describe('requireTenant Middleware', () => {
  let req: Partial<Request> & { tenantId?: string; user?: { tenantId?: string } };
  let res: Partial<Response>;
  let next: NextFunction;
  let statusCode: number | undefined;
  let jsonBody: unknown;
  const originalEnv = { ...process.env };

  beforeEach(() => {
    statusCode = undefined;
    jsonBody = undefined;
    req = { headers: {}, query: {} };
    res = {
      status: jest.fn((code: number) => {
        statusCode = code;
        return res as Response;
      }),
      json: jest.fn((body: unknown) => {
        jsonBody = body;
        return res as Response;
      }),
    };
    next = jest.fn();
    delete process.env.TENANT_ISOLATION_ENABLED;
    delete process.env.MULTI_TENANT_ENABLED;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('passes through when tenant isolation is disabled (default)', () => {
    requireTenant(req as Request, res as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith();
    expect(statusCode).toBeUndefined();
  });

  it('attaches tenant id from X-Tenant-Id when isolation is off', () => {
    req.headers = { 'x-tenant-id': 'acme' };
    requireTenant(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(req.tenantId).toBe('acme');
  });

  it('rejects with 400 when isolation is on and no tenant is provided', () => {
    process.env.TENANT_ISOLATION_ENABLED = 'true';
    requireTenant(req as Request, res as Response, next);

    expect(next).not.toHaveBeenCalled();
    expect(statusCode).toBe(400);
    expect(jsonBody).toMatchObject({ code: 'TENANT_REQUIRED' });
  });

  it('accepts X-Tenant-Id when isolation is on', () => {
    process.env.TENANT_ISOLATION_ENABLED = 'true';
    req.headers = { 'x-tenant-id': 'tenant-a' };
    requireTenant(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(req.tenantId).toBe('tenant-a');
  });

  it('accepts tenantId from authenticated user when isolation is on', () => {
    process.env.MULTI_TENANT_ENABLED = 'yes';
    req.user = { tenantId: 'user-tenant' };
    requireTenant(req as Request, res as Response, next);

    expect(next).toHaveBeenCalled();
    expect(req.tenantId).toBe('user-tenant');
  });

  it('resolveTenantId prefers header over query', () => {
    req.headers = { 'x-tenant-id': 'from-header' };
    req.query = { tenantId: 'from-query' };
    expect(resolveTenantId(req as Request)).toBe('from-header');
  });

  it('isTenantIsolationEnabled is false by default', () => {
    expect(isTenantIsolationEnabled()).toBe(false);
  });
});
