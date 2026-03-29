import express from 'express';
import request from 'supertest';
import healthRouter from '../../../src/server/routes/health';
import { MetricsCollector } from '../../../src/monitoring/MetricsCollector';
import { ErrorLogger } from '../../../src/utils/errorLogger';
import { globalRecoveryManager } from '../../../src/utils/errorRecovery';
import ApiMonitorService from '../../../src/services/ApiMonitorService';
import { DatabaseManager } from '../../../src/database/DatabaseManager';

// Mock dependencies
jest.mock('../../../src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: jest.fn().mockReturnValue({
      isConnected: jest.fn().mockReturnValue(true)
    })
  }
}));

jest.mock('../../../src/server/middleware/auth', () => ({
  optionalAuth: (req: any, res: any, next: any) => {
    // Mock user if special header is present
    if (req.headers['x-auth-test']) {
      req.user = { id: 'test', username: 'tester', role: 'admin' };
    }
    next();
  }
}));

describe('Health Routes Integration', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/health', healthRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/health/detailed', () => {
    it('returns sanitized health data for unauthenticated requests', async () => {
      const response = await request(app).get('/api/health/detailed');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).not.toHaveProperty('memory');
    });

    it('returns full health data for authenticated requests', async () => {
      const response = await request(app)
        .get('/api/health/detailed')
        .set('x-auth-test', 'true');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('cpu');
      expect(response.body).toHaveProperty('system');
    });
  });

  describe('GET /api/health/detailed/services', () => {
    it('returns services status', async () => {
      const response = await request(app)
        .get('/api/health/detailed/services')
        .set('x-auth-test', 'true');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('services');
      expect(Array.isArray(response.body.services)).toBe(true);

      // Should have Database check
      const dbService = response.body.services.find((s: any) => s.name === 'Database');
      expect(dbService).toBeDefined();
    });
  });

  describe('GET /api/health/metrics', () => {
    it('returns system metrics', async () => {
      const response = await request(app).get('/api/health/metrics');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('cpu');
    });
  });

  describe('GET /api/health/alerts', () => {
    it('returns alerts based on thresholds', async () => {
      const response = await request(app).get('/api/health/alerts');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('alerts');
      expect(Array.isArray(response.body.alerts)).toBe(true);
    });
  });

  describe('GET /api/health/ready', () => {
    it('returns readiness status based on db connection', async () => {
      const response = await request(app).get('/api/health/ready');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('ready', true);
    });

    it('returns 503 if db is down', async () => {
      (DatabaseManager.getInstance as jest.Mock).mockReturnValueOnce({
        isConnected: jest.fn().mockReturnValue(false)
      });

      const response = await request(app).get('/api/health/ready');

      expect(response.status).toBe(503);
      expect(response.body).toHaveProperty('ready', false);
    });
  });

  describe('GET /api/health/live', () => {
    it('returns liveness status', async () => {
      const response = await request(app).get('/api/health/live');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('alive', true);
    });
  });

  describe('GET /api/health/metrics/prometheus', () => {
    it('returns prometheus metrics format', async () => {
      const response = await request(app).get('/api/health/metrics/prometheus');

      expect(response.status).toBe(200);
      expect(response.text).toContain('process_uptime_seconds');
      expect(response.text).toContain('process_memory_heap_used_bytes');
    });
  });

  describe('API Endpoints Monitoring Routes', () => {
    let endpointId: string;

    it('POST /api/health/api-endpoints adds an endpoint', async () => {
      const response = await request(app)
        .post('/api/health/api-endpoints')
        .send({
          id: 'test-api',
          name: 'Test API',
          url: 'http://test.com'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Endpoint added successfully');
      endpointId = response.body.endpoint.id;
    });

    it('GET /api/health/api-endpoints returns all endpoints', async () => {
      const response = await request(app).get('/api/health/api-endpoints');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body).toHaveProperty('overall');
    });

    it('GET /api/health/api-endpoints/:id returns specific endpoint', async () => {
      expect(endpointId).toBeDefined(); // Fail fast if POST didn't run
      const response = await request(app).get(`/api/health/api-endpoints/${endpointId}`);

      expect(response.status).toBe(200);
      expect(response.body.endpoint).toBeDefined();
    });

    it('PUT /api/health/api-endpoints/:id updates an endpoint', async () => {
      expect(endpointId).toBeDefined(); // Fail fast if POST didn't run
      const response = await request(app)
        .put(`/api/health/api-endpoints/${endpointId}`)
        .send({ name: 'Updated API' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Endpoint updated successfully');
    });

    it('DELETE /api/health/api-endpoints/:id removes an endpoint', async () => {
      expect(endpointId).toBeDefined(); // Fail fast if POST didn't run
      const response = await request(app).delete(`/api/health/api-endpoints/${endpointId}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Endpoint removed successfully');
    });

    it('POST /api/health/api-endpoints/start starts monitoring', async () => {
      const response = await request(app).post('/api/health/api-endpoints/start');

      expect(response.status).toBe(200);
    });

    it('POST /api/health/api-endpoints/stop stops monitoring', async () => {
      const response = await request(app).post('/api/health/api-endpoints/stop');

      expect(response.status).toBe(200);
    });
  });

  describe('Error & Recovery Routes', () => {
    it('GET /api/health/errors returns error stats', async () => {
      const response = await request(app).get('/api/health/errors');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('errors');
      expect(response.body).toHaveProperty('health');
    });

    it('GET /api/health/recovery returns recovery stats', async () => {
      const response = await request(app).get('/api/health/recovery');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('circuitBreakers');
      expect(response.body).toHaveProperty('health');
    });

    it('GET /api/health/errors/patterns returns error patterns', async () => {
      const response = await request(app).get('/api/health/errors/patterns');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('patterns');
      expect(response.body).toHaveProperty('recommendations');
    });
  });

  describe('Edge cases in Error & Recovery', () => {
    it('handles GET /api/health/api-endpoints/:id for non-existent endpoint', async () => {
      const response = await request(app).get('/api/health/api-endpoints/does-not-exist');
      expect(response.status).toBe(404);
    });

    it('handles PUT /api/health/api-endpoints/:id for non-existent endpoint', async () => {
      const response = await request(app)
        .put('/api/health/api-endpoints/does-not-exist')
        .send({ name: 'Update' });
      expect(response.status).toBe(404);
    });

    it('handles DELETE /api/health/api-endpoints/:id for non-existent endpoint', async () => {
      const response = await request(app).delete('/api/health/api-endpoints/does-not-exist');
      expect(response.status).toBe(404);
    });

    it('handles POST /api/health/api-endpoints with missing required fields', async () => {
      const response = await request(app)
        .post('/api/health/api-endpoints')
        .send({ name: 'Test API' }); // missing id and url
      expect(response.status).toBe(400);
    });

    // Documents current behavior: empty body returns 200 with a message rather than 400.
    // Ideally this would be a 400, but we test what the server actually does today.
    it('handles POST /api/health/api-endpoints with empty body', async () => {
      const response = await request(app).post('/api/health/api-endpoints').send({});
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('No endpoint data provided');
    });

    it('handles POST /api/health/cleanup with missing required fields', async () => {
      const response = await request(app)
        .post('/api/health/cleanup')
        .send({ name: 'Test API' }); // missing id and url
      expect(response.status).toBe(400);
    });

    // Documents current behavior: empty body returns 200 with a message rather than 400.
    // Ideally this would be a 400, but we test what the server actually does today.
    it('handles POST /api/health/cleanup with empty body', async () => {
      const response = await request(app).post('/api/health/cleanup').send({});
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('No endpoint data provided');
    });

    it('handles POST /api/health/cleanup adds an endpoint', async () => {
      const response = await request(app)
        .post('/api/health/cleanup')
        .send({
          id: 'test-api-cleanup',
          name: 'Test API Cleanup',
          url: 'http://test-cleanup.com'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toBe('Endpoint added successfully');
    });
  });
});
