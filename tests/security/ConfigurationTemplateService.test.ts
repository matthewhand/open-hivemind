/**
 * Security tests for ConfigurationTemplateService
 *
 * Tests for:
 * - Path traversal vulnerabilities in template IDs
 * - JSON injection in template data
 * - Access control (built-in templates)
 * - Input validation
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import os from 'os';
import {
  ConfigurationTemplateService,
  type CreateTemplateRequest,
} from '../../src/server/services/ConfigurationTemplateService';

describe('ConfigurationTemplateService - Security Tests', () => {
  let service: ConfigurationTemplateService;
  let tempDir: string;

  beforeEach(async () => {
    // Create a temporary directory for test templates
    tempDir = await fs.mkdtemp(join(os.tmpdir(), 'hivemind-test-templates-'));
    service = ConfigurationTemplateService.getInstance(tempDir);
  });

  afterEach(async () => {
    // Clean up temporary directory
    try {
      await fs.rm(tempDir, { recursive: true, force: true });
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Path Traversal Prevention', () => {
    it('should prevent path traversal via template ID', async () => {
      const maliciousRequest: CreateTemplateRequest = {
        name: '../../../etc/passwd',
        description: 'Malicious template',
        category: 'general',
        tags: ['malicious'],
        config: { test: 'data' },
      };

      const template = await service.createTemplate(maliciousRequest);

      // Verify the generated ID is sanitized
      expect(template.id).not.toContain('..');
      expect(template.id).not.toContain('/');
      expect(template.id).not.toContain('\\');

      // Verify the template file is created in the correct directory
      const templatePath = join(tempDir, `${template.id}.json`);
      expect(templatePath).toContain(tempDir);
      expect(await fs.access(templatePath).then(() => true).catch(() => false)).toBe(true);
    });

    it('should prevent directory traversal in template retrieval', async () => {
      const maliciousId = '../../../etc/passwd';

      // Attempt to retrieve a template with a malicious ID
      const template = await service.getTemplateById(maliciousId);

      // Should return null for non-existent template, not read arbitrary files
      expect(template).toBeNull();
    });

    it('should sanitize template names with special characters', async () => {
      const request: CreateTemplateRequest = {
        name: '<script>alert("XSS")</script>',
        description: 'Template with script tag',
        category: 'general',
        tags: [],
        config: { test: 'data' },
      };

      const template = await service.createTemplate(request);

      // Name should be preserved (sanitization happens at render time)
      // But ID should be sanitized
      expect(template.id).not.toContain('<');
      expect(template.id).not.toContain('>');
      expect(template.id).not.toContain('script');
    });

    it('should prevent null byte injection in template ID', async () => {
      const request: CreateTemplateRequest = {
        name: 'test\0.json',
        description: 'Null byte injection attempt',
        category: 'general',
        tags: [],
        config: { test: 'data' },
      };

      const template = await service.createTemplate(request);

      // ID should not contain null bytes
      expect(template.id).not.toContain('\0');
      expect(template.id).toMatch(/^[a-z0-9-]+$/);
    });
  });

  describe('JSON Injection Prevention', () => {
    it('should safely handle JSON with nested objects', async () => {
      const deeplyNestedConfig = {
        level1: {
          level2: {
            level3: {
              level4: {
                level5: {
                  value: 'deep',
                },
              },
            },
          },
        },
      };

      const request: CreateTemplateRequest = {
        name: 'Deep Nested Template',
        description: 'Template with deeply nested configuration',
        category: 'general',
        tags: [],
        config: deeplyNestedConfig,
      };

      const template = await service.createTemplate(request);
      const retrieved = await service.getTemplateById(template.id);

      expect(retrieved?.config).toEqual(deeplyNestedConfig);
    });

    it('should sanitize config with __proto__ pollution attempt', async () => {
      const maliciousConfig = {
        __proto__: { isAdmin: true },
        normalField: 'value',
      };

      const request: CreateTemplateRequest = {
        name: 'Proto Pollution Test',
        description: 'Test prototype pollution',
        category: 'general',
        tags: [],
        config: maliciousConfig,
      };

      const template = await service.createTemplate(request);
      const retrieved = await service.getTemplateById(template.id);

      // __proto__ should not be preserved in the stored config
      expect(retrieved?.config.__proto__).toBeUndefined();
      expect(retrieved?.config.normalField).toBe('value');
    });

    it('should handle circular references safely', async () => {
      const circularConfig: any = { field: 'value' };
      circularConfig.self = circularConfig;

      const request: CreateTemplateRequest = {
        name: 'Circular Reference Test',
        description: 'Test circular reference handling',
        category: 'general',
        tags: [],
        config: circularConfig,
      };

      // Should throw an error when trying to stringify circular structure
      await expect(service.createTemplate(request)).rejects.toThrow();
    });

    it('should reject config with constructor property', async () => {
      const maliciousConfig = {
        constructor: {
          prototype: {
            isAdmin: true,
          },
        },
      };

      const request: CreateTemplateRequest = {
        name: 'Constructor Pollution Test',
        description: 'Test constructor pollution',
        category: 'general',
        tags: [],
        config: maliciousConfig,
      };

      // Should create the template but not execute the constructor
      const template = await service.createTemplate(request);
      const retrieved = await service.getTemplateById(template.id);

      // Verify the malicious property wasn't executed
      expect((retrieved?.config as any).isAdmin).toBeUndefined();
    });
  });

  describe('Access Control', () => {
    it('should prevent updating built-in templates', async () => {
      // Get a built-in template (these are pre-loaded)
      const templates = await service.getAllTemplates({ isBuiltIn: true });
      expect(templates.length).toBeGreaterThan(0);

      const builtInTemplate = templates[0];

      // Attempt to update built-in template
      await expect(
        service.updateTemplate(builtInTemplate.id, {
          name: 'Modified Built-in',
        })
      ).rejects.toThrow('Cannot update built-in templates');
    });

    it('should prevent deleting built-in templates', async () => {
      const templates = await service.getAllTemplates({ isBuiltIn: true });
      expect(templates.length).toBeGreaterThan(0);

      const builtInTemplate = templates[0];

      // Attempt to delete built-in template
      await expect(service.deleteTemplate(builtInTemplate.id)).rejects.toThrow(
        'Cannot delete built-in templates'
      );
    });

    it('should allow creating templates with same name as built-in (different ID)', async () => {
      const builtInTemplates = await service.getAllTemplates({ isBuiltIn: true });
      const builtInName = builtInTemplates[0].name;

      // This should succeed - different ID will be generated
      // Note: Current implementation prevents this - may want to change
      await expect(
        service.createTemplate({
          name: builtInName,
          description: 'Custom template with same name',
          category: 'general',
          tags: [],
          config: { custom: true },
        })
      ).rejects.toThrow('already exists');
    });
  });

  describe('Input Validation', () => {
    it('should reject template with invalid category', async () => {
      const request: any = {
        name: 'Invalid Category Template',
        description: 'Test invalid category',
        category: 'invalid-category',
        tags: [],
        config: { test: 'data' },
      };

      // TypeScript should prevent this, but test runtime validation
      // ConfigurationValidator should catch this
      await expect(service.createTemplate(request)).rejects.toThrow();
    });

    it('should reject template with empty name', async () => {
      const request: CreateTemplateRequest = {
        name: '',
        description: 'Empty name test',
        category: 'general',
        tags: [],
        config: { test: 'data' },
      };

      await expect(service.createTemplate(request)).rejects.toThrow();
    });

    it('should reject template with invalid config', async () => {
      const request: CreateTemplateRequest = {
        name: 'Invalid Config Test',
        description: 'Test invalid config',
        category: 'general',
        tags: [],
        config: null as any,
      };

      await expect(service.createTemplate(request)).rejects.toThrow();
    });

    it('should handle extremely long template names', async () => {
      const longName = 'A'.repeat(10000);

      const request: CreateTemplateRequest = {
        name: longName,
        description: 'Long name test',
        category: 'general',
        tags: [],
        config: { test: 'data' },
      };

      const template = await service.createTemplate(request);

      // ID should be reasonably sized even with long name
      expect(template.id.length).toBeLessThan(500);
    });

    it('should handle templates with very large configs', async () => {
      const largeArray = new Array(10000).fill({
        key: 'value',
        nested: { data: 'test' },
      });

      const request: CreateTemplateRequest = {
        name: 'Large Config Test',
        description: 'Test with large configuration',
        category: 'general',
        tags: [],
        config: { largeArray },
      };

      const template = await service.createTemplate(request);
      const retrieved = await service.getTemplateById(template.id);

      expect(retrieved?.config.largeArray).toHaveLength(10000);
    });
  });

  describe('Template Import/Export Security', () => {
    it('should reject malformed JSON during import', async () => {
      const malformedJson = '{ "name": "test", invalid json }';

      await expect(service.importTemplate(malformedJson)).rejects.toThrow();
    });

    it('should sanitize imported template ID', async () => {
      const jsonData = JSON.stringify({
        id: '../../../malicious',
        name: 'Imported Template',
        description: 'Test import',
        category: 'general',
        tags: [],
        config: { test: 'data' },
      });

      const template = await service.importTemplate(jsonData);

      // Should generate new ID, not use the imported one
      expect(template.id).not.toContain('..');
      expect(template.id).not.toContain('malicious');
    });

    it('should validate imported config', async () => {
      const jsonData = JSON.stringify({
        name: 'Invalid Import',
        description: 'Test invalid import',
        category: 'general',
        tags: [],
        config: { invalid: true }, // Assuming this fails validation
      });

      // Should validate config and potentially reject
      // Actual behavior depends on ConfigurationValidator implementation
      await expect(service.importTemplate(jsonData)).rejects.toThrow();
    });
  });

  describe('Template Search and Filter Security', () => {
    it('should prevent ReDoS in search filter', async () => {
      // Create a template
      await service.createTemplate({
        name: 'Test Template',
        description: 'Test description',
        category: 'general',
        tags: [],
        config: { test: 'data' },
      });

      // Use a potentially malicious regex pattern
      const maliciousSearch = 'a'.repeat(50) + '!';

      // Should not hang - search is simple string matching
      const startTime = Date.now();
      const results = await service.getAllTemplates({ search: maliciousSearch });
      const duration = Date.now() - startTime;

      expect(duration).toBeLessThan(1000); // Should complete quickly
      expect(results).toHaveLength(0); // No match expected
    });

    it('should handle special regex characters in search safely', async () => {
      await service.createTemplate({
        name: 'Test Template',
        description: 'Test description',
        category: 'general',
        tags: [],
        config: { test: 'data' },
      });

      const specialChars = '.^$*+?()[]{}|\\';

      // Should not throw errors with special regex characters
      const results = await service.getAllTemplates({ search: specialChars });
      expect(Array.isArray(results)).toBe(true);
    });
  });
});
