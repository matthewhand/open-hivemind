import fs from 'fs'; // Use default import
import path from 'path';
import express from 'express';
import request from 'supertest';
// Import the router after mocks
import configRouter from '../../src/server/routes/config';

// Mock fs before importing the router
jest.mock('fs', () => {
  return {
    promises: {
      access: jest.fn(),
      readdir: jest.fn(),
      readFile: jest.fn(),
    },
    existsSync: jest.fn(),
    readdirSync: jest.fn(),
    readFileSync: jest.fn(),
    statSync: jest.fn(),
    mkdirSync: jest.fn(),
    writeFileSync: jest.fn(),
  };
});

// Mock other dependencies to avoid loading real config or connecting to DB
jest.mock('../../src/config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: () => ({
      getAllBots: jest.fn().mockReturnValue([]),
      getWarnings: jest.fn().mockReturnValue([]),
      isLegacyMode: jest.fn().mockReturnValue(false),
      getBot: jest.fn(),
      updateBot: jest.fn(),
      addBot: jest.fn(),
    }),
  },
}));
jest.mock('../../src/config/UserConfigStore', () => ({
  UserConfigStore: {
    getInstance: () => ({
      getGeneralSettings: jest.fn().mockReturnValue({}),
      isBotDisabled: jest.fn().mockReturnValue(false),
      getBotOverride: jest.fn().mockReturnValue({}),
    }),
  },
}));

// Mock config modules
const mockConfigFactory = () => ({
  getSchema: () => ({ properties: {} }),
  getProperties: () => ({}),
});

jest.mock('../../src/config/discordConfig', () => ({
  getSchema: () => ({ properties: {} }),
  getProperties: () => ({}),
}));
jest.mock('../../src/config/flowiseConfig', () => ({
  getSchema: () => ({ properties: {} }),
  getProperties: () => ({}),
}));
jest.mock('../../src/config/guardrailProfiles', () => ({ getGuardrailProfiles: () => [] }));
jest.mock('../../src/config/llmConfig', () => ({
  getSchema: () => ({ properties: {} }),
  getProperties: () => ({}),
}));
jest.mock('../../src/config/llmDefaultStatus', () => ({ getLlmDefaultStatus: () => ({}) }));
jest.mock('../../src/config/llmProfiles', () => ({ getLlmProfiles: () => ({ llm: [] }) }));
jest.mock('../../src/config/mattermostConfig', () => ({
  getSchema: () => ({ properties: {} }),
  getProperties: () => ({}),
}));
jest.mock('../../src/config/mcpServerProfiles', () => ({ getMcpServerProfiles: () => [] }));
jest.mock('../../src/config/messageConfig', () => ({ get: () => {} }));
jest.mock('../../src/config/ollamaConfig', () => ({
  getSchema: () => ({ properties: {} }),
  getProperties: () => ({}),
}));
jest.mock('../../src/config/openaiConfig', () => ({
  getSchema: () => ({ properties: {} }),
  getProperties: () => ({}),
}));
jest.mock('../../src/config/openWebUIConfig', () => ({
  getSchema: () => ({ properties: {} }),
  getProperties: () => ({}),
}));
jest.mock('../../src/config/responseProfileManager', () => ({ getResponseProfiles: () => [] }));
jest.mock('../../src/config/slackConfig', () => ({
  getSchema: () => ({ properties: {} }),
  getProperties: () => ({}),
}));
jest.mock('../../src/config/webhookConfig', () => ({
  getSchema: () => ({ properties: {} }),
  getProperties: () => ({}),
}));

jest.mock('../../src/server/middleware/audit', () => ({
  auditMiddleware: (req: any, res: any, next: any) => next(),
  logConfigChange: jest.fn(),
}));

jest.mock('../../src/integrations/mattermost/MattermostConnectionTest', () => ({
  testMattermostConnection: jest.fn(),
}));
jest.mock('../../src/integrations/slack/SlackConnectionTest', () => ({
  testSlackConnection: jest.fn(),
}));

describe('Config Templates Route', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/config', configRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
    (fs.promises.readFile as jest.Mock).mockReset();
    (fs.promises.readdir as jest.Mock).mockReset();
    (fs.promises.access as jest.Mock).mockReset();
  });

  it('should list templates asynchronously', async () => {
    const templatesDir = path.join(process.cwd(), 'config', 'templates');

    // Setup mocks
    (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
    (fs.promises.readdir as jest.Mock).mockResolvedValue(['test-template.json']);
    (fs.promises.readFile as jest.Mock).mockImplementation((filepath) => {
      if (String(filepath).endsWith('test-template.json')) {
        return Promise.resolve(
          JSON.stringify({
            name: 'Test Template',
            description: 'A test template',
            provider: 'test-provider',
          })
        );
      }
      return Promise.reject(new Error('File not found ' + filepath));
    });

    const response = await request(app).get('/api/config/templates');

    expect(response.status).toBe(200);
    expect(response.body.templates).toHaveLength(1);
    expect(response.body.templates[0].name).toBe('Test Template');

    expect(fs.promises.access).toHaveBeenCalledWith(templatesDir);
    expect(fs.promises.readdir).toHaveBeenCalledWith(templatesDir);
    expect(fs.promises.readFile).toHaveBeenCalledWith(
      path.join(templatesDir, 'test-template.json'),
      'utf8'
    );
  });

  it('should handle missing templates directory', async () => {
    (fs.promises.access as jest.Mock).mockRejectedValue(new Error('ENOENT'));

    const response = await request(app).get('/api/config/templates');

    expect(response.status).toBe(200);
    expect(response.body.templates).toEqual([]);
  });

  it('should skip invalid JSON templates', async () => {
    // Setup mocks
    (fs.promises.access as jest.Mock).mockResolvedValue(undefined);
    (fs.promises.readdir as jest.Mock).mockResolvedValue(['valid.json', 'bad.json']);

    (fs.promises.readFile as jest.Mock).mockImplementation((filepath) => {
      const p = String(filepath);
      if (p.endsWith('valid.json')) {
        return Promise.resolve(JSON.stringify({ name: 'Valid' }));
      }
      if (p.endsWith('bad.json')) {
        return Promise.resolve('invalid json content');
      }
      return Promise.reject(new Error(`Unexpected file: ${p}`));
    });

    const response = await request(app).get('/api/config/templates');

    expect(response.status).toBe(200);
    expect(response.body.templates).toHaveLength(1);
    expect(response.body.templates[0].name).toBe('Valid');
  });
});
