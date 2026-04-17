import 'reflect-metadata';
import { ConfigurationTemplateService } from '../../../src/server/services/ConfigurationTemplateService';
import { DatabaseManager } from '../../../src/database/DatabaseManager';
import { ConfigurationValidator } from '../../../src/server/services/ConfigurationValidator';
import { container } from 'tsyringe';
import * as path from 'path';
import { promises as fs } from 'fs';
import * as os from 'os';

describe('ConfigurationTemplateService Integration', () => {
  let service: ConfigurationTemplateService;
  let testDir: string;
  let mockDbManager: any;
  let mockValidator: any;

  beforeAll(async () => {
    testDir = path.join(os.tmpdir(), 'hivemind-templates-' + Date.now());
    await fs.mkdir(testDir, { recursive: true });

    mockDbManager = {
      isConfigured: jest.fn().mockReturnValue(true),
    };

    mockValidator = {
      validateBotConfig: jest.fn().mockReturnValue({ isValid: true, errors: [] })
    };

    container.registerInstance(DatabaseManager as any, mockDbManager);
    container.registerInstance(ConfigurationValidator as any, mockValidator);
    
    service = container.resolve(ConfigurationTemplateService);
    service.setTemplatesDir(testDir);
    await (service as any).loadBuiltInTemplates();
  });

  afterAll(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
    jest.restoreAllMocks();
  });

  it('should load built-in templates on initialization', async () => {
    const templates = await service.getAllTemplates();
    // It should have at least the built-in ones
    expect(templates.length).toBeGreaterThan(0);
    expect(templates.some(t => t.isBuiltIn)).toBe(true);
  });

  it('should create a new template successfully', async () => {
    const request = {
      name: 'Custom Template',
      description: 'A custom template for testing',
      category: 'general' as any,
      tags: ['test', 'custom'],
      config: { messageProvider: 'discord', llmProvider: 'openai' }
    };

    const template = await service.createTemplate(request);
    
    expect(template.name).toBe('Custom Template');
    expect(template.isBuiltIn).toBe(false);
    
    const savedTemplate = await service.getTemplateById(template.id);
    expect(savedTemplate).toBeDefined();
    expect(savedTemplate?.name).toBe('Custom Template');
  });

  it('should throw error when creating template with existing name', async () => {
    const request = {
      name: 'Custom Template', // Name already exists from previous test
      description: 'Another one',
      category: 'general' as any,
      tags: [],
      config: {}
    };

    await expect(service.createTemplate(request)).rejects.toThrow(
      "Template with name 'Custom Template' already exists"
    );
  });

  it('should filter templates by category', async () => {
    const discordTemplates = await service.getTemplatesByCategory('discord');
    expect(discordTemplates.every(t => t.category === 'discord')).toBe(true);
  });

  it('should delete a custom template', async () => {
    const request = {
      name: 'Template to delete',
      description: 'Will be deleted',
      category: 'general' as any,
      tags: [],
      config: {}
    };

    const template = await service.createTemplate(request);
    const result = await service.deleteTemplate(template.id);
    
    expect(result).toBe(true);
    const found = await service.getTemplateById(template.id);
    expect(found).toBeNull();
  });

  it('should not allow deleting built-in templates', async () => {
    const templates = await service.getAllTemplates();
    const builtIn = templates.find(t => t.isBuiltIn);
    
    if (builtIn) {
      await expect(service.deleteTemplate(builtIn.id)).rejects.toThrow(
        'Cannot delete built-in templates'
      );
    }
  });
});
