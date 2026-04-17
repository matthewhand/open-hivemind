import 'reflect-metadata';
import { RealTimeValidationService } from '../../../src/server/services/RealTimeValidationService';
import { BotConfigService } from '../../../src/server/services/BotConfigService';
import { ConfigurationValidator } from '../../../src/server/services/ConfigurationValidator';
import { ConfigurationTemplateService } from '../../../src/server/services/ConfigurationTemplateService';
import { DatabaseManager } from '../../../src/database/DatabaseManager';
import { container } from 'tsyringe';

describe('RealTimeValidationService Integration', () => {
  let service: RealTimeValidationService;
  let mockBotConfigService: any;

  beforeAll(() => {
    mockBotConfigService = {
      getBotConfig: jest.fn(),
    };
    
    // Mock other dependencies
    const mockConfigValidator = {
      validateBotConfig: jest.fn().mockReturnValue({ isValid: true, errors: [] })
    };
    const mockTemplateService = {};
    const mockDbManager = {
      getInstance: jest.fn().mockReturnThis()
    };
    
    // Register dependencies
    container.registerInstance(BotConfigService as any, mockBotConfigService);
    container.registerInstance(ConfigurationValidator as any, mockConfigValidator);
    container.registerInstance(ConfigurationTemplateService as any, mockTemplateService);
    container.registerInstance(DatabaseManager as any, mockDbManager);
    
    // Resolve from container to get mocked dependencies injected
    service = container.resolve(RealTimeValidationService);
  });

  afterAll(() => {
    service.shutdown();
    jest.restoreAllMocks();
  });

  it('should validate a valid configuration correctly', async () => {
    const validConfig = {
      id: 1,
      name: 'valid-bot',
      messageProvider: 'discord',
      llmProvider: 'openai',
      discord: { token: 'valid.token.here' },
      openai: { apiKey: 'sk-validkey' }
    };

    mockBotConfigService.getBotConfig.mockResolvedValue(validConfig);

    const report = await service.validateConfiguration(1, 'standard');
    
    expect(report.result.isValid).toBe(true);
    expect(report.result.score).toBeGreaterThanOrEqual(90);
    expect(report.configName).toBe('valid-bot');
  });

  it('should detect missing required fields', async () => {
    const invalidConfig = {
      id: 2,
      name: '', // Empty name
      messageProvider: 'discord',
      // missing llmProvider
    };

    mockBotConfigService.getBotConfig.mockResolvedValue(invalidConfig);

    const report = await service.validateConfiguration(2, 'quick');
    
    expect(report.result.isValid).toBe(false);
    expect(report.result.errors.some(e => e.field === 'name')).toBe(true);
    expect(report.result.errors.some(e => e.field === 'llmProvider')).toBe(true);
  });

  it('should detect invalid formats', async () => {
    const invalidFormatConfig = {
      id: 3,
      name: 'Invalid Bot Name!', // Special characters not allowed
      messageProvider: 'discord',
      llmProvider: 'openai',
      discord: { token: 'invalid-token' }
    };

    mockBotConfigService.getBotConfig.mockResolvedValue(invalidFormatConfig);

    const report = await service.validateConfiguration(3, 'standard');
    
    expect(report.result.isValid).toBe(false);
    expect(report.result.errors.some(e => e.ruleId === 'format-bot-name')).toBe(true);
  });

  it('should handle direct data validation', () => {
    const data = {
      name: 'test-bot',
      messageProvider: 'slack',
      llmProvider: 'openai',
      openai: { apiKey: '${OPENAI_API_KEY}' } // Use var to avoid security warning
    };

    const result = service.validateConfigurationData(data, 'standard');
    expect(result.isValid).toBe(true);
    expect(result.score).toBe(100);
  });
});
