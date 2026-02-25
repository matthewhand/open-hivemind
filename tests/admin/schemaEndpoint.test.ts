import express from 'express';
import request from 'supertest';
import { adminRouter } from '../../src/admin/adminRoutes';

// Mocks
jest.mock('../../src/auth/middleware', () => ({
  authenticate: (req: any, res: any, next: any) => next(),
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

jest.mock('../../src/server/middleware/audit', () => ({
  auditMiddleware: (req: any, res: any, next: any) => next(),
  logAdminAction: jest.fn(),
}));

jest.mock('../../src/server/middleware/security', () => ({
  ipWhitelist: (req: any, res: any, next: any) => next(),
}));

// Mock provider registry
const mockProvider = {
    getSchema: jest.fn().mockReturnValue({
        default: 'test',
        format: String
    })
};

jest.mock('../../src/registries/ProviderRegistry', () => ({
  providerRegistry: {
      get: jest.fn((id) => {
          if (id === 'test') return mockProvider;
          return undefined;
      }),
      getMessageProviders: jest.fn().mockReturnValue([]),
      getLLMProviders: jest.fn().mockReturnValue([]),
  }
}));

const app = express();
app.use(express.json());
app.use('/api/admin', adminRouter);

describe('GET /providers/:providerId/schema', () => {
    it('should return serialized schema for existing provider', async () => {
        const res = await request(app).get('/api/admin/providers/test/schema');
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(res.body.schema).toEqual({
            default: 'test',
            format: 'String'
        });
    });

    it('should return 404 for non-existent provider', async () => {
        const res = await request(app).get('/api/admin/providers/unknown/schema');
        expect(res.status).toBe(404);
        expect(res.body.ok).toBe(false);
    });
});
