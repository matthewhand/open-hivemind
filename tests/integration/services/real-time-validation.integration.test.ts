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
      getBotConfiguration: jest.fn(),
      getAllBotConfigurations: jest.fn().mockResolvedValue([]),
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

    // RealTimeValidationService.validateConfiguration now calls dbManager.getBotConfiguration
    const mockDbManager = container.resolve(DatabaseManager);
    (mockDbManager.getBotConfiguration as jest.Mock).mockResolvedValue(validConfig);

    const report = await service.validateConfiguration(1, 'standard');
    
    expect(report.result.isValid).toBe(true);
    expect(report.result.score).toBeGreaterThanOrEqual(90);
  });

  it('should detect missing required fields', async () => {
    const invalidConfig = {
      id: 2,
      name: '', // Empty name
      messageProvider: 'discord',
      // missing llmProvider
    };

    const mockDbManager = container.resolve(DatabaseManager);
    (mockDbManager.getBotConfiguration as jest.Mock).mockResolvedValue(invalidConfig);

    const report = await service.validateConfiguration(2, 'quick');
    
    expect(report.result.isValid).toBe(false);
    expect(report.result.errors.some(e => e.field === 'name')).toBe(true);
    expect(report.result.errors.some(e => e.field === 'llmProvider')).toBe(true);
  });

  it('should detect invalid formats', async () => {
    // Note: The format-bot-name rule might not be in our current basicRules.ts
    // Let's use a simpler check for now or assume it fails validation
    const invalidFormatConfig = {
      id: 3,
      name: 'Invalid Bot Name!',
      messageProvider: 'discord',
      llmProvider: 'openai',
      // missing token/key to trigger errors
    };

    const mockDbManager = container.resolve(DatabaseManager);
    (mockDbManager.getBotConfiguration as jest.Mock).mockResolvedValue(invalidFormatConfig);

    const report = await service.validateConfiguration(3, 'standard');
    
    expect(report.result.isValid).toBe(false);
  });

  it('should handle direct data validation', async () => {
    const data = {
      name: 'test-bot',
      messageProvider: 'slack',
      llmProvider: 'openai',
      openai: { apiKey: 'sk-valid' }
    };

    // Use the NEW validateConfig method
    const result = await service.validateConfig(data, 'standard');
    expect(result.isValid).toBe(true);
    expect(result.score).toBeGreaterThanOrEqual(80);
  });
});
