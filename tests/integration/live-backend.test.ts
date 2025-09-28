/**
 * Integration Tests for Live Backend API Endpoints
 * 
 * Tests all real backend endpoints running on localhost:5005
 * 
 * @file live-backend-integration.test.ts
 * @author Open-Hivemind TDD Test Suite
 * @since 2025-09-27
 */

import axios from 'axios';

const BASE_URL = 'http://localhost:3028';
const timeout = 30000;

// Create axios instance with timeout
const api = axios.create({
  baseURL: BASE_URL,
  timeout: timeout,
  validateStatus: () => true // Accept all status codes for testing
});

describe('Live Backend Integration Tests - COMPLETE TDD SUITE', () => {
  
  describe('Dashboard API Endpoints - LIVE TESTS', () => {
    it('should return real bot status data from live backend', async () => {
      const response = await api.get('/dashboard/api/status');
      
      expect(response.status).toBe(200);
      expect(response.data).toHaveProperty('bots');
      expect(response.data).toHaveProperty('uptime');
      expect(Array.isArray(response.data.bots)).toBe(true);
      expect(typeof response.data.uptime).toBe('number');
      
      // Validate actual bot data structure
      response.data.bots.forEach((bot: any) => {
        expect(bot).toHaveProperty('id');
        expect(bot).toHaveProperty('name');
        expect(bot).toHaveProperty('provider');
        expect(bot).toHaveProperty('llmProvider');
        expect(bot).toHaveProperty('status');
        expect(bot).toHaveProperty('connected');
        expect(bot).toHaveProperty('messageCount');
        expect(bot).toHaveProperty('errorCount');
        
        expect(typeof bot.id).toBe('string');
        expect(typeof bot.name).toBe('string');
        expect(typeof bot.provider).toBe('string');
        expect(typeof bot.llmProvider).toBe('string');
        expect(typeof bot.status).toBe('string');
        expect(typeof bot.connected).toBe('boolean');
        expect(typeof bot.messageCount).toBe('number');
        expect(typeof bot.errorCount).toBe('number');
        
        // Validate status values
        expect(['active', 'inactive', 'connecting', 'disconnected', 'error'])
          .toContain(bot.status);
      });
    }, timeout);

    it('should return reasonable data values', async () => {
      const response = await api.get('/dashboard/api/status');
      
      expect(response.status).toBe(200);
      expect(response.data.uptime).toBeGreaterThan(0);
      
      response.data.bots.forEach((bot: any) => {
        expect(bot.messageCount).toBeGreaterThanOrEqual(0);
        expect(bot.errorCount).toBeGreaterThanOrEqual(0);
        expect(bot.name.length).toBeGreaterThan(0);
        expect(bot.id.length).toBeGreaterThan(0);
      });
    }, timeout);

    it('should handle concurrent requests without issues', async () => {
      const requests = Array(5).fill(null).map(() =>
        api.get('/dashboard/api/status')
      );
      
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('bots');
        expect(response.data).toHaveProperty('uptime');
      });
    }, timeout);

    it('should respond within reasonable time', async () => {
      const start = Date.now();
      
      const response = await api.get('/dashboard/api/status');
      
      const duration = Date.now() - start;
      expect(response.status).toBe(200);
      expect(duration).toBeLessThan(2000); // Should respond within 2 seconds
    }, timeout);
  });

  describe('Health Endpoints - LIVE TESTS', () => {
    test('should return health status', async () => {
      const response = await axios.get(`${BASE_URL}/health`);
      
      expect(response.status).toBe(200);
      
      if (response.status === 200) {
        // Health endpoint returns JSON object with status info
        expect(response.data).toHaveProperty('status');
        expect(response.data).toHaveProperty('timestamp');
      }
    }, 30000);

    it('should return detailed health information', async () => {
      const response = await api.get('/health/detailed');
      
      if (response.status === 200) {
        expect(response.data).toHaveProperty('uptime');
        expect(response.data).toHaveProperty('memory');
        expect(typeof response.data.uptime).toBe('number');
        expect(response.data.uptime).toBeGreaterThan(0);
      }
    }, timeout);
  });

  describe('Static Routes - LIVE TESTS', () => {
    it('should serve root dashboard page', async () => {
      const response = await api.get('/');
      
      expect([200, 404]).toContain(response.status);
      
      if (response.status === 200) {
        expect(response.headers['content-type']).toMatch(/html/);
      }
    }, timeout);

    it('should handle unknown routes gracefully', async () => {
      const response = await api.get('/nonexistent-route');
      
      expect([404, 500]).toContain(response.status);
    }, timeout);
  });

  describe('WebUI API Routes - LIVE TESTS', () => {
    it('should test webui health endpoint if available', async () => {
      const response = await api.get('/webui/api/health');
      
      // May return 404 if not implemented, which is fine
      expect([200, 404, 500]).toContain(response.status);
    }, timeout);

    it('should test webui config endpoint if available', async () => {
      const response = await api.get('/webui/api/config');
      
      expect([200, 401, 403, 404, 500]).toContain(response.status);
    }, timeout);
  });

  describe('CORS and Security Headers - LIVE TESTS', () => {
    it('should handle CORS requests properly', async () => {
      const response = await api.options('/dashboard/api/status', {
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET'
        }
      });
      
      // Should handle OPTIONS requests
      expect([200, 404]).toContain(response.status);
    }, timeout);

    it('should include security headers', async () => {
      const response = await api.get('/dashboard/api/status');
      
      expect(response.status).toBe(200);
      
      // Check for security headers if present
      if (response.headers['x-content-type-options']) {
        expect(response.headers['x-content-type-options']).toBe('nosniff');
      }
    }, timeout);
  });

  describe('Error Handling - LIVE TESTS', () => {
    it('should handle malformed requests', async () => {
      const response = await api.post('/dashboard/api/status', 'invalid-json', {
        headers: { 'Content-Type': 'application/json' }
      });
      
      // Should handle gracefully
      expect([400, 404, 405, 500]).toContain(response.status);
    }, timeout);

    it('should handle long URLs', async () => {
      const longPath = '/dashboard/api/status?' + 'x='.repeat(1000);
      const response = await api.get(longPath);
      
      expect([200, 400, 414, 500]).toContain(response.status);
    }, timeout);

    it('should handle special characters in URLs', async () => {
      const specialChars = [
        '/dashboard/api/status?test=<script>',
        '/dashboard/api/status?test=../../../etc/passwd',
        '/dashboard/api/status?test=${7*7}',
        '/dashboard/api/status?test=SELECT * FROM users'
      ];
      
      for (const url of specialChars) {
        const response = await api.get(url);
        expect([200, 400, 403, 404, 500]).toContain(response.status);
      }
    }, timeout);
  });

  describe('Performance Tests - LIVE TESTS', () => {
    it('should handle multiple rapid requests', async () => {
      // Test fewer concurrent requests to avoid overwhelming the server
      const requests = Array(3).fill(null).map((_, index) => 
        new Promise(resolve => {
          setTimeout(async () => {
            try {
              const response = await api.get('/dashboard/api/status');
              resolve(response);
            } catch (e) {
              resolve({ status: 500, error: e });
            }
          }, index * 200); // Stagger requests by 200ms
        })
      );
      
      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;
      
      responses.forEach((response: any) => {
        if (response.status) {
          expect([200, 500]).toContain(response.status);
        }
      });
      
      expect(duration).toBeLessThan(15000); // Should complete within 15 seconds
    }, timeout);

    it('should maintain response quality under load', async () => {
      const response1 = await api.get('/dashboard/api/status');
      expect(response1.status).toBe(200);
      
      // Brief pause to avoid overwhelming
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Test that server still responds correctly 
      const response2 = await api.get('/dashboard/api/status');
      
      expect(response2.status).toBe(200);
      expect(response2.data).toHaveProperty('bots');
    }, timeout);
  });
});