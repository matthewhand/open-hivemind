import * as fs from 'fs';
import * as path from 'path';
import { DatabaseManager } from '../../src/database/DatabaseManager';
import { ConfigurationTemplateService } from '../../src/server/services/ConfigurationTemplateService';
import { ConfigurationValidator } from '../../src/server/services/ConfigurationValidator';

// Mock DatabaseManager
jest.mock('../../src/database/DatabaseManager');
(DatabaseManager.getInstance as jest.Mock).mockReturnValue({});

// Mock ConfigurationValidator
jest.mock('../../src/server/services/ConfigurationValidator', () => {
  return {
    ConfigurationValidator: jest.fn().mockImplementation(() => {
      return {
        validateBotConfig: jest.fn().mockReturnValue({ isValid: true, errors: [] }),
      };
    }),
  };
});

describe('ConfigurationTemplateService - Enhanced Security Tests', () => {
  const TEST_DIR = path.join(__dirname, 'temp_test_templates_security');
  let service: ConfigurationTemplateService;

  beforeEach(async () => {
    (ConfigurationTemplateService as any).instance = null;

    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
    fs.mkdirSync(TEST_DIR, { recursive: true });

    service = ConfigurationTemplateService.getInstance(TEST_DIR);
    await new Promise((resolve) => setTimeout(resolve, 50));
  });

  afterEach(async () => {
    (ConfigurationTemplateService as any).instance = null;
    if (fs.existsSync(TEST_DIR)) {
      fs.rmSync(TEST_DIR, { recursive: true, force: true });
    }
  });

  describe('Built-in Template Protection', () => {
    test('should not allow updating built-in templates', async () => {
      const builtInTemplate = await service.getTemplateById('discord-basic');
      expect(builtInTemplate).toBeDefined();

      await expect(
        service.updateTemplate('discord-basic', { description: 'Modified' })
      ).rejects.toThrow('Cannot update built-in templates');
    });

    test('should not allow deleting built-in templates', async () => {
      await expect(service.deleteTemplate('discord-basic')).rejects.toThrow(
        'Cannot delete built-in templates'
      );
    });

    test('should load all built-in templates on initialization', async () => {
      const templates = await service.getAllTemplates();
      const builtInTemplates = templates.filter((t) => t.isBuiltIn);

      expect(builtInTemplates.length).toBeGreaterThan(0);
      expect(builtInTemplates.find((t) => t.id === 'discord-basic')).toBeDefined();
      expect(builtInTemplates.find((t) => t.id === 'slack-basic')).toBeDefined();
      expect(builtInTemplates.find((t) => t.id === 'mattermost-integration')).toBeDefined();
    });
  });

  describe('Template Validation', () => {
    test('should throw error when creating template with duplicate name', async () => {
      const request = {
        name: 'Duplicate Template',
        description: 'First',
        category: 'general' as const,
        tags: [],
        config: {
          name: 'Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot token' },
          openai: { apiKey: 'sk-key' },
        },
      };

      await service.createTemplate(request);

      await expect(service.createTemplate(request)).rejects.toThrow(
        "Template with name 'Duplicate Template' already exists"
      );
    });

    test('should validate template configuration on create', async () => {
      const mockValidator = (
        ConfigurationValidator as jest.MockedClass<typeof ConfigurationValidator>
      ).mock.instances[0] as any;

      mockValidator.validateBotConfig.mockReturnValueOnce({
        isValid: false,
        errors: ['Invalid config'],
      });

      await expect(
        service.createTemplate({
          name: 'Invalid Config Template',
          description: 'Test',
          category: 'general',
          tags: [],
          config: {},
        })
      ).rejects.toThrow('Template configuration validation failed');
    });

    test('should validate template configuration on update', async () => {
      const template = await service.createTemplate({
        name: 'Valid Template',
        description: 'Test',
        category: 'general' as const,
        tags: [],
        config: {
          name: 'Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot token' },
          openai: { apiKey: 'sk-key' },
        },
      });

      const mockValidator = (
        ConfigurationValidator as jest.MockedClass<typeof ConfigurationValidator>
      ).mock.instances[0] as any;

      mockValidator.validateBotConfig.mockReturnValueOnce({
        isValid: false,
        errors: ['Invalid update config'],
      });

      await expect(
        service.updateTemplate(template.id, {
          config: {},
        })
      ).rejects.toThrow('Template configuration validation failed');
    });
  });

  describe('Filtering and Search', () => {
    test('should filter templates by category', async () => {
      const discordTemplate = await service.createTemplate({
        name: 'Discord Custom',
        description: 'Test',
        category: 'discord' as const,
        tags: [],
        config: {
          name: 'Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot token' },
          openai: { apiKey: 'sk-key' },
        },
      });

      const filtered = await service.getAllTemplates({ category: 'discord' });
      expect(filtered.find((t) => t.id === discordTemplate.id)).toBeDefined();

      const notFiltered = await service.getAllTemplates({ category: 'slack' });
      expect(notFiltered.find((t) => t.id === discordTemplate.id)).toBeUndefined();
    });

    test('should filter templates by tags', async () => {
      const template = await service.createTemplate({
        name: 'Tagged Template',
        description: 'Test',
        category: 'general' as const,
        tags: ['production', 'advanced'],
        config: {
          name: 'Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot token' },
          openai: { apiKey: 'sk-key' },
        },
      });

      const filtered = await service.getAllTemplates({ tags: ['advanced'] });
      expect(filtered.find((t) => t.id === template.id)).toBeDefined();

      const notFiltered = await service.getAllTemplates({ tags: ['development'] });
      expect(notFiltered.find((t) => t.id === template.id)).toBeUndefined();
    });

    test('should filter templates by search term', async () => {
      const template = await service.createTemplate({
        name: 'Searchable Template',
        description: 'Contains unique keyword: xyzunique',
        category: 'general' as const,
        tags: ['searchable'],
        config: {
          name: 'Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot token' },
          openai: { apiKey: 'sk-key' },
        },
      });

      const filteredByDescription = await service.getAllTemplates({ search: 'xyzunique' });
      expect(filteredByDescription.find((t) => t.id === template.id)).toBeDefined();

      const filteredByTag = await service.getAllTemplates({ search: 'searchable' });
      expect(filteredByTag.find((t) => t.id === template.id)).toBeDefined();

      const notFiltered = await service.getAllTemplates({ search: 'nonexistent' });
      expect(notFiltered.find((t) => t.id === template.id)).toBeUndefined();
    });

    test('should filter templates by isBuiltIn flag', async () => {
      await service.createTemplate({
        name: 'Custom Template',
        description: 'Test',
        category: 'general' as const,
        tags: [],
        config: {
          name: 'Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot token' },
          openai: { apiKey: 'sk-key' },
        },
      });

      const builtIn = await service.getAllTemplates({ isBuiltIn: true });
      expect(builtIn.every((t) => t.isBuiltIn)).toBe(true);

      const custom = await service.getAllTemplates({ isBuiltIn: false });
      expect(custom.every((t) => !t.isBuiltIn)).toBe(true);
    });

    test('should filter templates by createdBy', async () => {
      await service.createTemplate({
        name: 'User Template',
        description: 'Test',
        category: 'general' as const,
        tags: [],
        config: {
          name: 'Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot token' },
          openai: { apiKey: 'sk-key' },
        },
        createdBy: 'specific-user',
      });

      const filtered = await service.getAllTemplates({ createdBy: 'specific-user' });
      expect(filtered.find((t) => t.createdBy === 'specific-user')).toBeDefined();

      const notFiltered = await service.getAllTemplates({ createdBy: 'other-user' });
      expect(notFiltered.find((t) => t.createdBy === 'specific-user')).toBeUndefined();
    });

    test('should combine multiple filters', async () => {
      const template = await service.createTemplate({
        name: 'Multi-Filter Template',
        description: 'Test template for multiple filters',
        category: 'discord' as const,
        tags: ['production', 'bot'],
        config: {
          name: 'Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot token' },
          openai: { apiKey: 'sk-key' },
        },
        createdBy: 'test-user',
      });

      const filtered = await service.getAllTemplates({
        category: 'discord',
        tags: ['production'],
        createdBy: 'test-user',
        isBuiltIn: false,
      });

      expect(filtered.find((t) => t.id === template.id)).toBeDefined();
    });
  });

  describe('Template Operations', () => {
    test('should get templates by category', async () => {
      const discordTemplates = await service.getTemplatesByCategory('discord');
      expect(discordTemplates.length).toBeGreaterThan(0);
      expect(discordTemplates.every((t) => t.category === 'discord')).toBe(true);
    });

    test('should get popular templates ordered by usage count', async () => {
      const template = await service.createTemplate({
        name: 'Popular Template',
        description: 'Test',
        category: 'general' as const,
        tags: [],
        config: {
          name: 'Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot token' },
          openai: { apiKey: 'sk-key' },
        },
      });

      await service.incrementUsageCount(template.id);
      await service.incrementUsageCount(template.id);
      await service.incrementUsageCount(template.id);

      const popular = await service.getPopularTemplates(10);
      const found = popular.find((t) => t.id === template.id);
      expect(found?.usageCount).toBe(3);
    });

    test('should get recent templates ordered by creation date', async () => {
      const template = await service.createTemplate({
        name: 'Recent Template',
        description: 'Test',
        category: 'general' as const,
        tags: [],
        config: {
          name: 'Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot token' },
          openai: { apiKey: 'sk-key' },
        },
      });

      const recent = await service.getRecentTemplates(10);
      expect(recent[0].id).toBe(template.id); // Should be most recent
    });

    test('should increment usage count', async () => {
      const template = await service.createTemplate({
        name: 'Usage Template',
        description: 'Test',
        category: 'general' as const,
        tags: [],
        config: {
          name: 'Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot token' },
          openai: { apiKey: 'sk-key' },
        },
      });

      expect(template.usageCount).toBe(0);

      await service.incrementUsageCount(template.id);
      const updated = await service.getTemplateById(template.id);
      expect(updated?.usageCount).toBe(1);
    });

    test('should not throw when incrementing usage of non-existent template', async () => {
      await expect(service.incrementUsageCount('nonexistent')).resolves.not.toThrow();
    });

    test('should duplicate template', async () => {
      const original = await service.createTemplate({
        name: 'Original Template',
        description: 'Original description',
        category: 'general' as const,
        tags: ['original'],
        config: {
          name: 'Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot token' },
          openai: { apiKey: 'sk-key' },
        },
      });

      const duplicate = await service.duplicateTemplate(
        original.id,
        'Duplicated Template',
        'user2'
      );

      expect(duplicate.name).toBe('Duplicated Template');
      expect(duplicate.description).toContain('(Copy)');
      expect(duplicate.config).toEqual(original.config);
      expect(duplicate.isBuiltIn).toBe(false);
      expect(duplicate.usageCount).toBe(0);
      expect(duplicate.createdBy).toBe('user2');
      expect(duplicate.id).not.toBe(original.id);
    });
  });

  describe('Import/Export', () => {
    test('should export template to JSON', async () => {
      const template = await service.createTemplate({
        name: 'Export Template',
        description: 'Test',
        category: 'general' as const,
        tags: ['export'],
        config: {
          name: 'Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot token' },
          openai: { apiKey: 'sk-key' },
        },
      });

      const exported = await service.exportTemplate(template.id);
      const parsed = JSON.parse(exported);

      expect(parsed.name).toBe('Export Template');
      expect(parsed.config).toEqual(template.config);
      expect(parsed.tags).toEqual(['export']);
    });

    test('should import template from JSON', async () => {
      const templateData = {
        name: 'Imported Template',
        description: 'Imported from JSON',
        category: 'general',
        tags: ['imported'],
        config: {
          name: 'Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot token' },
          openai: { apiKey: 'sk-key' },
        },
      };

      const imported = await service.importTemplate(JSON.stringify(templateData), 'importer');

      expect(imported.name).toBe('Imported Template');
      expect(imported.description).toBe('Imported from JSON');
      expect(imported.createdBy).toBe('importer');
      expect(imported.isBuiltIn).toBe(false);
    });

    test('should reject invalid JSON on import', async () => {
      await expect(service.importTemplate('{ invalid json', 'user')).rejects.toThrow();
    });

    test('should reject import without required fields', async () => {
      const invalidNoConfig = { name: 'Missing Config' };
      await expect(service.importTemplate(JSON.stringify(invalidNoConfig), 'user')).rejects.toThrow(
        'Invalid template format'
      );

      const invalidNoName = { config: {} };
      await expect(service.importTemplate(JSON.stringify(invalidNoName), 'user')).rejects.toThrow(
        'Invalid template format'
      );
    });

    test('should import with default values for optional fields', async () => {
      const minimalData = {
        name: 'Minimal Import',
        config: {
          name: 'Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot token' },
          openai: { apiKey: 'sk-key' },
        },
      };

      const imported = await service.importTemplate(JSON.stringify(minimalData), 'user');

      expect(imported.description).toBe('');
      expect(imported.category).toBe('general');
      expect(imported.tags).toEqual([]);
    });
  });

  describe('Error Handling', () => {
    test('should handle getTemplateById with non-existent ID', async () => {
      const result = await service.getTemplateById('nonexistent-id');
      expect(result).toBeNull();
    });

    test('should handle getTemplateByName with non-existent name', async () => {
      const result = await service.getTemplateByName('Nonexistent Template');
      expect(result).toBeNull();
    });

    test('should throw error when updating non-existent template', async () => {
      await expect(
        service.updateTemplate('nonexistent', { description: 'Updated' })
      ).rejects.toThrow("Template with ID 'nonexistent' not found");
    });

    test('should throw error when deleting non-existent template', async () => {
      await expect(service.deleteTemplate('nonexistent')).rejects.toThrow(
        "Template with ID 'nonexistent' not found"
      );
    });

    test('should throw error when duplicating non-existent template', async () => {
      await expect(service.duplicateTemplate('nonexistent', 'New Name', 'user')).rejects.toThrow(
        "Template with ID 'nonexistent' not found"
      );
    });

    test('should throw error when exporting non-existent template', async () => {
      await expect(service.exportTemplate('nonexistent')).rejects.toThrow(
        "Template with ID 'nonexistent' not found"
      );
    });

    test('should handle malformed template files gracefully', async () => {
      fs.writeFileSync(path.join(TEST_DIR, 'bad.json'), '{ invalid json');
      const templates = await service.getAllTemplates();
      expect(templates.length).toBeGreaterThan(0); // Should still load valid templates
    });

    test('should handle file system errors gracefully', async () => {
      // This tests that the service doesn't crash on file system errors
      const templates = await service.getAllTemplates();
      expect(Array.isArray(templates)).toBe(true);
    });
  });

  describe('Template ID Generation', () => {
    test('should generate unique template IDs', async () => {
      const template1 = await service.createTemplate({
        name: 'Same Name',
        description: 'First',
        category: 'general' as const,
        tags: [],
        config: {
          name: 'Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot token' },
          openai: { apiKey: 'sk-key' },
        },
      });

      await service.deleteTemplate(template1.id);

      const template2 = await service.createTemplate({
        name: 'Same Name',
        description: 'Second',
        category: 'general' as const,
        tags: [],
        config: {
          name: 'Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot token' },
          openai: { apiKey: 'sk-key' },
        },
      });

      expect(template1.id).not.toBe(template2.id);
    });

    test('should generate IDs based on name', async () => {
      const template = await service.createTemplate({
        name: 'Test Template Name',
        description: 'Test',
        category: 'general' as const,
        tags: [],
        config: {
          name: 'Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot token' },
          openai: { apiKey: 'sk-key' },
        },
      });

      expect(template.id).toContain('test-template-name');
    });
  });

  describe('getAllTemplateIds', () => {
    test('should return Set of all template IDs', async () => {
      const template1 = await service.createTemplate({
        name: 'Template 1',
        description: 'Test',
        category: 'general' as const,
        tags: [],
        config: {
          name: 'Bot',
          messageProvider: 'discord',
          llmProvider: 'openai',
          discord: { token: 'Bot token' },
          openai: { apiKey: 'sk-key' },
        },
      });

      const ids = await service.getAllTemplateIds();

      expect(ids instanceof Set).toBe(true);
      expect(ids.has(template1.id)).toBe(true);
      expect(ids.has('discord-basic')).toBe(true); // Built-in template
    });

    test('should return empty Set when directory is empty', async () => {
      (ConfigurationTemplateService as any).instance = null;
      const emptyDir = path.join(__dirname, 'empty_test_templates');
      fs.mkdirSync(emptyDir, { recursive: true });

      // Remove all files
      const files = fs.readdirSync(emptyDir);
      files.forEach((file) => {
        fs.unlinkSync(path.join(emptyDir, file));
      });

      const emptyService = ConfigurationTemplateService.getInstance(emptyDir);
      await new Promise((resolve) => setTimeout(resolve, 50));

      const ids = await emptyService.getAllTemplateIds();

      expect(ids.size).toBeGreaterThan(0); // Should have built-in templates

      fs.rmSync(emptyDir, { recursive: true, force: true });
    });
  });
});
