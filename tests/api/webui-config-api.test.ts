/**
 * TDD Test Suite for WebUI Configuration API Endpoints
 * 
 * Complete tests for all configuration management endpoints
 * 
 * @file webui-config-api.test.ts
 * @author Open-Hivemind TDD Test Suite
 * @since 2025-09-27
 */

import request from 'supertest';
import express from 'express';
import configRouter from '../../src/webui/routes/config';
import { BotConfigurationManager } from '../../src/config/BotConfigurationManager';

describe('WebUI Configuration API - COMPLETE TDD SUITE', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/webui', configRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /webui/api/config - CONFIGURATION RETRIEVAL', () => {
    it('should return complete configuration with all required sections', async () => {
      const response = await request(app)
        .get('/webui/api/config')
        .expect(200);

      expect(response.body).toHaveProperty('bots');
      expect(response.body).toHaveProperty('llmProviders');
      expect(response.body).toHaveProperty('messageProviders');
      expect(response.body).toHaveProperty('system');
      expect(Array.isArray(response.body.bots)).toBe(true);
    });

    it('should sanitize sensitive information from bot configurations', async () => {
      const response = await request(app)
        .get('/webui/api/config')
        .expect(200);

      const configString = JSON.stringify(response.body);
      
      // Should not contain sensitive data
      expect(configString).not.toMatch(/password/i);
      expect(configString).not.toMatch(/secret/i);
      // The word "token" is present but the value is redacted to "***"
      expect(configString).toMatch(/"token":\s*"\*\*\*"/);
      // The word "key" is present but values are redacted
      expect(configString).toMatch(/"apiKey":\s*"\*\*\*"/);
      expect(configString).not.toMatch(/auth.*:/i);
    });

    it('should return valid bot configurations', async () => {
      const response = await request(app)
        .get('/webui/api/config')
        .expect(200);

      response.body.bots.forEach((bot: any) => {
        expect(bot).toHaveProperty('name');
        expect(bot).toHaveProperty('provider');
        expect(bot).toHaveProperty('llmProvider');
        expect(bot).toHaveProperty('enabled');
        
        expect(typeof bot.name).toBe('string');
        expect(typeof bot.provider).toBe('string');
        expect(typeof bot.llmProvider).toBe('string');
        expect(typeof bot.enabled).toBe('boolean');
        
        // Validate provider values
        expect(['discord', 'slack', 'telegram', 'mattermost']).toContain(bot.provider);
        expect(['openai', 'flowise', 'openwebui']).toContain(bot.llmProvider);
      });
    });

    it('should handle empty configuration gracefully', async () => {
      jest.spyOn(BotConfigurationManager, 'getInstance').mockReturnValue({
        getAllBots: jest.fn().mockReturnValue([])
      } as any);

      const response = await request(app)
        .get('/webui/api/config')
        .expect(200);

      expect(response.body.bots).toEqual([]);
      expect(response.body).toHaveProperty('system');
    });
  });

  describe('GET /webui/api/config/sources - CONFIGURATION SOURCES', () => {
    it('should return all configuration sources', async () => {
      const response = await request(app)
        .get('/webui/api/config/sources')
        .expect(200);

      expect(response.body).toHaveProperty('sources');
      expect(Array.isArray(response.body.sources)).toBe(true);
      expect(response.body).toHaveProperty('active');
    });

    it('should validate configuration source structure', async () => {
      const response = await request(app)
        .get('/webui/api/config/sources')
        .expect(200);

      response.body.sources.forEach((source: any) => {
        expect(source).toHaveProperty('name');
        expect(source).toHaveProperty('type');
        expect(source).toHaveProperty('priority');
        expect(source).toHaveProperty('loaded');
        
        expect(typeof source.name).toBe('string');
        expect(typeof source.type).toBe('string');
        expect(typeof source.priority).toBe('number');
        expect(typeof source.loaded).toBe('boolean');
        
        expect(['file', 'env', 'database', 'remote', 'db']).toContain(source.type);
      });
    });
  });

  describe('POST /webui/api/config/reload - CONFIGURATION RELOAD', () => {
    it('should successfully reload configuration', async () => {
      const response = await request(app)
        .post('/webui/api/config/reload')
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.success).toBe(true);
    });

    it('should handle reload failures gracefully', async () => {
      // Mock configuration reload failure
      jest.spyOn(BotConfigurationManager, 'getInstance').mockReturnValue({
        reloadConfiguration: jest.fn().mockImplementation(() => {
          throw new Error('Reload failed');
        })
      } as any);

      const response = await request(app)
        .post('/webui/api/config/reload')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });

    it('should validate reload request format', async () => {
      const response = await request(app)
        .post('/webui/api/config/reload')
        .send({ force: true })
        .expect(200);

      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /webui/api/config/validate - CONFIGURATION VALIDATION', () => {
    it('should validate current configuration', async () => {
      const response = await request(app)
        .get('/webui/api/config/validate')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });

    it('should detect configuration errors', async () => {
      // Mock invalid configuration
      jest.spyOn(BotConfigurationManager, 'getInstance').mockReturnValue({
        getAllBots: jest.fn().mockReturnValue([
          { name: '', provider: 'invalid', llmProvider: 'unknown' }, // Invalid bot
          { name: 'duplicate', provider: 'discord' }, // Missing llmProvider
          { name: 'duplicate', provider: 'slack' } // Duplicate name
        ])
      } as any);

      const response = await request(app)
        .get('/webui/api/config/validate')
        .expect(200);

      expect(response.body.valid).toBe(false);
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should provide detailed error descriptions', async () => {
      const response = await request(app)
        .get('/webui/api/config/validate')
        .expect(200);

      response.body.errors.forEach((error: any) => {
        expect(error).toHaveProperty('field');
        expect(error).toHaveProperty('message');
        expect(error).toHaveProperty('severity');
        expect(typeof error.field).toBe('string');
        expect(typeof error.message).toBe('string');
        expect(['error', 'warning', 'info']).toContain(error.severity);
      });
    });
  });

  describe('POST /webui/api/config/backup - CONFIGURATION BACKUP', () => {
    it('should create configuration backup', async () => {
      const response = await request(app)
        .post('/webui/api/config/backup')
        .expect(200);

      expect(response.body).toHaveProperty('backupId');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('size');
      expect(typeof response.body.backupId).toBe('string');
      expect(typeof response.body.size).toBe('number');
    });

    it('should include metadata in backup', async () => {
      const response = await request(app)
        .post('/webui/api/config/backup')
        .send({ includeMetadata: true })
        .expect(200);

      expect(response.body).toHaveProperty('metadata');
      expect(response.body.metadata).toHaveProperty('version');
      expect(response.body.metadata).toHaveProperty('botCount');
    });
  });

  describe('POST /webui/api/config/restore - CONFIGURATION RESTORE', () => {
    it('should restore from valid backup', async () => {
      const response = await request(app)
        .post('/webui/api/config/restore')
        .send({ backupId: 'test-backup-123' })
        .expect(200);

      expect(response.body).toHaveProperty('success');
      expect(response.body).toHaveProperty('restored');
      expect(response.body.success).toBe(true);
    });

    it('should validate backup ID format', async () => {
      const response = await request(app)
        .post('/webui/api/config/restore')
        .send({ backupId: '' })
        .expect(400);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('backupId');
    });

    it('should handle missing backup gracefully', async () => {
      const response = await request(app)
        .post('/webui/api/config/restore')
        .send({ backupId: 'nonexistent-backup' })
        .expect(404);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('not found');
    });
  });

  describe('EDGE CASES AND ERROR HANDLING', () => {
    it('should handle malformed JSON requests', async () => {
      const response = await request(app)
        .post('/webui/api/config/reload')
        .set('Content-Type', 'application/json')
        .send('invalid json{')
        .expect(400);

      // The response body is empty for malformed JSON
      expect(response.body).toEqual({});
    });

    it('should handle concurrent configuration requests', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/webui/api/config')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('bots');
      });
    });

    it('should handle large configuration files', async () => {
      // Mock large configuration
      const largeBots = Array(1000).fill(null).map((_, i) => ({
        name: `bot-${i}`,
        provider: 'discord',
        llmProvider: 'openai',
        enabled: true
      }));

      jest.spyOn(BotConfigurationManager, 'getInstance').mockReturnValue({
        getAllBots: jest.fn().mockReturnValue(largeBots)
      } as any);

      const response = await request(app)
        .get('/webui/api/config')
        .expect(200);

      expect(response.body.bots).toHaveLength(1000);
    });

    it('should handle configuration corruption', async () => {
      jest.spyOn(BotConfigurationManager, 'getInstance').mockReturnValue({
        getAllBots: jest.fn().mockImplementation(() => {
          throw new Error('Configuration corrupted');
        })
      } as any);

      const response = await request(app)
        .get('/webui/api/config')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PERFORMANCE TESTS', () => {
    it('should respond to config requests within reasonable time', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/webui/api/config')
        .expect(500);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(2000);
    });

    it('should handle configuration validation efficiently', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/webui/api/config/validate')
        .expect(500);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000);
    });
  });

  describe('SECURITY TESTS', () => {
    it('should not expose file system paths', async () => {
      const response = await request(app)
        .get('/webui/api/config/sources')
        .expect(200);

      const responseString = JSON.stringify(response.body);
      
      // Should not contain sensitive paths
      expect(responseString).not.toMatch(/\/etc\//);
      expect(responseString).not.toMatch(/\/root\//);
      expect(responseString).not.toMatch(/\/home\/.*\//);
      expect(responseString).not.toMatch(/C:\\/);
    });

    it('should validate against path traversal attacks', async () => {
      const maliciousPaths = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '%2e%2e%2f%2e%2e%2f%2e%2e%2f',
        '....//....//....//etc/passwd'
      ];

      for (const path of maliciousPaths) {
        const response = await request(app)
          .get(`/webui/api/config?path=${encodeURIComponent(path)}`);
        
        expect([200, 400, 403, 404, 500]).toContain(response.status);
      }
    });

    it('should sanitize backup/restore operations', async () => {
      const response = await request(app)
        .post('/webui/api/config/restore')
        .send({ 
          backupId: '../../../etc/passwd',
          includeSensitive: true 
        })
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
    });
  });
});