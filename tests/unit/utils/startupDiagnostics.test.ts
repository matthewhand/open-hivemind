import { StartupDiagnostics } from '../../../src/utils/startupDiagnostics';
import { Logger } from '../../../src/common/logger';

// Mock Logger
jest.mock('../../../src/common/logger', () => {
  const mLogger = {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  };
  return {
    Logger: {
      withContext: jest.fn(() => mLogger),
    },
  };
});

describe('StartupDiagnostics', () => {
  let diagnostics: StartupDiagnostics;
  let originalEnv: NodeJS.ProcessEnv;
  let mockLogger: any;

  beforeEach(() => {
    diagnostics = StartupDiagnostics.getInstance();
    originalEnv = process.env;
    mockLogger = Logger.withContext('test');

    // Clear mocks
    jest.clearAllMocks();
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('analyzeEnvironmentVariables', () => {
    it('categorizes critical, warning, and info variables correctly', () => {
      process.env = {
        NODE_ENV: 'test',
        DISCORD_BOT_TOKEN: 'discord_token',
        PORT: '3000',
      };

      const summary = diagnostics.analyzeEnvironmentVariables();

      // Critical
      const nodeEnv = summary.critical.find(v => v.key === 'NODE_ENV');
      expect(nodeEnv?.status).toBe('present');

      // Warning
      const discordToken = summary.warning.find(v => v.key === 'DISCORD_BOT_TOKEN');
      expect(discordToken?.status).toBe('present');

      const slackToken = summary.warning.find(v => v.key === 'SLACK_BOT_TOKEN');
      expect(slackToken?.status).toBe('missing');

      // Info
      const port = summary.info.find(v => v.key === 'PORT');
      expect(port?.status).toBe('present');

      const webhookSecret = summary.info.find(v => v.key === 'WEBHOOK_SECRET');
      expect(webhookSecret?.status).toBe('missing');
    });
  });

  describe('logEnvironmentSummary', () => {
    it('throws error when critical variables are missing', async () => {
      // Missing NODE_ENV
      process.env = {};

      // logEnvironmentSummary is async, so we use rejects.toThrow but pass the promise
      await expect((diagnostics as any).logEnvironmentSummary()).rejects.toThrow(
        'Critical configuration missing: NODE_ENV'
      );

      expect(mockLogger.error).toHaveBeenCalledWith(
        '⛔ Critical Configuration Missing',
        expect.any(Object)
      );
    });

    it('logs warning when warning variables are missing but does not throw', async () => {
      // Has critical, missing warning vars
      process.env = {
        NODE_ENV: 'test',
      };

      await expect((diagnostics as any).logEnvironmentSummary()).resolves.toBeUndefined();

      expect(mockLogger.warn).toHaveBeenCalledWith(
        '⚠️  Warning Configuration',
        expect.objectContaining({
          missing: expect.arrayContaining(['DISCORD_BOT_TOKEN', 'OPENAI_API_KEY']),
        })
      );
    });

    it('logs info when info variables are missing but does not throw', async () => {
      // Has critical and warning, missing info vars like PORT
      process.env = {
        NODE_ENV: 'test',
        DISCORD_BOT_TOKEN: 'token',
        OPENAI_API_KEY: 'token',
      };

      await expect((diagnostics as any).logEnvironmentSummary()).resolves.toBeUndefined();

      // We expect info to be logged for missing info variables, not warnings or errors
      expect(mockLogger.info).toHaveBeenCalledWith(
        'ℹ️  Info Configuration',
        expect.objectContaining({
          missing: expect.arrayContaining(['PORT', 'MESSAGE_PROVIDER']),
        })
      );
    });
  });
});
