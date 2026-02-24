import { ConfigurationTemplateService } from '../../../../src/server/services/ConfigurationTemplateService';
import { ConfigurationValidator } from '../../../../src/server/services/ConfigurationValidator';
import { DatabaseManager } from '../../../../src/database/DatabaseManager';
import * as fs from 'fs';
import * as path from 'path';

// Mock DatabaseManager
jest.mock('../../../../src/database/DatabaseManager');
(DatabaseManager.getInstance as jest.Mock).mockReturnValue({});

// Attempt to mock ConfigurationValidator, but we will also provide valid config as fallback
jest.mock('../../../../src/server/services/ConfigurationValidator', () => {
  return {
    ConfigurationValidator: jest.fn().mockImplementation(() => {
      return {
        validateBotConfig: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
      };
    }),
  };
});

describe('ConfigurationTemplateService', () => {
  const TEST_DIR = path.join(__dirname, 'temp_test_templates');
  let service: ConfigurationTemplateService;

  beforeEach(async () => {
    (ConfigurationTemplateService as any).instance = null;

    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });

    service = ConfigurationTemplateService.getInstance(TEST_DIR);
    await new Promise(resolve => setTimeout(resolve, 50));
  });

  afterEach(async () => {
    (ConfigurationTemplateService as any).instance = null;
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  test('should load built-in templates on initialization', async () => {
    const templates = await service.getAllTemplates();
    expect(templates.length).toBeGreaterThan(0);
    const discordBasic = templates.find(t => t.id === 'discord-basic');
    expect(discordBasic).toBeDefined();
    expect(discordBasic?.isBuiltIn).toBe(true);
  });

  test('should create a new template', async () => {
    const request = {
      name: 'My New Template',
      description: 'A test template',
      category: 'general' as const,
      tags: ['test'],
      config: {
          name: 'My Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot valid-token' },
          openai: { apiKey: 'sk-valid-key' }
      },
      createdBy: 'user1'
    };

    const template = await service.createTemplate(request);

    expect(template).toBeDefined();
    expect(template.name).toBe(request.name);
    expect(template.id).toBeDefined();

    const storedTemplate = await service.getTemplateById(template.id);
    expect(storedTemplate).toBeDefined();
    expect(storedTemplate?.name).toBe(request.name);
  });

  test('should get all templates including created ones', async () => {
    const customTemplate = {
        id: 'custom-1',
        name: 'Custom Template',
        description: 'Description',
        category: 'general',
        tags: ['custom'],
        config: {},
        isBuiltIn: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0
    };

    fs.writeFileSync(path.join(TEST_DIR, 'custom-1.json'), JSON.stringify(customTemplate));

    const templates = await service.getAllTemplates();
    const found = templates.find(t => t.id === 'custom-1');
    expect(found).toBeDefined();
    const builtin = templates.find(t => t.isBuiltIn);
    expect(builtin).toBeDefined();
  });

  test('should filter templates by category', async () => {
    const discordTmpl = {
        id: 'discord-custom',
        name: 'Discord Custom',
        description: '...',
        category: 'discord',
        tags: [],
        config: {},
        isBuiltIn: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        usageCount: 0
    };
    fs.writeFileSync(path.join(TEST_DIR, 'discord-custom.json'), JSON.stringify(discordTmpl));

    const discordTemplates = await service.getAllTemplates({ category: 'discord' });
    const generalTemplates = await service.getAllTemplates({ category: 'general' });

    expect(discordTemplates.find(t => t.id === 'discord-custom')).toBeDefined();
    expect(generalTemplates.find(t => t.id === 'discord-custom')).toBeUndefined();
  });

  test('should handle malformed template files gracefully', async () => {
    fs.writeFileSync(path.join(TEST_DIR, 'bad.json'), '{ invalid json');
    const templates = await service.getAllTemplates();
    expect(templates.length).toBeGreaterThan(0);
  });

  test('should update a template', async () => {
    const request = {
      name: 'Template to Update',
      description: 'Original description',
      category: 'general' as const,
      tags: ['original'],
      config: {
          name: 'Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot token' },
          openai: { apiKey: 'sk-key' }
      }
    };
    const created = await service.createTemplate(request);

    const updateRequest = {
      description: 'Updated description',
      config: {
          name: 'Bot Updated',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot token' },
          openai: { apiKey: 'sk-key' }
      }
    };

    const updated = await service.updateTemplate(created.id, updateRequest);
    expect(updated.description).toBe('Updated description');

    const loaded = await service.getTemplateById(created.id);
    expect(loaded?.description).toBe('Updated description');
  });

  test('should delete a template', async () => {
    const request = {
      name: 'Template to Delete',
      description: '...',
      category: 'general' as const,
      tags: [],
      config: {
          name: 'Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot token' },
          openai: { apiKey: 'sk-key' }
      }
    };
    const created = await service.createTemplate(request);

    const result = await service.deleteTemplate(created.id);
    expect(result).toBe(true);

    const loaded = await service.getTemplateById(created.id);
    expect(loaded).toBeNull();
  });
});
