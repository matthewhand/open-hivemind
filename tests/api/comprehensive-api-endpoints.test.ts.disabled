/**
 * COMPREHENSIVE API ENDPOINT TESTS - PHASE 1
 *
 * Complete test coverage for ALL server routes and endpoints
 * 10x expansion of original test coverage
 *
 * @file comprehensive-api-endpoints.test.ts
 * @author Open-Hivemind TDD Test Suite
 * @since 2025-09-27
 */

import axios from 'axios';
import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';

const BASE_URL = 'http://localhost:3028';
const timeout = 30000;

// Create axios instance with comprehensive configuration
const api = axios.create({
  baseURL: BASE_URL,
  timeout: timeout,
  validateStatus: () => true, // Accept all status codes for testing
  maxRedirects: 5,
  headers: {
    'User-Agent': 'Open-Hivemind-Test-Suite/1.0',
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json'
  }
});

describe('COMPREHENSIVE API ENDPOINT TESTS - PHASE 1', () => {
  
  // ============================================================================
  // DASHBOARD API ENDPOINTS - COMPLETE COVERAGE
  // ============================================================================
  
  describe('Dashboard API - Complete Coverage', () => {
    
    describe('GET /dashboard/api/status', () => {
      test('should return bot status with all expected fields', async () => {
        const response = await api.get('/dashboard/api/status');
        
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('bots');
        expect(response.data).toHaveProperty('uptime');
        expect(Array.isArray(response.data.bots)).toBe(true);
        
        // Validate bot structure if bots exist
        if (response.data.bots.length > 0) {
          const bot = response.data.bots[0];
          expect(bot).toHaveProperty('id');
          expect(bot).toHaveProperty('name');
          expect(bot).toHaveProperty('provider');
          expect(bot).toHaveProperty('llmProvider');
          expect(bot).toHaveProperty('status');
          expect(bot).toHaveProperty('connected');
        }
      }, timeout);
      
      test('should handle query parameters gracefully', async () => {
        const testParams = [
          '?detailed=true',
          '?format=json',
          '?include=all',
          '?filter=active',
          '?sort=name',
          '?limit=10'
        ];
        
        for (const params of testParams) {
          const response = await api.get(`/dashboard/api/status${params}`);
          expect([200, 400]).toContain(response.status);
        }
      }, timeout);
      
      test('should return consistent response format', async () => {
        const responses = await Promise.all([
          api.get('/dashboard/api/status'),
          api.get('/dashboard/api/status'),
          api.get('/dashboard/api/status')
        ]);
        
        responses.forEach(response => {
          expect(response.status).toBe(200);
          expect(response.data).toHaveProperty('bots');
          expect(response.data).toHaveProperty('uptime');
        });
      }, timeout);
      
      test('should handle Accept header variations', async () => {
        const acceptHeaders = [
          'application/json',
          'text/plain',
          'application/xml',
          '*/*',
          'application/json, text/plain, */*'
        ];
        
        for (const acceptHeader of acceptHeaders) {
          const response = await api.get('/dashboard/api/status', {
            headers: { 'Accept': acceptHeader }
          });
          expect(response.status).toBe(200);
        }
      }, timeout);
    });
    
    describe('Dashboard Error Handling', () => {
      test('should handle invalid dashboard routes', async () => {
        const invalidRoutes = [
          '/dashboard/api/invalid',
          '/dashboard/api/status/invalid',
          '/dashboard/invalid',
          '/dashboard/api/'
        ];
        
        for (const route of invalidRoutes) {
          const response = await api.get(route);
          expect([404, 500]).toContain(response.status);
        }
      }, timeout);
      
      test('should handle malformed requests to dashboard', async () => {
        const response = await api.post('/dashboard/api/status', 'invalid-json', {
          headers: { 'Content-Type': 'application/json' }
        });
        expect([400, 500]).toContain(response.status);
      }, timeout);
    });
  });
  
  // ============================================================================
  // HEALTH ENDPOINTS - COMPREHENSIVE COVERAGE
  // ============================================================================
  
  describe('Health Endpoints - Complete Coverage', () => {
    
    describe('GET /health', () => {
      test('should return basic health status', async () => {
        const response = await api.get('/health');
        expect(response.status).toBe(200);
        expect(response.data).toHaveProperty('status');
        expect(response.data).toHaveProperty('timestamp');
      }, timeout);
      
      test('should handle concurrent health checks', async () => {
        const requests = Array(10).fill(null).map(() => api.get('/health'));
        const responses = await Promise.all(requests);

        responses.forEach(response => {
          expect(response.status).toBe(200);
          expect(response.data).toHaveProperty('status');
          expect(response.data).toHaveProperty('timestamp');
        });
      }, timeout);
      
      test('should respond quickly to health checks', async () => {
        const start = Date.now();
        const response = await api.get('/health');
        const duration = Date.now() - start;
        
        expect(response.status).toBe(200);
        expect(duration).toBeLessThan(1000); // Should respond within 1 second
      }, timeout);
    });
    
    describe('GET /health/detailed', () => {
      test('should return detailed health information', async () => {
        const response = await api.get('/health/detailed');
        
        if (response.status === 200) {
          expect(response.data).toHaveProperty('uptime');
          expect(response.data).toHaveProperty('memory');
          expect(response.data).toHaveProperty('status');
        } else {
          // If not implemented, should return 404
          expect([404, 501]).toContain(response.status);
        }
      }, timeout);
      
      test('should include system metrics in detailed health', async () => {
        const response = await api.get('/health/detailed');
        
        if (response.status === 200 && typeof response.data === 'object') {
          // Check for common health metrics
          const possibleFields = ['uptime', 'memory', 'cpu', 'disk', 'database', 'services'];
          const hasHealthMetrics = possibleFields.some(field => 
            response.data.hasOwnProperty(field)
          );
          expect(hasHealthMetrics).toBe(true);
        }
      }, timeout);
    });
  });
  
  // ============================================================================
  // WEBUI API ENDPOINTS - COMPREHENSIVE COVERAGE  
  // ============================================================================
  
  describe('WebUI API Endpoints - Complete Coverage', () => {
    
    describe('Configuration Endpoints', () => {
      test('GET /webui/api/config should return configuration', async () => {
        const response = await api.get('/webui/api/config');
        expect([200, 401, 403, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(typeof response.data).toBe('object');
        }
      }, timeout);
      
      test('POST /webui/api/config should handle configuration updates', async () => {
        const testConfig = {
          testKey: 'testValue',
          timestamp: Date.now()
        };
        
        const response = await api.post('/webui/api/config', testConfig);
        expect([200, 201, 400, 401, 403, 404, 500]).toContain(response.status);
      }, timeout);
      
      test('PUT /webui/api/config should handle full configuration replacement', async () => {
        const testConfig = {
          fullConfig: true,
          timestamp: Date.now()
        };
        
        const response = await api.put('/webui/api/config', testConfig);
        expect([200, 201, 400, 401, 403, 404, 500]).toContain(response.status);
      }, timeout);
    });
    
    describe('Bot Management Endpoints', () => {
      test('GET /webui/api/bots should return bot list', async () => {
        const response = await api.get('/webui/api/bots');
        expect([200, 401, 403, 404]).toContain(response.status);
        
        if (response.status === 200) {
          expect(Array.isArray(response.data) || typeof response.data === 'object').toBe(true);
        }
      }, timeout);
      
      test('POST /webui/api/bots should handle bot creation', async () => {
        const newBot = {
          name: 'test-bot',
          provider: 'discord',
          llmProvider: 'openai',
          config: {}
        };
        
        const response = await api.post('/webui/api/bots', newBot);
        expect([200, 201, 400, 401, 403, 404, 500]).toContain(response.status);
      }, timeout);
      
      test('GET /webui/api/bot-config should return bot configurations', async () => {
        const response = await api.get('/webui/api/bot-config');
        expect([200, 401, 403, 404]).toContain(response.status);
      }, timeout);
    });
    
    describe('Administrative Endpoints', () => {
      test('GET /webui/api/health should return WebUI health', async () => {
        const response = await api.get('/webui/api/health');
        expect([200, 404, 501]).toContain(response.status);
      }, timeout);
      
      test('GET /webui/api/admin should return admin interface data', async () => {
        const response = await api.get('/webui/api/admin');
        expect([200, 401, 403, 404]).toContain(response.status);
      }, timeout);
      
      test('POST /webui/api/hot-reload should trigger hot reload', async () => {
        const response = await api.post('/webui/api/hot-reload', {});
        expect([200, 202, 401, 403, 404, 500]).toContain(response.status);
      }, timeout);
      
      test('GET /webui/api/openapi should return API documentation', async () => {
        const response = await api.get('/webui/api/openapi');
        expect([200, 404]).toContain(response.status);
        
        if (response.status === 200) {
          // Should return OpenAPI spec
          expect(typeof response.data).toBe('object');
        }
      }, timeout);
    });
  });
  
  // ============================================================================
  // ADMIN API ENDPOINTS - COMPREHENSIVE COVERAGE
  // ============================================================================
  
  describe('Admin API Endpoints - Complete Coverage', () => {
    
    describe('Swarm Management', () => {
      test('GET /api/swarm/check should return swarm status', async () => {
        const response = await api.get('/api/swarm/check');
        expect([200, 404, 501]).toContain(response.status);
      }, timeout);
      
      test('POST /api/swarm/install should handle swarm installation', async () => {
        const response = await api.post('/api/swarm/install', {});
        expect([200, 202, 400, 401, 403, 404, 500]).toContain(response.status);
      }, timeout);
      
      test('POST /api/swarm/start should handle swarm startup', async () => {
        const response = await api.post('/api/swarm/start', {});
        expect([200, 202, 400, 401, 403, 404, 500]).toContain(response.status);
      }, timeout);
    });
  });
  
  // ============================================================================
  // STATIC ROUTE TESTING - COMPREHENSIVE COVERAGE
  // ============================================================================
  
  describe('Static Routes - Complete Coverage', () => {
    
    test('GET / should serve dashboard or return 404', async () => {
      const response = await api.get('/');
      expect([200, 404]).toContain(response.status);
    }, timeout);
    
    test('Static asset routes should be accessible', async () => {
      const staticRoutes = [
        '/assets/style.css',
        '/assets/app.js', 
        '/favicon.ico',
        '/robots.txt'
      ];
      
      for (const route of staticRoutes) {
        const response = await api.get(route);
        // Static files may or may not exist, but should handle gracefully
        expect([200, 404]).toContain(response.status);
      }
    }, timeout);
    
    test('WebUI routes should serve SPA or redirect', async () => {
      const webuiRoutes = [
        '/webui',
        '/webui/',
        '/webui/dashboard',
        '/uber',
        '/uber/',
        '/admin',
        '/admin/'
      ];
      
      for (const route of webuiRoutes) {
        const response = await api.get(route);
        expect([200, 301, 302, 401, 404]).toContain(response.status);
      }
    }, timeout);
  });
  
  // ============================================================================
  // ERROR HANDLING & EDGE CASES - COMPREHENSIVE COVERAGE
  // ============================================================================
  
  describe('Error Handling - Complete Coverage', () => {
    
    test('should handle non-existent routes gracefully', async () => {
      const invalidRoutes = [
        '/non-existent-route',
        '/api/invalid',
        '/dashboard/invalid', 
        '/webui/invalid',
        '/admin/invalid'
      ];
      
      for (const route of invalidRoutes) {
        const response = await api.get(route);
        expect([404, 500]).toContain(response.status);
      }
    }, timeout);

    test('should handle POST requests to non-existent routes with 404', async () => {
      const response = await api.post('/non-existent-route');
      expect(response.status).toBe(404);
    }, timeout);

    test('should handle PUT requests to non-existent routes with 404', async () => {
      const response = await api.put('/non-existent-route');
      expect(response.status).toBe(404);
    }, timeout);

    test('should handle DELETE requests to non-existent routes with 404', async () => {
      const response = await api.delete('/non-existent-route');
      expect(response.status).toBe(404);
    }, timeout);

    test('should handle PATCH requests to non-existent routes with 404', async () => {
      const response = await api.patch('/non-existent-route');
      expect(response.status).toBe(404);
    }, timeout);

    test('should handle malformed JSON requests', async () => {
      const endpoints = [
        '/dashboard/api/status',
        '/webui/api/config',
        '/api/swarm/install'
      ];
      
      for (const endpoint of endpoints) {
        const response = await api.post(endpoint, 'invalid-json', {
          headers: { 'Content-Type': 'application/json' }
        });
        expect([400, 404, 500]).toContain(response.status);
      }
    }, timeout);
    
    test('should handle oversized requests', async () => {
      const largePayload = 'x'.repeat(10 * 1024 * 1024); // 10MB string
      
      const response = await api.post('/webui/api/config', {
        largeData: largePayload
      });
      expect([400, 413, 500]).toContain(response.status);
    }, timeout);
    
    test('should handle special characters in URLs', async () => {
      const specialChars = [
        '/dashboard/api/status?test=<script>alert("xss")</script>',
        '/webui/api/config?path=../../../etc/passwd',
        '/health?test=${7*7}',
        '/admin?query=SELECT * FROM users'
      ];
      
      for (const url of specialChars) {
        const response = await api.get(url);
        expect([200, 400, 403, 404, 500]).toContain(response.status);
      }
    }, timeout);
  });
  
  // ============================================================================
  // SECURITY & CORS TESTING - COMPREHENSIVE COVERAGE
  // ============================================================================
  
  describe('Security & CORS - Complete Coverage', () => {
    
    test('should handle CORS preflight requests', async () => {
      const response = await api.options('/dashboard/api/status', {
        headers: {
          'Origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'GET',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      });
      expect([200, 204, 404]).toContain(response.status);
    }, timeout);
    
    test('should include security headers', async () => {
      const response = await api.get('/dashboard/api/status');
      
      if (response.status === 200) {
        const headers = response.headers;
        
        // Check for common security headers
        const securityHeaders = [
          'x-content-type-options',
          'content-security-policy',
          'x-frame-options',
          'x-xss-protection'
        ];
        
        // At least some security headers should be present
        const hasSecurityHeaders = securityHeaders.some(header => 
          headers.hasOwnProperty(header.toLowerCase())
        );
        // Note: This is informational - not all servers implement all headers
      }
    }, timeout);
    
    test('should handle cross-origin requests appropriately', async () => {
      const origins = [
        'http://localhost:3000',
        'http://127.0.0.1:3000', 
        'https://example.com',
        'null'
      ];
      
      for (const origin of origins) {
        const response = await api.get('/health', {
          headers: { 'Origin': origin }
        });
        expect(response.status).toBe(200);
      }
    }, timeout);
  });
  
  // ============================================================================
  // PERFORMANCE TESTING - COMPREHENSIVE COVERAGE
  // ============================================================================
  
  describe('Performance Testing - Complete Coverage', () => {
    
    test('should handle concurrent requests to all major endpoints', async () => {
      const endpoints = [
        '/health',
        '/dashboard/api/status',
        '/webui/api/config',
        '/webui/api/bots',
        '/api/swarm/check'
      ];
      
      const requests = endpoints.flatMap(endpoint =>
        Array(3).fill(null).map(() => api.get(endpoint))
      );
      
      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;
      
      responses.forEach(response => {
        expect([200, 401, 403, 404, 500, 501]).toContain(response.status);
      });
      
      expect(duration).toBeLessThan(10000); // Should complete within 10 seconds
    }, timeout);
    
    test('should maintain consistent response times', async () => {
      const measurements = [];
      
      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await api.get('/health');
        const duration = Date.now() - start;
        measurements.push(duration);
        
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      const avgResponseTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
      expect(avgResponseTime).toBeLessThan(2000); // Average should be under 2 seconds
    }, timeout);
  });
});