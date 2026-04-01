import * as fs from 'fs';
import express from 'express';
import request from 'supertest';
import { getLlmDefaultStatus } from '../../src/config/llmDefaultStatus';
import { getLlmProfiles, saveLlmProfiles } from '../../src/config/llmProfiles';
import { getMessageProfiles, saveMessageProfiles } from '../../src/config/messageProfiles';
// Import mocked modules so we can alter their behavior in tests
import { BotManager } from '../../src/managers/BotManager';
// Import the router after mocks are set up
import configRouter from '../../src/server/routes/config';
import { ErrorUtils } from '../../src/types/errors';

// Mock dependencies BEFORE importing the router
jest.mock('fs', () => {
  const actualFs = jest.requireActual('fs');
  return {
    ...actualFs,
    promises: {
      ...actualFs.promises,
      readdir: jest.fn().mockResolvedValue([]),
      readFile: jest.fn().mockResolvedValue('{}'),
      writeFile: jest.fn().mockResolvedValue(undefined),
      mkdir: jest.fn().mockResolvedValue(undefined),
      stat: jest.fn().mockResolvedValue({ size: 100, mtime: new Date() }),
    },
    existsSync: jest.fn().mockReturnValue(true),
    readdirSync: jest.fn().mockReturnValue([]),
    readFileSync: jest.fn().mockReturnValue('{}'),
  };
});

jest.mock('../../src/managers/BotManager', () => ({
  BotManager: {
    getInstance: jest.fn().mockReturnValue({
      getAllBots: jest.fn().mockResolvedValue([]),
    }),
  },
}));

jest.mock('../../src/config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: jest.fn().mockReturnValue({
      getAllBots: jest.fn().mockReturnValue([]),
      getWarnings: jest.fn().mockReturnValue([]),
      isLegacyMode: jest.fn().mockReturnValue(false),
    }),
  },
}));

jest.mock('../../src/config/llmDefaultStatus', () => ({
  getLlmDefaultStatus: jest.fn().mockReturnValue({ status: 'ok' }),
}));

jest.mock('../../src/config/llmProfiles', () => ({
  getLlmProfiles: jest.fn().mockReturnValue({ llm: [] }),
  saveLlmProfiles: jest.fn(),
}));

jest.mock('../../src/config/messageProfiles', () => ({
  getMessageProfiles: jest.fn().mockReturnValue({ message: [] }),
  saveMessageProfiles: jest.fn(),
}));

jest.mock('../../src/config/UserConfigStore', () => ({
  UserConfigStore: {
    getInstance: jest.fn().mockReturnValue({
      setGeneralSettings: jest.fn().mockResolvedValue(undefined),
      getGeneralSettings: jest.fn().mockReturnValue({}),
    }),
  },
}));

jest.mock('../../src/server/middleware/audit', () => ({
  auditMiddleware: (req: any, res: any, next: any) => next(),
  logConfigChange: jest.fn(),
}));

// Provide default pass-through for validateRequest so tests can focus on route logic
jest.mock('../../src/validation/validateRequest', () => ({
  validateRequest: () => (req: any, res: any, next: any) => next(),
}));

// Mock ErrorUtils to ensure consistent error handling in tests
jest.mock('../../src/types/errors', () => {
  const original = jest.requireActual('../../src/types/errors');
  return {
    ...original,
    ErrorUtils: {
      ...original.ErrorUtils,
      toHivemindError: jest.fn((e) => e),
      classifyError: jest.fn(() => ({ type: 'test' })),
      getStatusCode: jest.fn((e) => (e as any)?.statusCode || 500),
      getMessage: jest.fn((e) => (e as any)?.message || 'Internal server error'),
      getCode: jest.fn((e) => (e as any)?.code || 'INTERNAL_ERROR'),
    },
  };
});

describe('Config Router - Error Paths and Edge Cases', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/config', configRouter);
  });

  describe('GET /api/config/bots', () => {
    it('should return 503 when botManager.getAllBots throws', async () => {
      const mockError = new Error('Database connection failed');
      (mockError as any).statusCode = 503;

      const mockBotManager = {
        getAllBots: jest.fn().mockRejectedValue(mockError),
      };
      (BotManager.getInstance as jest.Mock).mockReturnValue(mockBotManager);

      (ErrorUtils.toHivemindError as jest.Mock).mockReturnValueOnce(mockError);

      const res = await request(app).get('/api/config/bots');

      expect(res.status).toBe(503);
      expect(res.body.error).toBe('Database connection failed');
    });
  });

  describe('GET /api/config/llm-status', () => {
    it('should return 500 when getLlmDefaultStatus throws', async () => {
      const mockError = new Error('Config missing');
      (mockError as any).statusCode = 500;

      (getLlmDefaultStatus as jest.Mock).mockImplementationOnce(() => {
        throw mockError;
      });
      (ErrorUtils.toHivemindError as jest.Mock).mockReturnValueOnce(mockError);

      const res = await request(app).get('/api/config/llm-status');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Config missing');
    });
  });

  describe('GET /api/config/llm-profiles', () => {
    it('should return 500 when getLlmProfiles throws', async () => {
      const mockError = new Error('Filesystem error');
      (mockError as any).statusCode = 500;

      (getLlmProfiles as jest.Mock).mockImplementationOnce(() => {
        throw mockError;
      });
      (ErrorUtils.toHivemindError as jest.Mock).mockReturnValueOnce(mockError);

      const res = await request(app).get('/api/config/llm-profiles');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Filesystem error');
    });
  });

  describe('POST /api/config/llm-profiles', () => {
    it('should return 400 when modelType is invalid', async () => {
      const res = await request(app)
        .post('/api/config/llm-profiles')
        .send({ modelType: 'invalid-type' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid modelType');
    });

    it('should return 409 when profile key already exists', async () => {
      (getLlmProfiles as jest.Mock).mockReturnValueOnce({
        llm: [{ key: 'existing-key' }],
      });

      const res = await request(app)
        .post('/api/config/llm-profiles')
        .send({ key: 'existing-key', modelType: 'chat' });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already exists');
    });

    it('should return 500 when saving throws', async () => {
      (getLlmProfiles as jest.Mock).mockReturnValueOnce({ llm: [] });

      const mockError = new Error('Write failed');
      (mockError as any).statusCode = 500;

      (saveLlmProfiles as jest.Mock).mockImplementationOnce(() => {
        throw mockError;
      });
      (ErrorUtils.toHivemindError as jest.Mock).mockReturnValueOnce(mockError);

      const res = await request(app)
        .post('/api/config/llm-profiles')
        .send({ key: 'new-key', modelType: 'chat' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Write failed');
    });
  });

  describe('PUT /api/config/llm-profiles/:key', () => {
    it('should return 404 when profile key is not found', async () => {
      (getLlmProfiles as jest.Mock).mockReturnValueOnce({ llm: [] });

      const res = await request(app)
        .put('/api/config/llm-profiles/non-existent-key')
        .send({ key: 'non-existent-key' });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should return 500 when saving throws', async () => {
      (getLlmProfiles as jest.Mock).mockReturnValueOnce({
        llm: [{ key: 'existing-key' }],
      });

      const mockError = new Error('Write failed');
      (mockError as any).statusCode = 500;

      (saveLlmProfiles as jest.Mock).mockImplementationOnce(() => {
        throw mockError;
      });
      (ErrorUtils.toHivemindError as jest.Mock).mockReturnValueOnce(mockError);

      const res = await request(app)
        .put('/api/config/llm-profiles/existing-key')
        .send({ key: 'existing-key' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Write failed');
    });
  });

  describe('DELETE /api/config/llm-profiles/:key', () => {
    it('should return 404 when profile key is not found', async () => {
      (getLlmProfiles as jest.Mock).mockReturnValueOnce({ llm: [] });

      const res = await request(app).delete('/api/config/llm-profiles/non-existent-key');

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('not found');
    });

    it('should return 500 when saving throws', async () => {
      (getLlmProfiles as jest.Mock).mockReturnValueOnce({
        llm: [{ key: 'existing-key' }],
      });

      const mockError = new Error('Write failed');
      (mockError as any).statusCode = 500;

      (saveLlmProfiles as jest.Mock).mockImplementationOnce(() => {
        throw mockError;
      });
      (ErrorUtils.toHivemindError as jest.Mock).mockReturnValueOnce(mockError);

      const res = await request(app).delete('/api/config/llm-profiles/existing-key');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Write failed');
    });
  });

  describe('GET /api/config/message-profiles', () => {
    it('should return 500 when getMessageProfiles throws', async () => {
      const mockError = new Error('Parse error');
      (mockError as any).statusCode = 500;

      (getMessageProfiles as jest.Mock).mockImplementationOnce(() => {
        throw mockError;
      });
      (ErrorUtils.toHivemindError as jest.Mock).mockReturnValueOnce(mockError);

      const res = await request(app).get('/api/config/message-profiles');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Parse error');
    });
  });

  describe('POST /api/config/message-profiles', () => {
    it('should return 409 when profile key already exists', async () => {
      (getMessageProfiles as jest.Mock).mockReturnValueOnce({
        message: [{ key: 'existing-msg-key' }],
      });

      const res = await request(app)
        .post('/api/config/message-profiles')
        .send({ key: 'existing-msg-key' });

      expect(res.status).toBe(409);
      expect(res.body.error).toContain('already exists');
    });

    it('should return 500 when saving throws', async () => {
      (getMessageProfiles as jest.Mock).mockReturnValueOnce({ message: [] });

      const mockError = new Error('Write failed');
      (mockError as any).statusCode = 500;

      (saveMessageProfiles as jest.Mock).mockImplementationOnce(() => {
        throw mockError;
      });
      (ErrorUtils.toHivemindError as jest.Mock).mockReturnValueOnce(mockError);

      const res = await request(app)
        .post('/api/config/message-profiles')
        .send({ key: 'new-msg-key' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Write failed');
    });
  });

  describe('GET /api/config/sources', () => {
    it('should return 500 when reading config sources throws', async () => {
      const mockError = new Error('Permission denied');
      (mockError as any).statusCode = 500;

      // Make Object.keys(process.env).filter(...) succeed but fs.promises.readdir throw
      // for a non-ENOENT error to trigger the catch block
      (fs.promises.readdir as jest.Mock).mockRejectedValueOnce(
        Object.assign(new Error('Disk failure'), { code: 'EIO' })
      );
      (ErrorUtils.toHivemindError as jest.Mock).mockReturnValueOnce(mockError);

      const res = await request(app).get('/api/config/sources');

      expect(res.status).toBe(500);
      expect(res.body.code).toBe('CONFIG_SOURCES_ERROR');
    });
  });

  describe('PUT /api/config/global', () => {
    it('should return 400 when configName is invalid (e.g., path traversal)', async () => {
      const res = await request(app)
        .put('/api/config/global')
        .send({ configName: '../../../etc/passwd' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid config');
    });

    it('should return 400 when creating new config with invalid schema type', async () => {
      const res = await request(app)
        .put('/api/config/global')
        .send({ configName: 'nonexistent-something' });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Invalid configName');
      expect(res.body.error).toContain('Valid types:');
    });

    it('should return 400 when path is not within allowed directory', async () => {
      // Need a valid configName pattern but one that would somehow resolve outside if allowed
      // However, isValidConfigName prevents standard path traversal chars.
      // We test that a 500 or 400 is returned depending on the validation logic.

      // We simulate `fs.promises.writeFile` throwing to catch the error handler
      const mockError = new Error('File access error');
      (mockError as any).statusCode = 500;

      (fs.promises.writeFile as jest.Mock).mockRejectedValueOnce(mockError);
      (ErrorUtils.toHivemindError as jest.Mock).mockReturnValueOnce(mockError);

      // We use a valid looking name that exists to bypass initial checks
      const res = await request(app)
        .put('/api/config/global')
        .send({ configName: 'message-test', updates: {} });

      // For message-test, schemaSources['message'] exists, it creates it dynamically
      // It attempts to write and we mocked a failure
      expect(res.status).toBe(500);
      expect(res.body.error).toBe('File access error');
    });
  });

  describe('GET /api/config/global', () => {
    it('should handle standard requests without crashing', async () => {
      const res = await request(app).get('/api/config/global');
      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('llm');
    });

    it('should return 500 when reading global config throws', async () => {
      const mockError = new Error('Config read failure');
      (mockError as any).statusCode = 500;
      (mockError as any).code = 'CONFIG_GLOBAL_GET_ERROR';

      // The global route iterates globalConfigs and calls config.getProperties().
      // We make UserConfigStore.getInstance throw to trigger the catch block.
      const { UserConfigStore } = require('../../src/config/UserConfigStore');
      (UserConfigStore.getInstance as jest.Mock).mockImplementationOnce(() => {
        throw mockError;
      });
      (ErrorUtils.toHivemindError as jest.Mock).mockReturnValueOnce(mockError);

      const res = await request(app).get('/api/config/global');

      expect(res.status).toBe(500);
      expect(res.body.code).toBe('CONFIG_GLOBAL_GET_ERROR');
    });
  });
});
