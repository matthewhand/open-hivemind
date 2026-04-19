import express from 'express';
import request from 'supertest';
import marketplaceRouter from '@src/server/routes/marketplace';

jest.mock('@src/plugins/PluginManager', () => ({
  listInstalledPlugins: jest.fn().mockResolvedValue([
    {
      name: 'test-plugin',
      repoUrl: 'https://github.com/test/test',
      installedAt: '2024-01-01',
      updatedAt: '2024-01-01',
      version: '1.0.0',
    },
  ]),
  installPlugin: jest.fn().mockResolvedValue({ name: 'test-plugin' }),
  uninstallPlugin: jest.fn().mockResolvedValue(undefined),
  updatePlugin: jest.fn().mockResolvedValue({ name: 'test-plugin' }),
}));

jest.mock('@src/server/middleware/auth', () => ({
  authenticateToken: (req: any, _res: any, next: any) => {
    req.user = { id: 'test-user', role: 'admin' };
    next();
  },
  requireRole: () => (req: any, res: any, next: any) => next(),
}));

describe('Marketplace API Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/marketplace', marketplaceRouter);
  });

  describe('GET /api/marketplace/packages', () => {
    it('returns list of available packages', async () => {
      const res = await request(app).get('/api/marketplace/packages');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(Array.isArray(res.body.data)).toBe(true);
    });

    it('includes built-in packages', async () => {
      const res = await request(app).get('/api/marketplace/packages');
      const packages = res.body.data;
      const builtIn = packages.filter((p: any) => p.status === 'built-in');
      expect(builtIn.length).toBeGreaterThan(0);
    });

    it('includes type for each package', async () => {
      const res = await request(app).get('/api/marketplace/packages');
      const packages = res.body.data;
      packages.forEach((p: any) => {
        expect(p).toHaveProperty('name');
        expect(p).toHaveProperty('type');
        expect(p).toHaveProperty('status');
      });
    });
  });

  describe('GET /api/marketplace/packages', () => {
    it('returns installed packages filtered by status', async () => {
      const res = await request(app).get('/api/marketplace/packages?status=installed');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/marketplace/install', () => {
    it('installs a plugin from repo URL', async () => {
      const res = await request(app)
        .post('/api/marketplace/install')
        .send({ repoUrl: 'https://github.com/test/test' });
      expect(res.status).toBe(201);
    });

    it('accepts any repo URL (validation delegated to plugin manager)', async () => {
      const res = await request(app).post('/api/marketplace/install').send({ repoUrl: 'invalid' });
      expect(res.status).toBe(201);
    });

    it('requires repoUrl in body', async () => {
      const res = await request(app).post('/api/marketplace/install');
      expect(res.status).toBe(400);
    });

    it('rejects missing repo URL', async () => {
      const res = await request(app).post('/api/marketplace/install');
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/marketplace/uninstall/:name', () => {
    it('uninstalls a plugin by name', async () => {
      const res = await request(app).post('/api/marketplace/uninstall/test-plugin');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/marketplace/update/:name', () => {
    it('updates a plugin by name', async () => {
      const res = await request(app).post('/api/marketplace/update/test-plugin');
      expect(res.status).toBe(200);
    });
  });

  describe('POST /api/marketplace/refresh', () => {
    it('refreshes package cache', async () => {
      const res = await request(app).post('/api/marketplace/refresh');
      expect(res.status).toBe(200);
    });
  });
});
