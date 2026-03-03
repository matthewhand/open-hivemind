import express from 'express';
import request from 'supertest';
import { getLlmDefaultStatus } from '../../src/config/llmDefaultStatus';
import configRouter from '../../src/server/routes/config';

// Define mocks
jest.mock('../../src/config/llmDefaultStatus', () => ({
  getLlmDefaultStatus: jest.fn(),
}));

jest.mock('../../src/config/llmProfiles', () => ({
  getLlmProfiles: jest.fn(),
  saveLlmProfiles: jest.fn(),
}));

jest.mock('../../src/config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: () => ({
      getAllBots: jest.fn().mockReturnValue([]),
      getWarnings: jest.fn().mockReturnValue([]),
      isLegacyMode: jest.fn().mockReturnValue(false),
    }),
  },
}));

jest.mock('../../src/managers/BotManager', () => ({
  BotManager: {
    getInstance: () => ({
      getAllBots: jest.fn().mockResolvedValue([]),
    }),
  },
}));

jest.mock('../../src/server/middleware/audit', () => ({
  auditMiddleware: (req: any, res: any, next: any) => next(),
  logConfigChange: jest.fn(),
}));

jest.mock('../../src/types/errors', () => {
  const original = jest.requireActual('../../src/types/errors');
  return {
    ...original,
    ErrorUtils: {
      ...original.ErrorUtils,
      toHivemindError: jest.fn((e) => ({
        message: e.message || 'Unknown Error',
        statusCode: 500,
      })),
    },
  };
});

const mockGetLlmDefaultStatus = getLlmDefaultStatus as jest.Mock;

describe('LLM Status API Endpoint', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/config', configRouter);
  });

  describe('GET /api/config/llm-status', () => {
    it('should return LLM status', async () => {
      const mockStatus = {
        configured: true,
        providers: [{ id: 'openai', name: 'OpenAI', type: 'openai' }],
        libraryStatus: {},
      };
      mockGetLlmDefaultStatus.mockReturnValue(mockStatus);

      const response = await request(app).get('/api/config/llm-status').expect(200);

      expect(response.body).toEqual(mockStatus);
    });

    it('should handle errors', async () => {
      mockGetLlmDefaultStatus.mockImplementation(() => {
        throw new Error('Test Error');
      });

      const response = await request(app).get('/api/config/llm-status').expect(500);

      expect(response.body.error).toBe('Test Error');
    });
  });
});
