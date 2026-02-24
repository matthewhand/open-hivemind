
import express from 'express';
import request from 'supertest';
import fs from 'fs';

// Mock dependencies before importing the router
jest.mock('../../src/config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: jest.fn().mockReturnValue({
      getAllBots: jest.fn().mockReturnValue([]),
      getWarnings: jest.fn().mockReturnValue([]),
      isLegacyMode: jest.fn().mockReturnValue(false),
    }),
  },
}));

jest.mock('../../src/managers/BotManager', () => ({
  BotManager: {
    getInstance: jest.fn().mockReturnValue({
      getAllBots: jest.fn().mockResolvedValue([]),
    }),
  },
}));

jest.mock('../../src/config/UserConfigStore', () => ({
  UserConfigStore: {
    getInstance: jest.fn().mockReturnValue({
      getGeneralSettings: jest.fn().mockReturnValue({}),
      isBotDisabled: jest.fn().mockReturnValue(false),
      getBotOverride: jest.fn().mockReturnValue({}),
    }),
  },
}));

jest.mock('../../src/server/middleware/audit', () => ({
  auditMiddleware: (req: any, res: any, next: any) => next(),
  logConfigChange: jest.fn(),
}));

// Mock config modules to avoid loading real configs
jest.mock('../../src/config/discordConfig', () => ({ getSchema: () => ({}) }));
jest.mock('../../src/config/flowiseConfig', () => ({ getSchema: () => ({}) }));
jest.mock('../../src/config/llmConfig', () => ({ getSchema: () => ({}) }));
jest.mock('../../src/config/mattermostConfig', () => ({ getSchema: () => ({}) }));
jest.mock('../../src/config/messageConfig', () => ({
  get: jest.fn(),
  getSchema: () => ({})
}));
jest.mock('../../src/config/ollamaConfig', () => ({ getSchema: () => ({}) }));
jest.mock('../../src/config/openaiConfig', () => ({ getSchema: () => ({}) }));
jest.mock('../../src/config/openWebUIConfig', () => ({ getSchema: () => ({}) }));
jest.mock('../../src/config/slackConfig', () => ({ getSchema: () => ({}) }));
jest.mock('../../src/config/webhookConfig', () => ({ getSchema: () => ({}) }));

// Import the router after mocks
import configRouter from '../../src/server/routes/config';

describe('GET /sources Performance Optimization', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/config', configRouter);
  });

  it('should return config files and handle file I/O correctly', async () => {
    // This test verifies that the /sources endpoint works correctly after
    // being converted to use asynchronous file I/O.

    const response = await request(app).get('/api/config/sources');
    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('configFiles');
    expect(Array.isArray(response.body.configFiles)).toBe(true);
  });
});
