import { RealTimeValidationService } from '../../../../src/server/services/RealTimeValidationService';
import { BotConfigService } from '../../../../src/server/services/BotConfigService';
import { ConfigurationTemplateService } from '../../../../src/server/services/ConfigurationTemplateService';
import { ConfigurationValidator } from '../../../../src/server/services/ConfigurationValidator';
import { DatabaseManager } from '../../../../src/database/DatabaseManager';

jest.mock('../../../../src/server/services/BotConfigService');
jest.mock('../../../../src/server/services/ConfigurationTemplateService');
jest.mock('../../../../src/server/services/ConfigurationValidator');
jest.mock('../../../../src/database/DatabaseManager');

describe('RealTimeValidationService', () => {
  let service: RealTimeValidationService;
  let mockBotConfigService: jest.Mocked<BotConfigService>;
  let mockValidator: jest.Mocked<ConfigurationValidator>;

  beforeEach(() => {
    jest.clearAllMocks();
    (RealTimeValidationService as any).instance = null;

    // Mock dependencies
    mockBotConfigService = {
      getBotConfig: jest.fn(),
    } as any;

    mockValidator = {
      validateBotConfig: jest.fn().mockReturnValue({ isValid: true, errors: [], warnings: [] }),
    } as any;

    (BotConfigService.getInstance as jest.Mock).mockReturnValue(mockBotConfigService);
    (ConfigurationValidator as jest.Mock).mockImplementation(() => mockValidator);
    (ConfigurationTemplateService.getInstance as jest.Mock).mockReturnValue({});
    (DatabaseManager.getInstance as jest.Mock).mockReturnValue({});

    service = RealTimeValidationService.getInstance();
  });

  afterEach(() => {
    service.shutdown();
    (RealTimeValidationService as any).instance = null;
  });

  describe('initialization', () => {
    test('should initialize with default rules', () => {
      const rules = service.getAllRules();
      expect(rules.length).toBeGreaterThan(0);

      const ruleIds = rules.map((r) => r.id);
      expect(ruleIds).toContain('required-name');
      expect(ruleIds).toContain('required-message-provider');
      expect(ruleIds).toContain('required-llm-provider');
    });

    test('should initialize with default profiles', () => {
      const profiles = service.getAllProfiles();
      expect(profiles.length).toBeGreaterThan(0);

      const profileIds = profiles.map((p) => p.id);
      expect(profileIds).toContain('strict');
      expect(profileIds).toContain('standard');
      expect(profileIds).toContain('quick');
    });

    test('should have standard profile as default', () => {
      const profiles = service.getAllProfiles();
      const standardProfile = profiles.find((p) => p.id === 'standard');
      expect(standardProfile?.isDefault).toBe(true);
    });
  });

  describe('rule management', () => {
    test('should add custom rule', () => {
      const customRule = {
        id: 'custom-rule',
        name: 'Custom Rule',
        description: 'A custom validation rule',
        category: 'business' as const,
        severity: 'warning' as const,
        validator: () => ({ isValid: true, errors: [], warnings: [], info: [], score: 100 }),
      };

      service.addRule(customRule);

      const rule = service.getRule('custom-rule');
      expect(rule).toBeDefined();
      expect(rule?.name).toBe('Custom Rule');
    });

    test('should remove rule', () => {
      const removed = service.removeRule('required-name');
      expect(removed).toBe(true);

      const rule = service.getRule('required-name');
      expect(rule).toBeUndefined();
    });

    test('should return false when removing non-existent rule', () => {
      const removed = service.removeRule('non-existent-rule');
      expect(removed).toBe(false);
    });

    test('should get all rules', () => {
      const rules = service.getAllRules();
      expect(Array.isArray(rules)).toBe(true);
      expect(rules.length).toBeGreaterThan(0);
    });
  });

  describe('profile management', () => {
    test('should add custom profile', () => {
      const customProfile = {
        id: 'custom-profile',
        name: 'Custom Profile',
        description: 'A custom validation profile',
        ruleIds: ['required-name'],
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      service.addProfile(customProfile);

      const profile = service.getProfile('custom-profile');
      expect(profile).toBeDefined();
      expect(profile?.name).toBe('Custom Profile');
    });

    test('should remove profile', () => {
      const removed = service.removeProfile('quick');
      expect(removed).toBe(true);

      const profile = service.getProfile('quick');
      expect(profile).toBeUndefined();
    });

    test('should remove subscriptions when removing profile', () => {
      service.subscribe(1, 'client-1', 'standard');
      const removed = service.removeProfile('standard');
      expect(removed).toBe(true);
    });
  });

  describe('validateConfiguration', () => {
    test('should validate configuration successfully', async () => {
      const mockConfig = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'test-token' },
        openai: { apiKey: 'test-key' },
      };

      mockBotConfigService.getBotConfig.mockResolvedValue(mockConfig as any);

      const report = await service.validateConfiguration(1, 'standard');

      expect(report).toBeDefined();
      expect(report.configId).toBe(1);
      expect(report.configName).toBe('test-bot');
      expect(report.result.isValid).toBe(true);
      expect(report.rulesExecuted).toBeGreaterThan(0);
    });

    test('should detect validation errors', async () => {
      const mockConfig = {
        name: '', // Invalid: empty name
        messageProvider: 'discord',
        llmProvider: 'openai',
      };

      mockBotConfigService.getBotConfig.mockResolvedValue(mockConfig as any);

      const report = await service.validateConfiguration(1, 'standard');

      expect(report.result.isValid).toBe(false);
      expect(report.result.errors.length).toBeGreaterThan(0);
    });

    test('should handle non-existent configuration', async () => {
      mockBotConfigService.getBotConfig.mockResolvedValue(null);

      const report = await service.validateConfiguration(999, 'standard');

      expect(report.result.isValid).toBe(false);
      expect(report.result.errors[0].message).toContain('not found');
    });

    test('should handle non-existent profile', async () => {
      const mockConfig = { name: 'test-bot', messageProvider: 'discord', llmProvider: 'openai' };
      mockBotConfigService.getBotConfig.mockResolvedValue(mockConfig as any);

      const report = await service.validateConfiguration(1, 'non-existent-profile');

      expect(report.result.isValid).toBe(false);
      expect(report.result.errors[0].message).toContain('profile');
    });

    test('should calculate validation score', async () => {
      const mockConfig = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'test-token' },
        openai: { apiKey: 'test-key' },
      };

      mockBotConfigService.getBotConfig.mockResolvedValue(mockConfig as any);

      const report = await service.validateConfiguration(1, 'standard');

      expect(report.result.score).toBeGreaterThanOrEqual(0);
      expect(report.result.score).toBeLessThanOrEqual(100);
    });

    test('should emit validationCompleted event', async (done) => {
      const mockConfig = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      };

      mockBotConfigService.getBotConfig.mockResolvedValue(mockConfig as any);

      service.on('validationCompleted', (report) => {
        expect(report.configId).toBe(1);
        done();
      });

      await service.validateConfiguration(1, 'standard');
    });

    test('should emit validationFailed event on errors', async (done) => {
      const mockConfig = { name: '', messageProvider: 'discord', llmProvider: 'openai' };
      mockBotConfigService.getBotConfig.mockResolvedValue(mockConfig as any);

      service.on('validationFailed', (report) => {
        expect(report.result.isValid).toBe(false);
        done();
      });

      await service.validateConfiguration(1, 'standard');
    });

    test('should measure execution time', async () => {
      const mockConfig = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      };
      mockBotConfigService.getBotConfig.mockResolvedValue(mockConfig as any);

      const report = await service.validateConfiguration(1, 'standard');

      expect(report.executionTime).toBeGreaterThan(0);
    });
  });

  describe('validateConfigurationData', () => {
    test('should validate configuration data directly', () => {
      const configData = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        discord: { token: 'test-token' },
        openai: { apiKey: 'test-key' },
      };

      const result = service.validateConfigurationData(configData, 'standard');

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(0);
    });

    test('should detect errors in configuration data', () => {
      const configData = {
        name: '',
        messageProvider: 'invalid-provider',
        llmProvider: '',
      };

      const result = service.validateConfigurationData(configData, 'standard');

      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    test('should handle rule execution errors gracefully', () => {
      // Add a rule that throws an error
      service.addRule({
        id: 'broken-rule',
        name: 'Broken Rule',
        description: 'A rule that throws an error',
        category: 'business',
        severity: 'error',
        validator: () => {
          throw new Error('Rule execution failed');
        },
      });

      service.addProfile({
        id: 'test-profile',
        name: 'Test Profile',
        description: 'Profile with broken rule',
        ruleIds: ['broken-rule'],
        isDefault: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = service.validateConfigurationData(
        { name: 'test', messageProvider: 'discord', llmProvider: 'openai' },
        'test-profile'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.message.includes('execution failed'))).toBe(true);
    });
  });

  describe('subscription management', () => {
    test('should create subscription', () => {
      const mockConfig = {
        name: 'test-bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
      };
      mockBotConfigService.getBotConfig.mockResolvedValue(mockConfig as any);

      const subscription = service.subscribe(1, 'client-123', 'standard');

      expect(subscription).toBeDefined();
      expect(subscription.configId).toBe(1);
      expect(subscription.clientId).toBe('client-123');
      expect(subscription.profileId).toBe('standard');
      expect(subscription.isActive).toBe(true);
    });

    test('should update existing subscription', () => {
      const mockConfig = { name: 'test-bot', messageProvider: 'discord', llmProvider: 'openai' };
      mockBotConfigService.getBotConfig.mockResolvedValue(mockConfig as any);

      const sub1 = service.subscribe(1, 'client-123', 'standard');
      const sub2 = service.subscribe(1, 'client-123', 'strict');

      expect(sub1.id).toBe(sub2.id);
      expect(sub2.profileId).toBe('strict');
    });

    test('should unsubscribe from validation', () => {
      const mockConfig = { name: 'test-bot', messageProvider: 'discord', llmProvider: 'openai' };
      mockBotConfigService.getBotConfig.mockResolvedValue(mockConfig as any);

      service.subscribe(1, 'client-123', 'standard');
      const result = service.unsubscribe(1, 'client-123');

      expect(result).toBe(true);
    });

    test('should return false when unsubscribing non-existent subscription', () => {
      const result = service.unsubscribe(999, 'non-existent-client');
      expect(result).toBe(false);
    });
  });

  describe('validation history', () => {
    test('should store validation history', async () => {
      const mockConfig = { name: 'test-bot', messageProvider: 'discord', llmProvider: 'openai' };
      mockBotConfigService.getBotConfig.mockResolvedValue(mockConfig as any);

      await service.validateConfiguration(1, 'standard');
      await service.validateConfiguration(2, 'standard');

      const history = service.getValidationHistory();
      expect(history.length).toBe(2);
    });

    test('should filter history by configId', async () => {
      const mockConfig = { name: 'test-bot', messageProvider: 'discord', llmProvider: 'openai' };
      mockBotConfigService.getBotConfig.mockResolvedValue(mockConfig as any);

      await service.validateConfiguration(1, 'standard');
      await service.validateConfiguration(2, 'standard');

      const history = service.getValidationHistory(1);
      expect(history.length).toBe(1);
      expect(history[0].configId).toBe(1);
    });

    test('should limit history results', async () => {
      const mockConfig = { name: 'test-bot', messageProvider: 'discord', llmProvider: 'openai' };
      mockBotConfigService.getBotConfig.mockResolvedValue(mockConfig as any);

      for (let i = 0; i < 10; i++) {
        await service.validateConfiguration(i, 'standard');
      }

      const history = service.getValidationHistory(undefined, 5);
      expect(history.length).toBe(5);
    });
  });

  describe('validation statistics', () => {
    test('should return validation statistics', async () => {
      const mockConfig = { name: 'test-bot', messageProvider: 'discord', llmProvider: 'openai' };
      mockBotConfigService.getBotConfig.mockResolvedValue(mockConfig as any);

      await service.validateConfiguration(1, 'standard');
      await service.validateConfiguration(2, 'standard');

      const stats = service.getValidationStatistics();

      expect(stats.totalReports).toBeGreaterThan(0);
      expect(stats.validReports).toBeGreaterThan(0);
      expect(stats.rulesCount).toBeGreaterThan(0);
      expect(stats.profilesCount).toBeGreaterThan(0);
    });

    test('should calculate average score', async () => {
      const mockConfig = { name: 'test-bot', messageProvider: 'discord', llmProvider: 'openai' };
      mockBotConfigService.getBotConfig.mockResolvedValue(mockConfig as any);

      await service.validateConfiguration(1, 'standard');
      await service.validateConfiguration(2, 'standard');

      const stats = service.getValidationStatistics();
      expect(stats.averageScore).toBeGreaterThanOrEqual(0);
      expect(stats.averageScore).toBeLessThanOrEqual(100);
    });

    test('should track active subscriptions', () => {
      const mockConfig = { name: 'test-bot', messageProvider: 'discord', llmProvider: 'openai' };
      mockBotConfigService.getBotConfig.mockResolvedValue(mockConfig as any);

      service.subscribe(1, 'client-1', 'standard');
      service.subscribe(2, 'client-2', 'standard');

      const stats = service.getValidationStatistics();
      expect(stats.activeSubscriptions).toBe(2);
    });
  });

  describe('built-in validation rules', () => {
    test('should validate required bot name', () => {
      const result = service.validateConfigurationData(
        { name: '', messageProvider: 'discord', llmProvider: 'openai' },
        'quick'
      );

      expect(result.isValid).toBe(false);
      expect(result.errors.some((e) => e.field === 'name')).toBe(true);
    });

    test('should validate bot name format', () => {
      const result = service.validateConfigurationData(
        { name: 'invalid bot name!@#', messageProvider: 'discord', llmProvider: 'openai' },
        'standard'
      );

      expect(result.errors.some((e) => e.ruleId === 'format-bot-name')).toBe(true);
    });

    test('should validate Discord token when using Discord provider', () => {
      const result = service.validateConfigurationData(
        { name: 'bot', messageProvider: 'discord', llmProvider: 'openai', discord: {} },
        'standard'
      );

      expect(result.errors.some((e) => e.ruleId === 'discord-token')).toBe(true);
    });

    test('should validate OpenAI API key when using OpenAI provider', () => {
      const result = service.validateConfigurationData(
        { name: 'bot', messageProvider: 'discord', llmProvider: 'openai', openai: {} },
        'standard'
      );

      expect(result.errors.some((e) => e.ruleId === 'openai-api-key')).toBe(true);
    });

    test('should detect hardcoded secrets', () => {
      const result = service.validateConfigurationData(
        {
          name: 'bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'hardcoded-token-123' },
          openai: { apiKey: 'hardcoded-key-456' },
        },
        'standard'
      );

      expect(result.warnings.some((w) => w.ruleId === 'security-no-hardcoded-secrets')).toBe(true);
    });
  });

  describe('shutdown', () => {
    test('should clear validation interval', () => {
      jest.useFakeTimers();

      const service2 = new (RealTimeValidationService as any)();
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');

      service2.shutdown();

      expect(clearIntervalSpy).toHaveBeenCalled();

      jest.useRealTimers();
    });

    test('should remove all event listeners', () => {
      const listener = jest.fn();
      service.on('validationCompleted', listener);

      service.shutdown();

      expect(service.listenerCount('validationCompleted')).toBe(0);
    });
  });

  describe('singleton behavior', () => {
    test('should return same instance', () => {
      const instance1 = RealTimeValidationService.getInstance();
      const instance2 = RealTimeValidationService.getInstance();

      expect(instance1).toBe(instance2);
    });
  });
});
