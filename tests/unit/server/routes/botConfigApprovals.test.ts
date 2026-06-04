/**
 * Tests for the bot-configuration two-phase approval workflow HTTP routes.
 *
 * Item (botconfig-approval-complete):
 *  - PUT /api/bot-config/:botId creates an approval request (pending) instead of
 *    applying the change.
 *  - POST /api/bot-config/:botId/apply-update applies the change only once the
 *    request is 'approved'.
 *
 * Before this change there was NO way to move a request from pending -> approved
 * (or reject it) or to list pending requests, so apply-update was unreachable and
 * the workflow was unusable end-to-end. These tests cover the new
 * list / approve / reject routes that complete the workflow.
 */

import express from 'express';
import request from 'supertest';

// --- Stub the heavy config singletons constructed at module import time ---
jest.mock('@src/config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: jest.fn(() => ({
      getBot: jest.fn(),
      getWarnings: jest.fn(() => []),
      isLegacyMode: jest.fn(() => false),
      reload: jest.fn(),
    })),
  },
}));

jest.mock('@src/config/SecureConfigManager', () => ({
  SecureConfigManager: {
    getInstanceSync: jest.fn(() => ({ storeConfig: jest.fn() })),
  },
}));

jest.mock('@src/config/UserConfigStore', () => ({
  UserConfigStore: {
    getInstance: jest.fn(() => ({
      getAllBotOverrides: jest.fn(() => new Map()),
      getBotOverride: jest.fn(),
      setBotOverride: jest.fn(),
    })),
  },
}));

// --- Auth middleware: pass-through that attaches an admin user ---
jest.mock('@src/auth/middleware', () => ({
  authenticate: (req: any, _res: any, next: any) => {
    req.user = { username: 'admin-user', role: 'admin' };
    next();
  },
  requireAdmin: (_req: any, _res: any, next: any) => next(),
  requireRole: () => (_req: any, _res: any, next: any) => next(),
}));

// --- Audit middleware: no-op ---
jest.mock('@src/server/middleware/audit', () => ({
  auditMiddleware: (_req: any, _res: any, next: any) => next(),
  logConfigChange: jest.fn(),
}));

// --- Rate limiter: no-op ---
jest.mock('@src/middleware/rateLimiter', () => ({
  configLimiter: (_req: any, _res: any, next: any) => next(),
}));

// --- DatabaseManager: controllable approval-request store ---
const isConnected = jest.fn(() => true);
const getApprovalRequest = jest.fn();
const getApprovalRequests = jest.fn();
const updateApprovalRequest = jest.fn();

jest.mock('@src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: jest.fn(() => ({
      isConnected,
      getApprovalRequest,
      getApprovalRequests,
      updateApprovalRequest,
    })),
  },
}));

// Import the router AFTER the mocks are registered.
import botConfigRouter from '@src/server/routes/botConfig';
import { globalErrorHandler } from '@src/middleware/errorHandler';

function createApp(): express.Application {
  const app = express();
  app.use(express.json());
  app.use('/api/bot-config', botConfigRouter);
  app.use(globalErrorHandler);
  return app;
}

const samplePending = {
  id: 7,
  resourceType: 'BotConfiguration',
  resourceId: 1,
  changeType: 'UPDATE',
  requestedBy: 'admin-user',
  diff: JSON.stringify({ old: {}, new: { persona: 'helpful' } }),
  status: 'pending',
  createdAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
};

describe('Bot configuration approval workflow routes', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    isConnected.mockReturnValue(true);
    app = createApp();
  });

  describe('GET /api/bot-config/approvals', () => {
    it('lists pending bot-configuration approval requests by default', async () => {
      getApprovalRequests.mockResolvedValue([samplePending]);

      const res = await request(app).get('/api/bot-config/approvals');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.approvals).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
      // Defaults to BotConfiguration resourceType + 'pending' status.
      expect(getApprovalRequests).toHaveBeenCalledWith('BotConfiguration', undefined, 'pending');
    });

    it('forwards an explicit status filter and supports "all"', async () => {
      getApprovalRequests.mockResolvedValue([]);

      await request(app).get('/api/bot-config/approvals?status=all');

      expect(getApprovalRequests).toHaveBeenCalledWith('BotConfiguration', undefined, undefined);
    });

    it('rejects an invalid status filter with 400', async () => {
      const res = await request(app).get('/api/bot-config/approvals?status=bogus');

      expect(res.status).toBe(400);
      expect(getApprovalRequests).not.toHaveBeenCalled();
    });

    it('is not shadowed by the /:botId route (route ordering)', async () => {
      // If /approvals were treated as a botId, getApprovalRequests would never
      // be called. Asserting it IS called proves the list route is reachable.
      getApprovalRequests.mockResolvedValue([]);

      const res = await request(app).get('/api/bot-config/approvals');

      expect(res.status).toBe(200);
      expect(getApprovalRequests).toHaveBeenCalled();
    });
  });

  describe('POST /api/bot-config/approvals/:approvalId/approve', () => {
    it('transitions a pending request to approved', async () => {
      getApprovalRequest.mockResolvedValue({ ...samplePending });
      updateApprovalRequest.mockResolvedValue(true);

      const res = await request(app)
        .post('/api/bot-config/approvals/7/approve')
        .send({ comments: 'looks good' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ approvalId: 7, status: 'approved' });
      expect(updateApprovalRequest).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ status: 'approved', reviewedBy: 'admin-user' })
      );
    });

    it('returns 404 when the approval request does not exist', async () => {
      getApprovalRequest.mockResolvedValue(null);

      const res = await request(app).post('/api/bot-config/approvals/99/approve').send({});

      expect(res.status).toBe(404);
      expect(updateApprovalRequest).not.toHaveBeenCalled();
    });

    it('refuses to approve a request that is not pending', async () => {
      getApprovalRequest.mockResolvedValue({ ...samplePending, status: 'approved' });

      const res = await request(app).post('/api/bot-config/approvals/7/approve').send({});

      expect(res.status).toBe(400);
      expect(updateApprovalRequest).not.toHaveBeenCalled();
    });

    it('returns 400 for a non-numeric approval id', async () => {
      const res = await request(app).post('/api/bot-config/approvals/abc/approve').send({});

      expect(res.status).toBe(400);
      expect(getApprovalRequest).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/bot-config/approvals/:approvalId/reject', () => {
    it('transitions a pending request to rejected', async () => {
      getApprovalRequest.mockResolvedValue({ ...samplePending });
      updateApprovalRequest.mockResolvedValue(true);

      const res = await request(app)
        .post('/api/bot-config/approvals/7/reject')
        .send({ comments: 'no thanks' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ approvalId: 7, status: 'rejected' });
      expect(updateApprovalRequest).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ status: 'rejected', reviewedBy: 'admin-user' })
      );
    });

    it('refuses to reject a request that is not pending', async () => {
      getApprovalRequest.mockResolvedValue({ ...samplePending, status: 'rejected' });

      const res = await request(app).post('/api/bot-config/approvals/7/reject').send({});

      expect(res.status).toBe(400);
      expect(updateApprovalRequest).not.toHaveBeenCalled();
    });
  });
});
