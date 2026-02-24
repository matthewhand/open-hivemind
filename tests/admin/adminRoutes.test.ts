import fs from 'fs';
import path from 'path';
import express from 'express';
import request from 'supertest';

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

jest.mock('@integrations/slack/SlackService', () => ({
  getInstance: jest.fn().mockReturnValue({
    addBot: jest.fn().mockResolvedValue(true),
    getBotNames: jest.fn().mockReturnValue([]),
    getBotConfig: jest.fn().mockReturnValue({}),
  }),
}));

jest.mock('@hivemind/adapter-discord', () => ({
    Discord: {
        DiscordService: {
            getInstance: jest.fn().mockReturnValue({
                addBot: jest.fn().mockResolvedValue(true),
                getAllBots: jest.fn().mockReturnValue([]),
            })
        }
    }
}));

// We need to import the router AFTER mocks
import { adminRouter } from '../../src/admin/adminRoutes';

const app = express();
app.use(express.json());
app.use('/api/admin', adminRouter);

describe('Admin Routes I/O Performance', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /personas', () => {
    it('should load personas using asynchronous fs methods', async () => {
      // Mock fs.promises methods
      const mockReadDirPromise = jest.spyOn(fs.promises, 'readdir').mockResolvedValue(['persona2.json'] as any);
      const mockReadFilePromise = jest.spyOn(fs.promises, 'readFile').mockImplementation((p: any) => {
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
      const mockAccessPromise = jest.spyOn(fs.promises, 'access').mockResolvedValue(undefined);

      const res = await request(app).get('/api/admin/personas');

      expect(res.status).toBe(200);
      expect(res.body.ok).toBe(true);
      expect(res.body.personas).toHaveLength(1);
      expect(res.body.personas[0].key).toBe('persona2');

      expect(mockReadDirPromise).toHaveBeenCalled();
      expect(mockReadFilePromise).toHaveBeenCalled();
      expect(mockAccessPromise).toHaveBeenCalled();

      mockReadDirPromise.mockRestore();
      mockReadFilePromise.mockRestore();
      mockAccessPromise.mockRestore();
    });
  });

  it('should handle /slack-bots POST request', async () => {
    // Mock async implementation
    jest.spyOn(fs.promises, 'readFile').mockResolvedValue(JSON.stringify({ slack: { instances: [] } }));
    jest.spyOn(fs.promises, 'writeFile').mockResolvedValue(undefined);
    jest.spyOn(fs.promises, 'mkdir').mockResolvedValue(undefined);

    const payload = {
      name: 'test-bot',
      botToken: 'xoxb-test',
      signingSecret: 'secret',
    };

    const start = Date.now();
    const response = await request(app)
      .post('/api/admin/slack-bots')
      .send(payload);
    const end = Date.now();

    expect(response.status).toBe(200);
    expect(response.body.ok).toBe(true);
    console.log(`Request took ${end - start}ms`);
  });
});
