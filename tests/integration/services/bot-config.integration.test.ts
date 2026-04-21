import 'reflect-metadata';
import { BotConfigService } from '../../../src/server/services/BotConfigService';
import { DatabaseManager } from '../../../src/database/DatabaseManager';
import { ConfigurationValidator } from '../../../src/server/services/ConfigurationValidator';
import { container } from 'tsyringe';

describe('BotConfigService Integration', () => {
  let service: BotConfigService;
  let mockDbManager: any;
  let mockValidator: any;

  beforeAll(() => {
    mockDbManager = {
      isConfigured: jest.fn().mockReturnValue(true),
      getBotConfigurationByName: jest.fn(),
      createBotConfiguration: jest.fn(),
      getBotConfiguration: jest.fn(),
      createBotConfigurationAudit: jest.fn(),
      getAllBotConfigurationsWithDetails: jest.fn(),
      updateBotConfiguration: jest.fn(),
      deleteBotConfiguration: jest.fn(),
      getBotConfigurationVersions: jest.fn().mockResolvedValue([]),
      getBotConfigurationAudit: jest.fn().mockResolvedValue([]),
    };

    mockValidator = {
      validateBotConfig: jest.fn().mockReturnValue({ isValid: true, errors: [] })
    };

    container.registerInstance(DatabaseManager as any, mockDbManager);
    container.registerInstance(ConfigurationValidator as any, mockValidator);
    
    service = container.resolve(BotConfigService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should create a bot configuration successfully', async () => {
    const configData = {
      name: 'test-bot',
      messageProvider: 'discord',
      llmProvider: 'openai'
    };

    mockDbManager.getBotConfigurationByName.mockResolvedValue(null);
    mockDbManager.createBotConfiguration.mockResolvedValue(1);
    mockDbManager.getBotConfiguration.mockResolvedValue({ id: 1, ...configData });

    const result = await service.createBotConfig(configData as any);
    
    expect(result.id).toBe(1);
    expect(mockDbManager.createBotConfiguration).toHaveBeenCalled();
    expect(mockDbManager.createBotConfigurationAudit).toHaveBeenCalled();
  });

  it('should throw error when bot name already exists', async () => {
    const configData = { name: 'existing-bot' };
    mockDbManager.getBotConfigurationByName.mockResolvedValue({ id: 2, name: 'existing-bot' });

    await expect(service.createBotConfig(configData as any)).rejects.toThrow(
      "Bot configuration with name 'existing-bot' already exists"
    );
  });

  it('should get a bot configuration by ID', async () => {
    const mockConfig = { id: 1, name: 'bot-1' };
    mockDbManager.getBotConfiguration.mockResolvedValue(mockConfig);

    const result = await service.getBotConfig(1);
    
    expect(result).toEqual(expect.objectContaining(mockConfig));
    expect(mockDbManager.getBotConfigurationVersions).toHaveBeenCalledWith(1);
  });

  it('should return null when getting nonexistent bot by ID', async () => {
    mockDbManager.getBotConfiguration.mockResolvedValue(null);
    const result = await service.getBotConfig(999);
    expect(result).toBeNull();
  });
});
