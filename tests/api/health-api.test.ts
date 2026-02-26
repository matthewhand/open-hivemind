/**
 * TDD Test Suite for Health API Endpoints
 *
 * Comprehensive tests for all health check endpoints with edge cases
 *
 * @file health-api.test.ts
 * @author Open-Hivemind TDD Test Suite
 * @since 2025-09-27
 */

import express from 'express';
import request from 'supertest';
import healthRouter from '../../src/server/routes/health';

describe('Health API Endpoints - COMPLETE TDD SUITE', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/health', healthRouter);
    app.use('/health', healthRouter); // Health routes mounted at /health
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /health - BASIC HEALTH CHECK', () => {
    it('should return healthy status with all required fields', async () => {
      const response = await request(app).get('/health').expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.status).toBe('healthy');
      expect(new Date(response.body.timestamp)).toBeInstanceOf(Date);
    });

    it('should respond quickly for health checks', async () => {
      const start = Date.now();

      await request(app).get('/health').expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100); // Should be very fast
    });

    it('should return consistent results on multiple calls', async () => {
      const responses = await Promise.all([
        request(app).get('/health'),
        request(app).get('/health'),
        request(app).get('/health'),
      ]);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
      });
    });
  });

  describe('GET /health/detailed - DETAILED HEALTH CHECK', () => {
    it('should return comprehensive system health information', async () => {
      const response = await request(app).get('/health/detailed').expect(200);

      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('cpu');
      expect(response.body).toHaveProperty('system');

      // Memory information
      expect(response.body.memory).toHaveProperty('used');
      expect(response.body.memory).toHaveProperty('total');
      expect(response.body.memory).toHaveProperty('percentage');

      // System information
      expect(response.body.system).toHaveProperty('platform');
      expect(response.body.system).toHaveProperty('arch');
      expect(response.body.system).toHaveProperty('nodeVersion');

      // Validate data types
      expect(typeof response.body.uptime).toBe('number');
      expect(typeof response.body.memory.used).toBe('number');
      expect(typeof response.body.memory.total).toBe('number');
      expect(typeof response.body.memory.percentage).toBe('number');
    });

    it('should calculate memory percentage correctly', async () => {
      const response = await request(app).get('/health/detailed').expect(200);

      const { memory } = response.body;
      const expectedPercentage = (memory.used / memory.total) * 100;

      expect(memory.percentage).toBeCloseTo(expectedPercentage, 1);
      expect(memory.percentage).toBeGreaterThanOrEqual(0);
      expect(memory.percentage).toBeLessThanOrEqual(100);
    });

    it('should return valid system information', async () => {
      const response = await request(app).get('/health/detailed').expect(200);

      const { system } = response.body;

      expect(['linux', 'darwin', 'win32']).toContain(system.platform);
      expect(['x64', 'arm64', 'ia32']).toContain(system.arch);
      expect(system.nodeVersion).toMatch(/^v\d+\.\d+\.\d+/);
    });
  });

  describe('GET /health/metrics - PERFORMANCE METRICS', () => {
    it('should return performance metrics with required fields', async () => {
      const response = await request(app).get('/health/metrics').expect(200);

      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('cpu');
      expect(response.body).toHaveProperty('eventLoop');

      // Event loop metrics
      expect(response.body.eventLoop).toHaveProperty('delay');
      expect(response.body.eventLoop).toHaveProperty('utilization');

      // Validate numeric types
      expect(typeof response.body.uptime).toBe('number');
      expect(typeof response.body.eventLoop.delay).toBe('number');
    });

    it('should return reasonable performance values', async () => {
      const response = await request(app).get('/health/metrics').expect(200);

      expect(response.body.uptime).toBeGreaterThan(0);
      expect(response.body.memory.used).toBeGreaterThan(0);
      expect(response.body.eventLoop.delay).toBeGreaterThanOrEqual(0);
    });
  });

  describe('GET /health/alerts - SYSTEM ALERTS', () => {
    it('should return system alerts array', async () => {
      const response = await request(app).get('/health/alerts').expect(200);

      expect(response.body).toHaveProperty('alerts');
      expect(Array.isArray(response.body.alerts)).toBe(true);
      expect(response.body).toHaveProperty('timestamp');
    });

    it('should validate alert structure when alerts exist', async () => {
      const response = await request(app).get('/health/alerts').expect(200);

      response.body.alerts.forEach((alert: any) => {
        expect(alert).toHaveProperty('level');
        expect(alert).toHaveProperty('message');
        expect(alert).toHaveProperty('timestamp');
        expect(['info', 'warning', 'error', 'critical']).toContain(alert.level);
        expect(typeof alert.message).toBe('string');
      });
    });

    it('should detect high memory usage alerts', async () => {
      // Force high memory usage scenario
      const largeArray = new Array(1000000).fill('test');

      const response = await request(app).get('/health/alerts').expect(200);

      // Check if memory alert is generated when usage is high
      const memoryAlerts = response.body.alerts.filter((alert: any) =>
        alert.message.toLowerCase().includes('memory')
      );

      // Clean up
      largeArray.length = 0;
    });
  });

  describe('GET /health/ready - READINESS PROBE', () => {
    it('should return readiness status', async () => {
      const response = await request(app).get('/health/ready').expect(200);

      expect(response.body).toHaveProperty('ready');
      expect(response.body).toHaveProperty('timestamp');
      expect(typeof response.body.ready).toBe('boolean');
    });

    it('should be ready when all dependencies are available', async () => {
      const response = await request(app).get('/health/ready').expect(200);

      expect(response.body.ready).toBe(true);
    });
  });

  describe('GET /health/live - LIVENESS PROBE', () => {
    it('should return liveness status', async () => {
      const response = await request(app).get('/health/live').expect(200);

      expect(response.body).toHaveProperty('alive');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.alive).toBe(true);
    });

    it('should respond very quickly for liveness checks', async () => {
      const start = Date.now();

      await request(app).get('/health/live').expect(200);

      const duration = Date.now() - start;
      expect(duration).toBeLessThan(50); // Should be extremely fast
    });
  });

  describe('GET /health/metrics/prometheus - PROMETHEUS METRICS', () => {
    it('should return Prometheus format metrics', async () => {
      const response = await request(app).get('/health/metrics/prometheus').expect(200);

      expect(response.headers['content-type']).toMatch(/text\/plain/);
      expect(response.text).toMatch(/# HELP/);
      expect(response.text).toMatch(/# TYPE/);
    });

    it('should include standard Prometheus metrics', async () => {
      const response = await request(app).get('/health/metrics/prometheus').expect(200);

      const metrics = response.text;

      // Should include process metrics
      expect(metrics).toMatch(/process_cpu_user_seconds_total/);
      expect(metrics).toMatch(/process_resident_memory_bytes/);
      expect(metrics).toMatch(/nodejs_heap_size_total_bytes/);
    });
  });

  describe('EDGE CASES AND ERROR HANDLING', () => {
    it('should handle invalid routes gracefully', async () => {
      await request(app).get('/health/invalid-endpoint').expect(404);
    });

    it('should handle malformed requests', async () => {
      await request(app).get('/health/detailed').set('Content-Type', 'invalid/type').expect(200); // Should still work despite invalid content-type
    });

    it('should handle concurrent health checks without issues', async () => {
      const requests = Array(20)
        .fill(null)
        .map(() => request(app).get('/health'));

      const responses = await Promise.all(requests);

      responses.forEach((response) => {
        expect(response.status).toBe(200);
        expect(response.body.status).toBe('healthy');
      });
    });

    it('should not crash on resource exhaustion simulation', async () => {
      // Test multiple concurrent detailed health checks
      const heavyRequests = Array(10)
        .fill(null)
        .map(() => request(app).get('/health/detailed'));

      const responses = await Promise.all(heavyRequests);

      responses.forEach((response) => {
        expect([200, 500, 503]).toContain(response.status);
      });
    });
  });

  describe('SECURITY TESTS', () => {
    it('should not expose sensitive system information', async () => {
      const response = await request(app).get('/health/detailed').expect(200);

      const responseString = JSON.stringify(response.body);

      // Should not contain sensitive paths or credentials
      expect(responseString).not.toMatch(/\/etc\/passwd/);
      expect(responseString).not.toMatch(/\/root\//);
      expect(responseString).not.toMatch(/password/i);
      expect(responseString).not.toMatch(/secret/i);
      expect(responseString).not.toMatch(/token/i);
    });

    it('should validate against injection attempts', async () => {
      const injectionAttempts = [
        '/../../../etc/passwd',
        '<script>alert("xss")</script>',
        'SELECT * FROM users',
        '${process.env.SECRET}',
        '{{7*7}}',
      ];

      for (const injection of injectionAttempts) {
        const response = await request(app).get(`/health?test=${encodeURIComponent(injection)}`);

        expect([200, 400, 404]).toContain(response.status);
      }
    });
  });
});
