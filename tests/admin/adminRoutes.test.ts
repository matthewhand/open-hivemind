import express from 'express';
import request from 'supertest';
import fs from 'fs';
import path from 'path';

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

  it('should handle /slack-bots POST request', async () => {
    // Mock fs methods
    jest.spyOn(fs, 'existsSync').mockReturnValue(true);
    // Mock readFileSync to simulate data
    jest.spyOn(fs, 'readFileSync').mockReturnValue(JSON.stringify({ slack: { instances: [] } }));
    // Mock writeFileSync to do nothing
    jest.spyOn(fs, 'writeFileSync').mockImplementation(() => {});
    jest.spyOn(fs, 'mkdirSync').mockImplementation(() => "");

    // For async implementation
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
