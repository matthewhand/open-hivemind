import { promises as fs } from 'fs';
import { SecureConfigManager } from '../../../src/config/SecureConfigManager';
import { DatabaseManager } from '../../../src/database/DatabaseManager';
import { ConfigurationImportExportService } from '../../../src/server/services/ConfigurationImportExportService';
import { ConfigurationTemplateService } from '../../../src/server/services/ConfigurationTemplateService';
import { ConfigurationVersionService } from '../../../src/server/services/ConfigurationVersionService';

// Mock dependencies
jest.mock('fs', () => ({
  promises: {
    readFile: jest.fn(),
    writeFile: jest.fn(),
    mkdir: jest.fn(),
    rename: jest.fn(),
    unlink: jest.fn(),
    readdir: jest.fn(),
  },
  createReadStream: jest.fn(),
  createWriteStream: jest.fn(),
}));

jest.mock('../../../src/database/DatabaseManager');
jest.mock('../../../src/server/services/ConfigurationTemplateService');
jest.mock('../../../src/server/services/ConfigurationVersionService');
jest.mock('../../../src/config/SecureConfigManager');

describe('ConfigurationImportExportService Security Test', () => {
  let service: ConfigurationImportExportService;
  let mockDbManager: any;
  let mockTemplateService: any;
  let mockVersionService: any;

  beforeEach(() => {
    // Reset singleton
    (ConfigurationImportExportService as any).instance = undefined;

    // Setup mocks
    mockDbManager = {
      getBotConfiguration: jest.fn(),
      createBotConfiguration: jest.fn(),
      updateBotConfiguration: jest.fn(),
    };
    (DatabaseManager.getInstance as jest.Mock).mockReturnValue(mockDbManager);

    mockTemplateService = {
      getAllTemplates: jest.fn(),
      getTemplateById: jest.fn(),
      createTemplate: jest.fn(),
    };
    (ConfigurationTemplateService.getInstance as jest.Mock).mockReturnValue(mockTemplateService);

    mockVersionService = {};
    (ConfigurationVersionService.getInstance as jest.Mock).mockReturnValue(mockVersionService);

    // Initialize service
    service = ConfigurationImportExportService.getInstance();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should correctly parse CSV with quoted fields containing commas', async () => {
    // This CSV has a name field "Bot, With Comma" which contains a comma
    const csvContent = 'name,description,model\n"Bot, With Comma","Description",gpt-4';
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(csvContent));

    // Mock getBotConfiguration to return null (so it tries to create new)
    mockDbManager.getBotConfiguration.mockResolvedValue(null);

    const result = await service.importConfigurations('test.csv', {
      format: 'csv',
      skipValidation: true,
    });

    expect(result.success).toBe(true);
    expect(mockDbManager.createBotConfiguration).toHaveBeenCalledTimes(1);

    const calledConfig = mockDbManager.createBotConfiguration.mock.calls[0][0];

    // This expectation asserts that the name was parsed correctly as a single field
    expect(calledConfig).toEqual(
      expect.objectContaining({
        name: 'Bot, With Comma',
        description: 'Description',
        model: 'gpt-4',
      })
    );
  });

  it('should correctly parse CSV with quoted fields containing newlines', async () => {
    const csvContent = 'name,description,model\n"Bot\nWith Newline","Description",gpt-4';
    (fs.readFile as jest.Mock).mockResolvedValue(Buffer.from(csvContent));

    mockDbManager.getBotConfiguration.mockResolvedValue(null);

    const result = await service.importConfigurations('test.csv', {
      format: 'csv',
      skipValidation: true,
    });

    expect(result.success).toBe(true);
    expect(mockDbManager.createBotConfiguration).toHaveBeenCalledTimes(1);

    const calledConfig = mockDbManager.createBotConfiguration.mock.calls[0][0];

    expect(calledConfig).toEqual(
      expect.objectContaining({
        name: 'Bot\nWith Newline',
        description: 'Description',
        model: 'gpt-4',
      })
    );
  });
});
