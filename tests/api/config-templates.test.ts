import fs from 'fs';
import path from 'path';
import express from 'express';
import request from 'supertest';
// Now import the router
import router from '../../src/server/routes/config';

// Mock dependencies before importing the router
jest.mock('../../src/config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: jest.fn().mockReturnValue({
      getAllBots: jest.fn().mockResolvedValue([]),
      getWarnings: jest.fn().mockReturnValue([]),
      reload: jest.fn(),
      isLegacyMode: jest.fn().mockReturnValue(false),
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

jest.mock('../../src/services/DemoModeService', () => ({
  default: {
    getInstance: jest.fn().mockReturnValue({
      isInDemoMode: jest.fn().mockReturnValue(false),
      getDemoBots: jest.fn().mockReturnValue([]),
    }),
  },
}));

// Mock convict configs
const convictMock = {
  get: jest.fn(),
  getSchema: jest.fn().mockReturnValue({}),
  getProperties: jest.fn().mockReturnValue({}),
  loadFile: jest.fn(),
  validate: jest.fn(),
  load: jest.fn(),
};

// Inline mocks to avoid hoisting issues
jest.mock('../../src/config/messageConfig', () => ({
  get: jest.fn(),
  getSchema: jest.fn().mockReturnValue({}),
  getProperties: jest.fn().mockReturnValue({}),
  loadFile: jest.fn(),
  validate: jest.fn(),
  load: jest.fn(),
}));
jest.mock('../../src/config/llmConfig', () => ({
  get: jest.fn(),
  getSchema: jest.fn().mockReturnValue({}),
  getProperties: jest.fn().mockReturnValue({}),
  loadFile: jest.fn(),
  validate: jest.fn(),
  load: jest.fn(),
}));
jest.mock('../../src/config/discordConfig', () => ({
  get: jest.fn(),
  getSchema: jest.fn().mockReturnValue({}),
  getProperties: jest.fn().mockReturnValue({}),
  loadFile: jest.fn(),
  validate: jest.fn(),
  load: jest.fn(),
}));
jest.mock('../../src/config/slackConfig', () => ({
  get: jest.fn(),
  getSchema: jest.fn().mockReturnValue({}),
  getProperties: jest.fn().mockReturnValue({}),
  loadFile: jest.fn(),
  validate: jest.fn(),
  load: jest.fn(),
}));
jest.mock('../../src/config/openaiConfig', () => ({
  get: jest.fn(),
  getSchema: jest.fn().mockReturnValue({}),
  getProperties: jest.fn().mockReturnValue({}),
  loadFile: jest.fn(),
  validate: jest.fn(),
  load: jest.fn(),
}));
jest.mock('../../src/config/flowiseConfig', () => ({
  get: jest.fn(),
  getSchema: jest.fn().mockReturnValue({}),
  getProperties: jest.fn().mockReturnValue({}),
  loadFile: jest.fn(),
  validate: jest.fn(),
  load: jest.fn(),
}));
jest.mock('../../src/config/ollamaConfig', () => ({
  get: jest.fn(),
  getSchema: jest.fn().mockReturnValue({}),
  getProperties: jest.fn().mockReturnValue({}),
  loadFile: jest.fn(),
  validate: jest.fn(),
  load: jest.fn(),
}));
jest.mock('../../src/config/mattermostConfig', () => ({
  get: jest.fn(),
  getSchema: jest.fn().mockReturnValue({}),
  getProperties: jest.fn().mockReturnValue({}),
  loadFile: jest.fn(),
  validate: jest.fn(),
  load: jest.fn(),
}));
jest.mock('../../src/config/openWebUIConfig', () => ({
  get: jest.fn(),
  getSchema: jest.fn().mockReturnValue({}),
  getProperties: jest.fn().mockReturnValue({}),
  loadFile: jest.fn(),
  validate: jest.fn(),
  load: jest.fn(),
}));
jest.mock('../../src/config/webhookConfig', () => ({
  get: jest.fn(),
  getSchema: jest.fn().mockReturnValue({}),
  getProperties: jest.fn().mockReturnValue({}),
  loadFile: jest.fn(),
  validate: jest.fn(),
  load: jest.fn(),
}));

jest.mock('../../src/config/guardrailProfiles', () => ({
  getGuardrailProfiles: jest.fn().mockReturnValue([]),
  saveGuardrailProfiles: jest.fn(),
}));

jest.mock('../../src/config/llmProfiles', () => ({
  getLlmProfiles: jest.fn().mockReturnValue({ llm: [] }),
  saveLlmProfiles: jest.fn(),
}));

jest.mock('../../src/config/llmDefaultStatus', () => ({
  getLlmDefaultStatus: jest
    .fn()
    .mockReturnValue({ configured: true, providers: [], libraryStatus: {} }),
}));

jest.mock('../../src/config/mcpServerProfiles', () => ({
  createMcpServerProfile: jest.fn(),
  deleteMcpServerProfile: jest.fn(),
  getMcpServerProfileByKey: jest.fn(),
  getMcpServerProfiles: jest.fn().mockReturnValue([]),
  updateMcpServerProfile: jest.fn(),
}));

jest.mock('../../src/config/responseProfileManager', () => ({
  createResponseProfile: jest.fn(),
  deleteResponseProfile: jest.fn(),
  getResponseProfiles: jest.fn().mockReturnValue([]),
  updateResponseProfile: jest.fn(),
}));

// Mock middleware
jest.mock('../../src/server/middleware/audit', () => ({
  auditMiddleware: (req: any, res: any, next: any) => next(),
  logConfigChange: jest.fn(),
}));

// Mock fs
jest.mock('fs', () => {
  const originalFs = jest.requireActual('fs');
  return {
    ...originalFs,
    existsSync: jest.fn(),
    readdirSync: jest.fn(),
    readFileSync: jest.fn(),
    writeFileSync: jest.fn(),
    mkdirSync: jest.fn(),
    promises: {
      readdir: jest.fn(),
      readFile: jest.fn(),
      stat: jest.fn(), // We might use stat instead of access
      access: jest.fn(),
    },
  };
});

describe('Config Routes - Templates', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    app.use('/api/config', router);
    jest.clearAllMocks();
  });

  it('should return templates correctly', async () => {
    // Setup mock data
    const mockFiles = ['template1.json', 'template2.json'];
    const mockContent1 = { name: 'Template 1', description: 'Desc 1', provider: 'openai' };
    const mockContent2 = { name: 'Template 2', description: 'Desc 2', provider: 'anthropic' };

    // Mock sync behavior (current implementation)
    (fs.existsSync as jest.Mock).mockReturnValue(true);
    (fs.readdirSync as jest.Mock).mockReturnValue(mockFiles);
    (fs.readFileSync as jest.Mock).mockImplementation((filepath) => {
      if (filepath.includes('template1.json')) return JSON.stringify(mockContent1);
      if (filepath.includes('template2.json')) return JSON.stringify(mockContent2);
      throw new Error('File not found');
    });

    // Mock async behavior (future implementation)
    // We mock both so the test passes before and after the change if possible,
    // or we update the test to expect async calls.
    // Since we are changing implementation details, the test expectation on mocks will change.
    // For now, let's just make sure it returns 200 OK and data.

    // Also mock fs.promises for the future implementation
    (fs.promises.readdir as jest.Mock).mockResolvedValue(mockFiles);
    (fs.promises.readFile as jest.Mock).mockImplementation((filepath) => {
      if (filepath.includes('template1.json')) return Promise.resolve(JSON.stringify(mockContent1));
      if (filepath.includes('template2.json')) return Promise.resolve(JSON.stringify(mockContent2));
      return Promise.reject(new Error('File not found'));
    });
    // Mock stat for async exists check
    (fs.promises.stat as jest.Mock).mockResolvedValue({ isFile: () => true });
    // Mock access for async exists check
    (fs.promises.access as jest.Mock).mockResolvedValue(undefined);

    const res = await request(app).get('/api/config/templates');

    expect(res.status).toBe(200);
    expect(res.body.templates).toHaveLength(2);
    expect(res.body.templates[0].name).toBe('Template 1');
    expect(res.body.templates[1].name).toBe('Template 2');

    // We can check if either readdirSync or promises.readdir was called
    const syncCalled = (fs.readdirSync as jest.Mock).mock.calls.length > 0;
    const asyncCalled = (fs.promises.readdir as jest.Mock).mock.calls.length > 0;

    expect(syncCalled || asyncCalled).toBe(true);
  });

  it('should return empty array if templates directory does not exist', async () => {
    (fs.existsSync as jest.Mock).mockReturnValue(false);
    (fs.promises.access as jest.Mock).mockRejectedValue({ code: 'ENOENT' });

    const res = await request(app).get('/api/config/templates');

    expect(res.status).toBe(200);
    expect(res.body.templates).toEqual([]);
  });
});
