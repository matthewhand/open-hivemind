/**
 * Integration tests for Health API endpoints
 * Tests real API flows end-to-end
 */

import express from 'express';
import request from 'supertest';
import { ConfigurationManager } from '../../../src/config/ConfigurationManager';
import { getWebUIServer } from '../../../src/server/server';

describe('Health API Integration Tests', () => {
  let app: express.Application;
  let server: any;

  beforeAll(async () => {
    // Set up test configuration
    process.env.NODE_ENV = 'test';
    process.env.NODE_CONFIG_DIR = 'config/test';

    // Initialize configuration
    ConfigurationManager.getInstance();

    // Create and start server
    const webUIServer = getWebUIServer(0); // Use random available port
    await webUIServer.start();
    app = webUIServer.getApp();
    server = (webUIServer as any).server;
  });

  afterAll(async () => {
    // If we manually started the server, we need to close it if WebUIServer doesn't handle it in supertest context
    // Actually supertest manages its own server if we pass it the app, but here we explicitly start it.
    if (server && server.close) {
      await new Promise((resolve) => server.close(resolve));
    }
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.status).toBe('healthy');
    });
  });

  describe('GET /api/health/detailed', () => {
    it('should return detailed health information', async () => {
      const response = await request(app).get('/api/health/detailed').expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('cpu');
      expect(response.body).toHaveProperty('system');
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('recovery');
      expect(response.body).toHaveProperty('performance');
    });

    it('should include valid system information', async () => {
      const response = await request(app).get('/api/health/detailed').expect(200);

      expect(response.body.system).toHaveProperty('platform');
      expect(response.body.system).toHaveProperty('nodeVersion');
      expect(response.body.system).toHaveProperty('arch');
    });

    it('should include memory statistics', async () => {
      const response = await request(app).get('/api/health/detailed').expect(200);

      expect(response.body.memory).toHaveProperty('used');
      expect(response.body.memory).toHaveProperty('total');
      expect(response.body.memory).toHaveProperty('percentage');
    });
  });

  describe('Health check reliability', () => {
    it('should handle concurrent health check requests', async () => {
      const concurrentRequests = 10;
      const promises = Array(concurrentRequests)
        .fill(null)
        .map(() => request(app).get('/api/health').expect(200));

      const responses = await Promise.all(promises);

      // All responses should be successful
      responses.forEach((response) => {
        expect(response.body.status).toBe('healthy');
        expect(response.body).toHaveProperty('timestamp');
      });
    });

    it('should respond within acceptable time limits', async () => {
      const startTime = Date.now();

      await request(app).get('/api/health').expect(200);

      const responseTime = Date.now() - startTime;
      expect(responseTime).toBeLessThan(1000); // Should respond within 1 second
    });

    it('should handle malformed requests gracefully', async () => {
      // Test with invalid headers
      await request(app).get('/api/health').set('Content-Type', 'invalid').expect(200); // Should still work despite invalid headers
    });
  });

  describe('Health check under load', () => {
    it('should maintain performance under sustained load', async () => {
      const numberOfRequests = 50;
      const responseTimes: number[] = [];

      for (let i = 0; i < numberOfRequests; i++) {
        const startTime = Date.now();

        await request(app).get('/api/health').expect(200);

        const responseTime = Date.now() - startTime;
        responseTimes.push(responseTime);

        // Small delay to simulate real usage
        await new Promise((resolve) => setTimeout(resolve, 10));
      }

      const averageResponseTime = responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length;
      const maxResponseTime = Math.max(...responseTimes);

      expect(averageResponseTime).toBeLessThan(500); // Average under 500ms
      expect(maxResponseTime).toBeLessThan(2000); // Max under 2 seconds

      console.log('Load test results:', {
        requests: numberOfRequests,
        avgResponseTime: `${averageResponseTime.toFixed(2)}ms`,
        maxResponseTime: `${maxResponseTime.toFixed(2)}ms`,
      });
    });
  });
});
