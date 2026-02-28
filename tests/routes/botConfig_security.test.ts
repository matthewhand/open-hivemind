import express from 'express';
import request from 'supertest';
import { BotConfigurationManager } from '../../src/config/BotConfigurationManager';

// Mock auth middleware to bypass checks
jest.mock('../../src/auth/middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { username: 'admin', role: 'admin' };
    next();
  },
  requireAdmin: (req: any, res: any, next: any) => next(),
  requireRole: () => (req: any, res: any, next: any) => next(),
}));

// Mock DatabaseManager
jest.mock('../../src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: jest.fn().mockReturnValue({
      isConnected: jest.fn().mockReturnValue(true),
      createApprovalRequest: jest.fn().mockResolvedValue(1),
    }),
  },
}));

// Mock BotConfigurationManager
jest.mock('../../src/config/BotConfigurationManager');

// Mock SecureConfigManager
jest.mock('../../src/config/SecureConfigManager', () => ({
  SecureConfigManager: {
    getInstance: jest.fn().mockReturnValue({}),
  },
}));

// Mock UserConfigStore
jest.mock('../../src/config/UserConfigStore', () => ({
  UserConfigStore: {
    getInstance: jest.fn().mockReturnValue({
      getBotOverride: jest.fn().mockReturnValue({}),
    }),
  },
}));

// Mock ConfigurationValidator
jest.mock('../../src/server/services/ConfigurationValidator', () => {
  return {
    ConfigurationValidator: jest.fn().mockImplementation(() => ({
      validateBotConfigWithSchema: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
      validateBotConfig: jest
        .fn()
        .mockReturnValue({ isValid: true, errors: [], warnings: [], suggestions: [] }),
    })),
  };
});

describe('Bot Config Security Reproduction', () => {
  let app: express.Application;
  let mockBotConfigManager: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockBotConfigManager = {
      getBot: jest.fn().mockReturnValue({
        name: 'valid-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      }),
      getAllBots: jest.fn().mockReturnValue([]),
      getWarnings: jest.fn().mockReturnValue([]),
      isLegacyMode: jest.fn().mockReturnValue(false),
    };

    (BotConfigurationManager.getInstance as jest.Mock).mockReturnValue(mockBotConfigManager);

    app = express();
    app.use(express.json());

    // Mount the router
    const botConfigRouter = require('../../src/server/routes/botConfig').default;
    app.use('/api/bot-config', botConfigRouter);
  });

  it('PUT /api/bot-config/:botId should reject invalid name', async () => {
    // Attempt to update with an invalid name (contains space and exclamation)
    // The strict regex in validateBotConfigUpdate is /^[a-zA-Z0-9_-]+$/
    const invalidUpdate = {
      name: 'Invalid Name!',
    };

    const res = await request(app).put('/api/bot-config/bot123').send(invalidUpdate);

    // DESIRED BEHAVIOR: 400 Bad Request
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation failed');
  });
});
