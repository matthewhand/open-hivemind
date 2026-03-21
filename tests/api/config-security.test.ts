import fs from 'fs';
import path from 'path';
import express from 'express';
import request from 'supertest';
// Import the router after mocking
import configRouter from '../../src/server/routes/config';

// Mock audit middleware
jest.mock('../../src/server/middleware/audit', () => ({
  auditMiddleware: (req: any, res: any, next: any) => next(),
  logConfigChange: jest.fn(),
  validateRequest: () => (req: any, res: any, next: any) => next(),
}));

// Mock validation
jest.mock('../../src/validation/validateRequest', () => ({
  validateRequest: () => (req: any, res: any, next: any) => next(),
}));

// Mock managers
jest.mock('../../src/config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: () => ({
      getAllBots: () => [],
      getWarnings: () => [],
    }),
  },
}));

jest.mock('../../src/config/UserConfigStore', () => ({
  UserConfigStore: {
    getInstance: () => ({
      getGeneralSettings: () => ({}),
      setGeneralSettings: jest.fn(),
    }),
  },
}));

// Mock config files
const configMocks = [
  'messageConfig',
  'llmConfig',
  'discordConfig',
  'slackConfig',
  'openaiConfig',
  'flowiseConfig',
  'ollamaConfig',
  'mattermostConfig',
  'openWebUIConfig',
  'webhookConfig',
];

configMocks.forEach((cfg) => {
  jest.mock(`../../src/config/${cfg}`, () => ({
    getSchema: () => ({ properties: {} }),
    getProperties: () => ({}),
    load: jest.fn(),
    validate: jest.fn(),
  }));
});

jest.mock('convict', () => {
  const convictMock = () => ({
    getSchema: () => ({ properties: {} }),
    load: jest.fn(),
    validate: jest.fn(),
    getProperties: () => ({}),
    loadFile: jest.fn(),
    get: jest.fn(),
    set: jest.fn(),
  });
  convictMock.addFormat = jest.fn();
  convictMock.addFormats = jest.fn();
  return convictMock;
});

// Mock fs
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    existsSync: jest.fn().mockReturnValue(true),
    readdirSync: jest.fn().mockReturnValue([]),
    promises: {
      writeFile: jest.fn().mockResolvedValue(undefined),
      readFile: jest.fn().mockResolvedValue('{}'),
      mkdir: jest.fn().mockResolvedValue(undefined),
      readdir: jest.fn().mockResolvedValue([]),
      stat: jest.fn().mockResolvedValue({ size: 100, mtime: new Date() }),
    },
  };
});

describe('Config Route Path Traversal Vulnerability', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/config', configRouter);
  });

  it('should prevent path traversal in dynamic config creation', async () => {
    // Try to traverse out of providers/
    const maliciousConfigName = 'openai-../../../exploit';
    const payload = {
      configName: maliciousConfigName,
      updates: { someKey: 'someValue' },
    };

    const res = await request(app).put('/api/config/global').send(payload);

    expect(res.status).toBe(400);
    expect(res.body.error).toContain('Invalid config name');

    // Check if fs.promises.writeFile was NOT called
    const writeFileMock = fs.promises.writeFile as jest.Mock;
    expect(writeFileMock).not.toHaveBeenCalled();
  });
});
