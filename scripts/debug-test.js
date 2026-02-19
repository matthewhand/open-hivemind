// Set environment to test
process.env.NODE_ENV = 'test';

// Import Jest
require('@jest/globals');

const { jest } = require('@jest/globals');
const express = require('express');
const request = require('supertest');

// Mock the modules before importing
jest.mock('../../src/config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: () => ({
      getAllBots: () => [{
        id: 'test-bot-id',
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        isActive: true,
        envOverrides: {},
        discord: {
          token: 'test-discord-token',
          clientId: '123456789',
          guildId: '987654321'
        },
        openai: {
          apiKey: 'test-openai-key',
          baseUrl: 'https://api.openai.com/v1'
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }],
      getWarnings: () => [],
      isLegacyMode: () => false,
      reload: () => {},
      getBot: () => undefined,
      getBotConfig: () => undefined,
      getBotConfigs: () => [],
      getBotCount: () => 1,
      getActiveBotCount: () => 1,
      getBotNames: () => ['test-bot'],
    })
  }
}));

jest.mock('../../src/config/UserConfigStore', () => ({
  UserConfigStore: {
    getInstance: () => ({
      getBotOverride: () => ({}),
      getToolConfig: () => undefined,
      setToolConfig: () => {},
      setBotOverride: () => {},
    })
  }
}));

jest.mock('../../src/common/redactSensitiveInfo', () => ({
  redactSensitiveInfo: (key, value) => {
    if (typeof value === 'string' && (key.toLowerCase().includes('token') || key.toLowerCase().includes('key'))) {
      return 'test**********key';
    }
    return value;
  }
}));

jest.mock('../../src/server/middleware/audit', () => ({
  auditMiddleware: (req, res, next) => {
    req.auditUser = 'test-user';
    req.auditIp = '127.0.0.1';
    req.auditUserAgent = 'test-agent';
    req.user = { id: 'test-id', username: 'test-user' };
    next();
  },
  logConfigChange: jest.fn(),
}));

jest.mock('../../src/types/errors', () => {
  const originalModule = jest.requireActual('../../src/types/errors');
  return {
    ...originalModule,
    ErrorUtils: {
      ...originalModule.ErrorUtils,
      toHivemindError: jest.fn((error) => {
        const message = error?.message || 'Unknown error';
        let statusCode = 200;
        
        if (message.includes('Test error') ||
            message.includes('Config retrieval failed') ||
            message.includes('Reload failed') ||
            message.includes('Cache clear failed') ||
            message.includes('Export failed') ||
            message.includes('Database error') ||
            message.includes('File system error') ||
            message.includes('Database connection failed') ||
            message.includes('Config reload failed') ||
            message.includes('Cache clear operation failed') ||
            message.includes('Export operation failed')) {
          statusCode = 500;
        } else if (message.includes('not found') || message.includes('does not exist')) {
          statusCode = 404;
        } else if (message.includes('invalid') || message.includes('bad request') || message.includes('malformed')) {
          statusCode = 400;
        } else if (message.includes('unauthorized') || message.includes('authentication')) {
          statusCode = 401;
        } else if (message.includes('forbidden')) {
          statusCode = 403;
        } else if (message.includes('already exists') || message.includes('duplicate')) {
          statusCode = 409;
        }
        
        return {
          message,
          statusCode,
          code: 'TEST_ERROR',
          stack: error?.stack
        };
      }),
      classifyError: jest.fn(() => ({
        type: 'test',
        retryable: false,
        severity: 'low',
        userMessage: undefined,
        logLevel: 'error'
      }))
    },
  };
});

jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  readdirSync: jest.fn().mockReturnValue([]),
  statSync: jest.fn().mockReturnValue({ size: 0, mtime: new Date() }),
}));

jest.mock('path', () => ({
  ...jest.requireActual('path'),
  join: (...args) => args.join('/'),
}));

// Now import the config router
const configRouter = require('../../src/server/routes/config').default;

const app = express();
app.use(express.json());
app.use(configRouter);

async function testEndpoints() {
  console.log('Testing GET /api/config...');
  try {
    const response = await request(app).get('/api/config');
    console.log('GET /api/config status:', response.status);
    console.log('GET /api/config body:', JSON.stringify(response.body, null, 2));
  } catch (error) {
    console.error('GET /api/config error:', error.message);
  }

  console.log('\nTesting POST /api/config/reload...');
  try {
    const response = await request(app).post('/api/config/reload');
    console.log('POST /api/config/reload status:', response.status);
    console.log('POST /api/config/reload body:', JSON.stringify(response.body, null, 2));
  } catch (error) {
    console.error('POST /api/config/reload error:', error.message);
  }

  console.log('\nTesting POST /api/cache/clear...');
  try {
    const response = await request(app).post('/api/cache/clear');
    console.log('POST /api/cache/clear status:', response.status);
    console.log('POST /api/cache/clear body:', JSON.stringify(response.body, null, 2));
  } catch (error) {
    console.error('POST /api/cache/clear error:', error.message);
  }

  console.log('\nTesting GET /api/config/export...');
  try {
    const response = await request(app).get('/api/config/export');
    console.log('GET /api/config/export status:', response.status);
    console.log('GET /api/config/export headers:', response.headers);
    if (response.status === 200) {
      console.log('GET /api/config/export body (first 200 chars):', response.text.substring(0, 200));
    } else {
      console.log('GET /api/config/export body:', JSON.stringify(response.body, null, 2));
    }
  } catch (error) {
    console.error('GET /api/config/export error:', error.message);
  }
}

testEndpoints().then(() => {
  console.log('\nTest completed');
  process.exit(0);
}).catch(error => {
  console.error('Test failed:', error);
  process.exit(1);
});