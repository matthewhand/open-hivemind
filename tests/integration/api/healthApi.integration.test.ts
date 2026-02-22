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
    const webUIServer = getWebUIServer(0);
    app = webUIServer.getApp();
    // In tests we typically use supertest with the app instance,
    // but if we need a running server for some reason:
    // await webUIServer.start();
    // However, supertest starts its own ephemeral server if passed an app.
    // The previous code did app.listen(0) manually.
    // Let's mimic that behavior if needed, or rely on supertest.
    // The original test assigned `server = app.listen(0)`.
    // WebUIServer.start() calls listen internally.

    // For integration tests using supertest, we just need the app.
    // But if we want to ensure the server logic (like error handlers) is fully active as per class,
    // we should rely on the WebUIServer structure.

    // We don't strictly need to start listening on a port for supertest to work with `app`.
    // But to match previous behavior of `server` variable being available for teardown:

    // webUIServer.start() returns a void Promise and assigns this.server.
    // But we can't easily access the underlying http.Server instance from outside without a getter.
    // Let's try just using the app with supertest, which is standard.

    // NOTE: The previous code manually called app.listen(0).
    // WebUIServer doesn't expose a method to just listen on 0 and return the server instance directly easily without modifying it.
    // But we can just assume supertest handles it.

    // If we rely on supertest, we don't need `server` variable for teardown unless we started it manually.
  });

  afterAll(async () => {
    // If we didn't manually start the server, we don't need to close it.
    // supertest creates temporary servers.
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('version');
      expect(response.body.status).toBe('healthy');
    });

    it('should include uptime information', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.body).toHaveProperty('uptime');
      expect(typeof response.body.uptime).toBe('number');
      expect(response.body.uptime).toBeGreaterThan(0);
    });

    it('should include memory usage', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.body).toHaveProperty('memory');
      expect(response.body.memory).toHaveProperty('used');
      expect(response.body.memory).toHaveProperty('total');
      expect(response.body.memory).toHaveProperty('percentage');
    });

    it('should include system information', async () => {
      const response = await request(app).get('/api/health').expect(200);

      expect(response.body).toHaveProperty('system');
      expect(response.body.system).toHaveProperty('platform');
      expect(response.body.system).toHaveProperty('nodeVersion');
      expect(response.body.system).toHaveProperty('processId');
    });
  });

  describe('GET /api/health/detailed', () => {
    it('should return detailed health information', async () => {
      const response = await request(app).get('/api/health/detailed').expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('checks');

      // Should include database connectivity check
      expect(response.body.checks).toHaveProperty('database');

      // Should include configuration validation
      expect(response.body.checks).toHaveProperty('configuration');

      // Should include external service checks
      expect(response.body.checks).toHaveProperty('services');
    });

    it('should perform actual connectivity checks', async () => {
      const response = await request(app).get('/api/health/detailed').expect(200);

      // Database check should be present
      expect(response.body.checks.database).toHaveProperty('status');
      expect(['healthy', 'degraded', 'unhealthy']).toContain(response.body.checks.database.status);

      // Configuration check should be present
      expect(response.body.checks.configuration).toHaveProperty('status');
      expect(response.body.checks.configuration.status).toBe('healthy');
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
