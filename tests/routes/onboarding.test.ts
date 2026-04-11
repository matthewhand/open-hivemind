import express from 'express';
import request from 'supertest';

// Mock fs before any imports that might use it
jest.mock('fs', () => {
  const actual = jest.requireActual('fs');
  return {
    ...actual,
    existsSync: jest.fn().mockReturnValue(false),
    readFileSync: jest.fn(),
    promises: {
      mkdir: jest.fn().mockResolvedValue(undefined),
      writeFile: jest.fn().mockResolvedValue(undefined),
    },
  };
});

jest.mock('../../src/managers/BotManager', () => ({
  BotManager: {
    getInstance: jest.fn().mockResolvedValue({
      getAllBots: jest.fn().mockResolvedValue([]),
    }),
  },
}));

jest.mock('../../src/config/llmDefaultStatus', () => ({
  getLlmDefaultStatus: jest.fn().mockReturnValue({ configured: false }),
}));

jest.mock('../../src/common/StructuredLogger', () => ({
  createLogger: jest.fn().mockReturnValue({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  }),
}));

// Mock monitoring/MetricsCollector to avoid heavy dependencies
jest.mock('../../src/monitoring/MetricsCollector', () => ({
  MetricsCollector: {
    getInstance: jest.fn().mockReturnValue({
      recordApiCall: jest.fn(),
      recordError: jest.fn(),
    }),
  },
}));

import fs from 'fs';

describe('Onboarding Routes', () => {
  let app: express.Application;
  let onboardingRouter: any;
  const mockWriteFile = fs.promises.writeFile as jest.Mock;
  const mockMkdir = fs.promises.mkdir as jest.Mock;
  const mockExistsSync = fs.existsSync as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    mockExistsSync.mockReturnValue(false);
    mockWriteFile.mockResolvedValue(undefined);
    mockMkdir.mockResolvedValue(undefined);

    // Re-load the router fresh each test to reset in-memory state
    jest.isolateModules(() => {
      onboardingRouter = require('../../src/server/routes/onboarding').default;
    });

    app = express();
    app.use(express.json());
    app.use('/', onboardingRouter);
  });

  describe('GET /status', () => {
    it('returns completed: false by default when no bots or LLM configured', async () => {
      const res = await request(app).get('/status');
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.completed).toBe(false);
    });

    it('returns completed: true when bots exist and LLM is configured', async () => {
      const { BotManager } = require('../../src/managers/BotManager');
      const { getLlmDefaultStatus } = require('../../src/config/llmDefaultStatus');

      (BotManager.getInstance as jest.Mock).mockResolvedValue({
        getAllBots: jest.fn().mockResolvedValue([{ id: 'bot1' }]),
      });
      (getLlmDefaultStatus as jest.Mock).mockReturnValue({ configured: true });

      // Re-load router with updated mocks
      jest.isolateModules(() => {
        onboardingRouter = require('../../src/server/routes/onboarding').default;
      });
      app = express();
      app.use(express.json());
      app.use('/', onboardingRouter);

      const res = await request(app).get('/status');
      expect(res.status).toBe(200);
      expect(res.body.data.completed).toBe(true);
    });
  });

  describe('POST /complete', () => {
    it('sets completed to true and subsequent GET /status returns completed: true', async () => {
      const postRes = await request(app).post('/complete').send({});
      expect(postRes.status).toBe(200);
      expect(postRes.body.data.completed).toBe(true);
      expect(postRes.body.data.step).toBe(5);

      // Subsequent GET should reflect completed state without checking bots/LLM
      const getRes = await request(app).get('/status');
      expect(getRes.status).toBe(200);
      expect(getRes.body.data.completed).toBe(true);
    });

    it('calls fs.promises.writeFile with completed: true', async () => {
      await request(app).post('/complete').send({});
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(writtenContent.completed).toBe(true);
      expect(writtenContent.step).toBe(5);
    });
  });

  describe('POST /reset', () => {
    it('sets completed back to false after completing', async () => {
      // First complete onboarding
      await request(app).post('/complete').send({});

      // Then reset
      const resetRes = await request(app).post('/reset').send({});
      expect(resetRes.status).toBe(200);
      expect(resetRes.body.data.completed).toBe(false);
      expect(resetRes.body.data.step).toBe(1);
    });

    it('calls fs.promises.writeFile with completed: false after reset', async () => {
      await request(app).post('/complete').send({});
      jest.clearAllMocks();
      mockWriteFile.mockResolvedValue(undefined);

      await request(app).post('/reset').send({});
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(writtenContent.completed).toBe(false);
      expect(writtenContent.step).toBe(1);
    });
  });

  describe('POST /step', () => {
    it('updates the step number', async () => {
      const res = await request(app).post('/step').send({ step: 3 });
      expect(res.status).toBe(200);
      expect(res.body.data.step).toBe(3);
    });

    it('calls fs.promises.writeFile with the updated step', async () => {
      await request(app).post('/step').send({ step: 4 });
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      const writtenContent = JSON.parse(mockWriteFile.mock.calls[0][1]);
      expect(writtenContent.step).toBe(4);
    });

    it('returns 400 for invalid step values outside 1-5', async () => {
      const res = await request(app).post('/step').send({ step: 99 });
      expect(res.status).toBe(400);
    });

    it('returns 400 when step is missing', async () => {
      const res = await request(app).post('/step').send({});
      expect(res.status).toBe(400);
    });
  });

  describe('State persistence', () => {
    it('loads saved state from file on startup', () => {
      const mockReadFileSync = fs.readFileSync as jest.Mock;
      mockExistsSync.mockReturnValue(true);
      mockReadFileSync.mockReturnValue(JSON.stringify({ completed: true, step: 5 }));

      let routerFromFile: any;
      jest.isolateModules(() => {
        routerFromFile = require('../../src/server/routes/onboarding').default;
      });

      const testApp = express();
      testApp.use(express.json());
      testApp.use('/', routerFromFile);

      // The router loaded state from the mock file — GET /status should return completed: true
      return request(testApp)
        .get('/status')
        .then(res => {
          expect(res.status).toBe(200);
          expect(res.body.data.completed).toBe(true);
        });
    });

    it('writeFile is called with correct JSON structure on POST /complete', async () => {
      await request(app).post('/complete').send({});
      expect(mockMkdir).toHaveBeenCalledTimes(1);
      expect(mockWriteFile).toHaveBeenCalledTimes(1);
      const [, content, encoding] = mockWriteFile.mock.calls[0];
      const parsed = JSON.parse(content);
      expect(parsed).toEqual({ completed: true, step: 5 });
      expect(encoding).toBe('utf8');
    });
  });
});
