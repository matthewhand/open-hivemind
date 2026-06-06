/**
 * Regression tests for audit log endpoints.
 *
 * Bug (audit-query-and-page):
 *  - GET /api/enterprise/audit computed `auditEvents` but returned
 *    ApiResponse.success() with NO data.
 *  - GET /api/admin/audit-logs was a hardcoded placeholder returning { logs: [] }.
 *
 * Both endpoints must now return the real audit events from AuditLogger.
 */

import express from 'express';
import request from 'supertest';
import { AuditLogger, type AuditEvent } from '@src/common/auditLogger';
import adminAuditRouter from '@src/server/routes/admin/audit';
import enterpriseRouter from '@src/server/routes/enterprise';

const SAMPLE_EVENTS: AuditEvent[] = [
  {
    id: 'audit_1',
    timestamp: '2026-01-01T00:00:00.000Z',
    user: 'admin',
    action: 'CONFIG_UPDATE',
    resource: 'config',
    result: 'success',
    details: 'Updated config',
  },
  {
    id: 'audit_2',
    timestamp: '2026-01-02T00:00:00.000Z',
    user: 'admin',
    action: 'BOT_START',
    resource: 'bots/test',
    result: 'success',
    details: 'Started bot',
  },
];

describe('Audit log endpoints', () => {
  let getAuditEventsSpy: jest.SpyInstance;

  beforeEach(() => {
    const instance = AuditLogger.getInstance();
    // buildFilter is exercised for real (pure); only the file read is stubbed.
    getAuditEventsSpy = jest.spyOn(instance, 'getAuditEvents').mockResolvedValue(SAMPLE_EVENTS);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('GET /api/enterprise/audit', () => {
    const app = express();
    app.use('/api/enterprise', enterpriseRouter);

    it('returns the computed audit events in the response data', async () => {
      const res = await request(app).get('/api/enterprise/audit');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.auditEvents).toEqual(SAMPLE_EVENTS);
      expect(res.body.data.total).toBe(SAMPLE_EVENTS.length);
    });

    it('forwards pagination params to the audit logger', async () => {
      await request(app).get('/api/enterprise/audit?limit=5&offset=10');

      expect(getAuditEventsSpy).toHaveBeenCalledWith(5, 10, expect.any(Function));
    });
  });

  describe('GET /api/admin/audit-logs', () => {
    const app = express();
    app.use('/api/admin', adminAuditRouter);

    it('returns real audit events instead of an empty placeholder', async () => {
      const res = await request(app).get('/api/admin/audit-logs?limit=100');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.auditEvents).toEqual(SAMPLE_EVENTS);
      expect(res.body.data.total).toBe(SAMPLE_EVENTS.length);
      // Must NOT be the old hardcoded placeholder shape.
      expect(res.body.data.logs).toBeUndefined();
    });
  });
});
