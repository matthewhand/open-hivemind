import express from 'express';
import request from 'supertest';

const mockClearAllSystemCaches = jest.fn();

jest.mock('../../../src/server/utils/cacheManager', () => ({
  clearAllSystemCaches: (...args: any[]) => mockClearAllSystemCaches(...args),
}));

// Mock auth middleware to pass through
jest.mock('../../../src/auth/middleware', () => ({
  requireAdmin: (_req: any, _res: any, next: any) => next(),
}));

jest.mock('../../../src/server/middleware/auth', () => ({
  authenticateToken: (_req: any, _res: any, next: any) => next(),
}));

import router from '../../../src/server/routes/cache';

describe('Cache Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/cache', router);
    jest.clearAllMocks();
  });

  describe('POST /cache/clear', () => {
    it('should clear cache and return success', async () => {
      mockClearAllSystemCaches.mockResolvedValue(undefined);

      const res = await request(app).post('/cache/clear');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.message).toBe('Cache cleared successfully');
      expect(mockClearAllSystemCaches).toHaveBeenCalledTimes(1);
    });

    it('should return 500 when cache clear fails', async () => {
      mockClearAllSystemCaches.mockRejectedValue(new Error('Clear failed'));

      const res = await request(app).post('/cache/clear');
      expect(res.status).toBe(500);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toBe('Failed to clear cache');
    });
  });
});
