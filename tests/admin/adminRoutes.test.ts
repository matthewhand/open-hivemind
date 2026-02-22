import fs from 'fs';
import path from 'path';
import express from 'express';
import request from 'supertest';
import { adminRouter } from '../../src/admin/adminRoutes';

// Mock dependencies BEFORE importing adminRoutes
jest.mock('@hivemind/adapter-discord', () => ({
  Discord: {
    DiscordService: {
      getInstance: jest.fn().mockReturnValue({
        getAllBots: jest.fn().mockReturnValue([]),
        addBot: jest.fn(),
      }),
    },
  },
}));

jest.mock('@integrations/slack/SlackService', () => ({
  getInstance: jest.fn().mockReturnValue({
    getBotNames: jest.fn().mockReturnValue([]),
    getBotConfig: jest.fn(),
    addBot: jest.fn(),
  }),
}));

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

const app = express();
app.use(express.json());
app.use('/admin', adminRouter);

describe('Admin Routes', () => {
  // Mock fs methods
  const mockReadDirSync = jest.spyOn(fs, 'readdirSync');
  const mockReadFileSync = jest.spyOn(fs, 'readFileSync');
  const mockExistsSync = jest.spyOn(fs, 'existsSync');

  // Mock fs.promises methods
  let mockReadDirPromise: jest.SpyInstance;
  let mockReadFilePromise: jest.SpyInstance;
  let mockAccessPromise: jest.SpyInstance;

  beforeAll(() => {
    mockReadDirPromise = jest.spyOn(fs.promises, 'readdir');
    mockReadFilePromise = jest.spyOn(fs.promises, 'readFile');
    mockAccessPromise = jest.spyOn(fs.promises, 'access');
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  describe('GET /admin/personas', () => {
    it('should load personas using asynchronous fs methods', async () => {
      // Mock fs.promises.access to resolve
      mockAccessPromise.mockResolvedValue(undefined);

      // Mock fs.promises.readdir
      mockReadDirPromise.mockResolvedValue(['persona2.json'] as any);

      // Mock fs.promises.readFile
      mockReadFilePromise.mockImplementation((p: any) => {
        if (p.toString().endsWith('persona2.json')) {
          return Promise.resolve(
            JSON.stringify({
              key: 'persona2',
              name: 'Persona 2',
              systemPrompt: 'You are persona 2',
            })
          );
        }
        return Promise.resolve('');
      });

      const res = await request(app).get('/admin/personas');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.personas).toHaveLength(1);
      expect(res.body.personas[0].key).toBe('persona2');

      // Assert that ASYNC methods are called
      expect(mockReadDirPromise).toHaveBeenCalled();
      expect(mockReadFilePromise).toHaveBeenCalled();
      expect(mockAccessPromise).toHaveBeenCalled();

      // Assert that SYNC methods are NOT called
      expect(mockReadDirSync).not.toHaveBeenCalled();
      expect(mockReadFileSync).not.toHaveBeenCalled();
    });
  });
});
