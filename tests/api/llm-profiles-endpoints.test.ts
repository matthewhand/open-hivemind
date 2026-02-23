import express from 'express';
import request from 'supertest';
import { getLlmProfiles, saveLlmProfiles } from '../../src/config/llmProfiles';
import configRouter from '../../src/server/routes/config';

// Define mocks
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

jest.mock('../../src/server/middleware/audit', () => ({
  auditMiddleware: (req: any, res: any, next: any) => next(),
  logConfigChange: jest.fn(),
}));

// Mock ErrorUtils to avoid issues
jest.mock('../../src/types/errors', () => {
  const original = jest.requireActual('../../src/types/errors');
  return {
    ...original,
    ErrorUtils: {
      ...original.ErrorUtils,
      toHivemindError: jest.fn((e) => e),
      classifyError: jest.fn(() => ({ type: 'test' })),
    },
  };
});

const mockGetLlmProfiles = getLlmProfiles as jest.Mock;
const mockSaveLlmProfiles = saveLlmProfiles as jest.Mock;

describe('LLM Profiles API Endpoints', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use(express.json());
    app.use('/api/config', configRouter);
  });

  describe('PUT /api/config/llm-profiles/:key', () => {
    it('should update an existing LLM profile', async () => {
      const existingProfiles = {
        llm: [
          {
            key: 'existing-profile',
            name: 'Existing Profile',
            provider: 'openai',
            config: { apiKey: 'old-key' },
          },
        ],
      };
      mockGetLlmProfiles.mockReturnValue(existingProfiles);

      const updates = {
        key: 'existing-profile',
        name: 'Updated Profile',
        provider: 'openai',
        config: { apiKey: 'new-key' },
      };

      const response = await request(app)
        .put('/api/config/llm-profiles/existing-profile')
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.profile).toEqual(expect.objectContaining(updates));

      // Verify saveLlmProfiles was called with updated data
      expect(mockSaveLlmProfiles).toHaveBeenCalledWith({
        llm: [
          expect.objectContaining({
            key: 'existing-profile',
            name: 'Updated Profile',
            provider: 'openai',
            config: { apiKey: 'new-key' },
          }),
        ],
      });
    });

    it('should return 404 if profile does not exist', async () => {
      mockGetLlmProfiles.mockReturnValue({ llm: [] });

      await request(app)
        .put('/api/config/llm-profiles/non-existent')
        .send({ key: 'non-existent', name: 'New', provider: 'openai', config: {} })
        .expect(404);

      expect(mockSaveLlmProfiles).not.toHaveBeenCalled();
    });

    it('should handle case-insensitive key matching', async () => {
      const existingProfiles = {
        llm: [
          {
            key: 'MyProfile',
            name: 'My Profile',
            provider: 'openai',
            config: {},
          },
        ],
      };
      mockGetLlmProfiles.mockReturnValue(existingProfiles);

      const updates = {
        key: 'MyProfile',
        name: 'Updated',
        provider: 'openai',
        config: {},
      };

      await request(app)
        .put('/api/config/llm-profiles/myprofile') // lowercase key in URL
        .send(updates)
        .expect(200);

      expect(mockSaveLlmProfiles).toHaveBeenCalled();
    });
  });
});
