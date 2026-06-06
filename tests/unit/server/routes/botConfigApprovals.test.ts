import express from 'express';
import request from 'supertest';
import { globalErrorHandler } from '@src/middleware/errorHandler';

// --- DatabaseManager: controllable approval-request store ---
const mockIsConnected = jest.fn(() => true);
const mockGetApprovalRequest = jest.fn();
const mockGetApprovalRequests = jest.fn();
const mockUpdateApprovalRequest = jest.fn();

jest.mock('@src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: jest.fn(() => ({
      isConnected: mockIsConnected,
      getApprovalRequest: mockGetApprovalRequest,
      getApprovalRequests: mockGetApprovalRequests,
      updateApprovalRequest: mockUpdateApprovalRequest,
    })),
  },
}));

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

// Import the router AFTER the mocks are registered.
import botConfigRouter from '@src/server/routes/botConfig';

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
    mockIsConnected.mockReturnValue(true);
    app = createApp();
  });

  describe('GET /api/bot-config/approvals', () => {
    it('lists pending bot-configuration approval requests by default', async () => {
      mockGetApprovalRequests.mockResolvedValue([samplePending]);

      const res = await request(app).get('/api/bot-config/approvals');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.approvals).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
      // Defaults to BotConfiguration resourceType + 'pending' status.
      expect(mockGetApprovalRequests).toHaveBeenCalledWith('BotConfiguration', undefined, 'pending');
    });

    it('forwards an explicit status filter and supports "all"', async () => {
      mockGetApprovalRequests.mockResolvedValue([]);

      await request(app).get('/api/bot-config/approvals?status=all');

      expect(mockGetApprovalRequests).toHaveBeenCalledWith('BotConfiguration', undefined, undefined);
    });

    it('rejects an invalid status filter with 400', async () => {
      const res = await request(app).get('/api/bot-config/approvals?status=bogus');

      expect(res.status).toBe(400);
      expect(mockGetApprovalRequests).not.toHaveBeenCalled();
    });

    it('is not shadowed by the /:botId route (route ordering)', async () => {
      // If /approvals were treated as a botId, getApprovalRequests would never
      // be called. Asserting it IS called proves the list route is reachable.
      mockGetApprovalRequests.mockResolvedValue([]);

      const res = await request(app).get('/api/bot-config/approvals');

      expect(res.status).toBe(200);
      expect(mockGetApprovalRequests).toHaveBeenCalled();
    });
  });

  describe('POST /api/bot-config/approvals/:approvalId/approve', () => {
    it('transitions a pending request to approved', async () => {
      mockGetApprovalRequest.mockResolvedValue({ ...samplePending });
      mockUpdateApprovalRequest.mockResolvedValue(true);

      const res = await request(app)
        .post('/api/bot-config/approvals/7/approve')
        .send({ comments: 'looks good' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ approvalId: 7, status: 'approved' });
      expect(mockUpdateApprovalRequest).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ status: 'approved', reviewedBy: 'admin-user' })
      );
    });

    it('returns 404 when the approval request does not exist', async () => {
      mockGetApprovalRequest.mockResolvedValue(null);

      const res = await request(app).post('/api/bot-config/approvals/99/approve').send({});

      expect(res.status).toBe(404);
      expect(mockUpdateApprovalRequest).not.toHaveBeenCalled();
    });

    it('refuses to approve a request that is not pending', async () => {
      mockGetApprovalRequest.mockResolvedValue({ ...samplePending, status: 'approved' });

      const res = await request(app).post('/api/bot-config/approvals/7/approve').send({});

      expect(res.status).toBe(400);
      expect(mockUpdateApprovalRequest).not.toHaveBeenCalled();
    });

    it('returns 400 for a non-numeric approval id', async () => {
      const res = await request(app).post('/api/bot-config/approvals/abc/approve').send({});

      expect(res.status).toBe(400);
      expect(mockGetApprovalRequest).not.toHaveBeenCalled();
    });
  });

  describe('POST /api/bot-config/approvals/:approvalId/reject', () => {
    it('transitions a pending request to rejected', async () => {
      mockGetApprovalRequest.mockResolvedValue({ ...samplePending });
      mockUpdateApprovalRequest.mockResolvedValue(true);

      const res = await request(app)
        .post('/api/bot-config/approvals/7/reject')
        .send({ comments: 'no thanks' });

      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ approvalId: 7, status: 'rejected' });
      expect(mockUpdateApprovalRequest).toHaveBeenCalledWith(
        7,
        expect.objectContaining({ status: 'rejected', reviewedBy: 'admin-user' })
      );
    });

    it('refuses to reject a request that is not pending', async () => {
      mockGetApprovalRequest.mockResolvedValue({ ...samplePending, status: 'rejected' });

      const res = await request(app).post('/api/bot-config/approvals/7/reject').send({});

      expect(res.status).toBe(400);
      expect(mockUpdateApprovalRequest).not.toHaveBeenCalled();
    });
  });
});
