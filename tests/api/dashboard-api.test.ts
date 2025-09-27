/**
 * TDD Test Suite for Dashboard API Endpoints
 * 
 * Tests all dashboard-related endpoints with happy path and edge cases
 * 
 * @file dashboard-api.test.ts
 * @author Open-Hivemind TDD Test Suite
 * @since 2025-09-27
 */

import request from 'supertest';
import express from 'express';
import dashboardRouter from '../../dist/src/server/routes/dashboard';
import { BotConfigurationManager } from '../../dist/src/config/BotConfigurationManager';

describe('Dashboard API Endpoints - COMPLETE TDD SUITE', () => {
  let app: express.Application;
  let mockBotConfigManager: jest.Mocked<BotConfigurationManager>;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/dashboard', dashboardRouter);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /dashboard/api/status - HAPPY PATH TESTS', () => {
    it('should return valid bot status with all required fields', async () => {
      const response = await request(app)
        .get('/dashboard/api/status')
        .expect(200);

      expect(response.body).toHaveProperty('bots');
      expect(response.body).toHaveProperty('uptime');
      expect(Array.isArray(response.body.bots)).toBe(true);
      expect(typeof response.body.uptime).toBe('number');

      // Validate bot structure
      if (response.body.bots.length > 0) {
        const bot = response.body.bots[0];
        expect(bot).toHaveProperty('name');
        expect(bot).toHaveProperty('provider');
        expect(bot).toHaveProperty('llmProvider');
        expect(bot).toHaveProperty('status');
        expect(bot).toHaveProperty('connected');
        expect(bot).toHaveProperty('messageCount');
        expect(bot).toHaveProperty('errorCount');
        
        expect(typeof bot.name).toBe('string');
        expect(typeof bot.provider).toBe('string');
        expect(typeof bot.llmProvider).toBe('string');
        expect(typeof bot.status).toBe('string');
        expect(typeof bot.connected).toBe('boolean');
        expect(typeof bot.messageCount).toBe('number');
        expect(typeof bot.errorCount).toBe('number');
      }
    });

    it('should return status codes indicating bot health', async () => {
      const response = await request(app)
        .get('/dashboard/api/status')
        .expect(200);

      // Validate status values are valid
      response.body.bots.forEach((bot: any) => {
        expect(['active', 'inactive', 'connecting', 'disconnected', 'error'])
          .toContain(bot.status);
      });
    });

    it('should return non-negative message and error counts', async () => {
      const response = await request(app)
        .get('/dashboard/api/status')
        .expect(200);

      response.body.bots.forEach((bot: any) => {
        expect(bot.messageCount).toBeGreaterThanOrEqual(0);
        expect(bot.errorCount).toBeGreaterThanOrEqual(0);
      });
    });

    it('should return reasonable uptime value', async () => {
      const response = await request(app)
        .get('/dashboard/api/status')
        .expect(200);

      expect(response.body.uptime).toBeGreaterThan(0);
      expect(response.body.uptime).toBeLessThan(365 * 24 * 3600); // Less than 1 year
    });
  });

  describe('GET /dashboard/api/status - EDGE CASE TESTS', () => {
    it('should handle empty bot configuration gracefully', async () => {
      // Mock empty bot configuration
      jest.spyOn(BotConfigurationManager, 'getInstance').mockReturnValue({
        getAllBots: jest.fn().mockReturnValue([])
      } as any);

      const response = await request(app)
        .get('/dashboard/api/status')
        .expect(200);

      expect(response.body.bots).toEqual([]);
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should handle bot configuration errors gracefully', async () => {
      jest.spyOn(BotConfigurationManager, 'getInstance').mockReturnValue({
        getAllBots: jest.fn().mockImplementation(() => {
          throw new Error('Configuration error');
        })
      } as any);

      const response = await request(app)
        .get('/dashboard/api/status')
        .expect(500);

      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toContain('Failed to get status');
    });

    it('should handle malformed bot data gracefully', async () => {
      jest.spyOn(BotConfigurationManager, 'getInstance').mockReturnValue({
        getAllBots: jest.fn().mockReturnValue([
          { name: 'test-bot' }, // Missing required fields
          null, // Null bot
          undefined, // Undefined bot
          { name: '', provider: '', status: 'invalid-status' } // Invalid data
        ])
      } as any);

      const response = await request(app)
        .get('/dashboard/api/status')
        .expect(200);

      // Should still return valid structure
      expect(response.body).toHaveProperty('bots');
      expect(response.body).toHaveProperty('uptime');
    });

    it('should handle concurrent requests without race conditions', async () => {
      const requests = Array(10).fill(null).map(() =>
        request(app).get('/dashboard/api/status')
      );

      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body).toHaveProperty('bots');
        expect(response.body).toHaveProperty('uptime');
      });
    });

    it('should validate content-type is application/json', async () => {
      const response = await request(app)
        .get('/dashboard/api/status')
        .expect(200)
        .expect('Content-Type', /json/);
    });
  });

  describe('GET /dashboard/ - HTML DASHBOARD TESTS', () => {
    it('should serve dashboard HTML page', async () => {
      const response = await request(app)
        .get('/dashboard/')
        .expect(200);

      // Should return HTML content
      expect(response.headers['content-type']).toMatch(/html/);
    });

    it('should handle dashboard rendering errors gracefully', async () => {
      // Mock bot configuration error
      jest.spyOn(BotConfigurationManager, 'getInstance').mockReturnValue({
        getAllBots: jest.fn().mockImplementation(() => {
          throw new Error('Render error');
        })
      } as any);

      const response = await request(app)
        .get('/dashboard/')
        .expect(500);

      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PERFORMANCE TESTS', () => {
    it('should respond to status requests within reasonable time', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/dashboard/api/status')
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle high load without degradation', async () => {
      const concurrentRequests = 50;
      const requests = Array(concurrentRequests).fill(null).map(() =>
        request(app).get('/dashboard/api/status')
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // Should handle 50 concurrent requests in reasonable time
      expect(duration).toBeLessThan(5000);
    });
  });

  describe('SECURITY TESTS', () => {
    it('should not expose sensitive information in responses', async () => {
      const response = await request(app)
        .get('/dashboard/api/status')
        .expect(200);

      const responseString = JSON.stringify(response.body);
      
      // Should not contain sensitive data
      expect(responseString).not.toMatch(/password/i);
      expect(responseString).not.toMatch(/secret/i);
      expect(responseString).not.toMatch(/token/i);
      expect(responseString).not.toMatch(/key/i);
      expect(responseString).not.toMatch(/auth/i);
    });

    it('should handle malicious input gracefully', async () => {
      const maliciousInputs = [
        '/../../../etc/passwd',
        '<script>alert("xss")</script>',
        'SELECT * FROM users',
        '${7*7}',
        '%2e%2e%2f%2e%2e%2f'
      ];

      for (const input of maliciousInputs) {
        const response = await request(app)
          .get(`/dashboard/api/status?test=${encodeURIComponent(input)}`);
        
        expect([200, 400, 404]).toContain(response.status);
        // Should not execute or process malicious content
      }
    });
  });
});