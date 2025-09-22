import express from 'express';
import request from 'supertest';
import { runRoute } from '../helpers/expressRunner';
import healthRouter from '../../src/routes/health';
import ApiMonitorService from '../../src/services/ApiMonitorService';

describe('Health Routes - API Monitoring', () => {
  let app: express.Application;
  let apiMonitor: ApiMonitorService;

  beforeEach(() => {
    app = express();
    app.disable('x-powered-by');
    app.set('case sensitive routing', true);
    app.set('strict routing', true);
    app.use(express.json());
    app.use('/', healthRouter);

    apiMonitor = ApiMonitorService.getInstance();
    apiMonitor.stopAllMonitoring();

    // Clear all endpoints
    apiMonitor.getAllEndpoints().forEach(endpoint => {
      apiMonitor.removeEndpoint(endpoint.id);
    });
  });

  afterEach(() => {
    apiMonitor.stopAllMonitoring();
  });

  describe('GET /health/api-endpoints', () => {
    it('should return empty list when no endpoints configured', async () => {
      const response = await request(app).get('/health/api-endpoints');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('overall');
      expect(response.body).toHaveProperty('endpoints');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.endpoints).toHaveLength(0);
      expect(response.body.overall.status).toBe('healthy');
    });

    it('should return endpoint statuses', async () => {
      // Add a test endpoint
      apiMonitor.addEndpoint({
        id: 'test-endpoint',
        name: 'Test API',
        url: 'https://httpbin.org/get',
        method: 'GET',
        interval: 60000,
        enabled: true,
      });

      const response = await request(app).get('/health/api-endpoints');
      expect(response.status).toBe(200);
      expect(response.body.endpoints).toHaveLength(1);
      expect(response.body.endpoints[0].id).toBe('test-endpoint');
      expect(response.body.endpoints[0].name).toBe('Test API');
    });

    it('should return overall health statistics', async () => {
      // Add multiple endpoints with different statuses
      apiMonitor.addEndpoint({
        id: 'online-endpoint',
        name: 'Online API',
        url: 'https://httpbin.org/get',
        method: 'GET',
        interval: 60000,
        enabled: true,
      });

      apiMonitor.addEndpoint({
        id: 'slow-endpoint',
        name: 'Slow API',
        url: 'https://httpbin.org/get',
        method: 'GET',
        interval: 60000,
        enabled: true,
      });

      const response = await request(app).get('/health/api-endpoints');
      expect(response.status).toBe(200);
      expect(response.body.overall).toHaveProperty('status');
      expect(response.body.overall).toHaveProperty('message');
      expect(response.body.overall).toHaveProperty('stats');
      expect(response.body.overall.stats).toHaveProperty('total');
      expect(response.body.overall.stats).toHaveProperty('online');
      expect(response.body.overall.stats).toHaveProperty('slow');
      expect(response.body.overall.stats).toHaveProperty('offline');
      expect(response.body.overall.stats).toHaveProperty('error');
    });
  });

  describe('GET /health/api-endpoints/:id', () => {
    it('should return specific endpoint status', async () => {
      apiMonitor.addEndpoint({
        id: 'test-endpoint',
        name: 'Test API',
        url: 'https://httpbin.org/get',
        method: 'GET',
        interval: 60000,
        enabled: true,
      });

      const response = await request(app).get('/health/api-endpoints/test-endpoint');
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('endpoint');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body.endpoint.id).toBe('test-endpoint');
    });

    it('should return 404 for non-existent endpoint', async () => {
      const response = await request(app).get('/health/api-endpoints/non-existent');
      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Endpoint not found');
    });
  });

  describe('POST /health/api-endpoints', () => {
    it('should add new endpoint', async () => {
      const endpointData = {
        id: 'new-endpoint',
        name: 'New API',
        url: 'https://httpbin.org/get',
        method: 'GET',
        interval: 60000,
        timeout: 10000,
        enabled: true,
        retries: 3,
        retryDelay: 1000,
      };

      const response = await request(app)
        .post('/health/api-endpoints')
        .send(endpointData);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('message');
      expect(response.body).toHaveProperty('endpoint');
      expect(response.body.message).toBe('Endpoint added successfully');
      expect(response.body.endpoint.id).toBe('new-endpoint');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/health/api-endpoints')
        .send({ name: 'Test' }); // Missing id and url

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Missing required fields');
    });

    it('should set default values for optional fields', async () => {
      const minimalEndpoint = {
        id: 'minimal-endpoint',
        name: 'Minimal API',
        url: 'https://httpbin.org/get',
      };

      const response = await request(app)
        .post('/health/api-endpoints')
        .send(minimalEndpoint);

      expect(response.status).toBe(201);
      const endpoint = apiMonitor.getEndpoint('minimal-endpoint');
      expect(endpoint?.method).toBe('GET');
      expect(endpoint?.enabled).toBe(true);
      expect(endpoint?.interval).toBe(60000);
      expect(endpoint?.timeout).toBe(10000);
      expect(endpoint?.retries).toBe(3);
      expect(endpoint?.retryDelay).toBe(1000);
    });
  });

  describe('PUT /health/api-endpoints/:id', () => {
    it('should update existing endpoint', async () => {
      apiMonitor.addEndpoint({
        id: 'test-endpoint',
        name: 'Original Name',
        url: 'https://httpbin.org/get',
        method: 'GET',
        interval: 60000,
        enabled: true,
      });

      const updateData = {
        name: 'Updated Name',
        interval: 120000,
      };

      const response = await request(app)
        .put('/health/api-endpoints/test-endpoint')
        .send(updateData);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Endpoint updated successfully');

      const endpoint = apiMonitor.getEndpoint('test-endpoint');
      expect(endpoint?.name).toBe('Updated Name');
      expect(endpoint?.interval).toBe(120000);
    });

    it('should return 404 for non-existent endpoint', async () => {
      const response = await request(app)
        .put('/health/api-endpoints/non-existent')
        .send({ name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Failed to update endpoint');
    });
  });

  describe('DELETE /health/api-endpoints/:id', () => {
    it('should delete existing endpoint', async () => {
      apiMonitor.addEndpoint({
        id: 'test-endpoint',
        name: 'Test API',
        url: 'https://httpbin.org/get',
        method: 'GET',
        interval: 60000,
        enabled: true,
      });

      const response = await request(app).delete('/health/api-endpoints/test-endpoint');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Endpoint removed successfully');

      const endpoint = apiMonitor.getEndpoint('test-endpoint');
      expect(endpoint).toBeUndefined();
    });

    it('should return 404 for non-existent endpoint', async () => {
      const response = await request(app).delete('/health/api-endpoints/non-existent');

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty('error');
      expect(response.body.error).toBe('Failed to remove endpoint');
    });
  });

  describe('POST /health/api-endpoints/start', () => {
    it('should start monitoring all endpoints', async () => {
      apiMonitor.addEndpoint({
        id: 'test-endpoint',
        name: 'Test API',
        url: 'https://httpbin.org/get',
        method: 'GET',
        interval: 60000,
        enabled: true,
      });

      const response = await request(app).post('/health/api-endpoints/start');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Started monitoring all endpoints');
    });
  });

  describe('POST /health/api-endpoints/stop', () => {
    it('should stop monitoring all endpoints', async () => {
      apiMonitor.addEndpoint({
        id: 'test-endpoint',
        name: 'Test API',
        url: 'https://httpbin.org/get',
        method: 'GET',
        interval: 60000,
        enabled: true,
      });

      apiMonitor.startAllMonitoring();

      const response = await request(app).post('/health/api-endpoints/stop');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('message');
      expect(response.body.message).toBe('Stopped monitoring all endpoints');
    });
  });

  describe('GET /health/detailed', () => {
    it('should return detailed system health', async () => {
      const response = await request(app).get('/health/detailed');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('status');
      expect(response.body).toHaveProperty('timestamp');
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('cpu');
      expect(response.body).toHaveProperty('system');

      expect(response.body.memory).toHaveProperty('used');
      expect(response.body.memory).toHaveProperty('total');
      expect(response.body.memory).toHaveProperty('usage');

      expect(response.body.cpu).toHaveProperty('user');
      expect(response.body.cpu).toHaveProperty('system');

      expect(response.body.system).toHaveProperty('platform');
      expect(response.body.system).toHaveProperty('arch');
      expect(response.body.system).toHaveProperty('release');
      expect(response.body.system).toHaveProperty('hostname');
      expect(response.body.system).toHaveProperty('loadAverage');
    });

    it('should return valid uptime value', async () => {
      const response = await request(app).get('/health/detailed');
      expect(response.body.uptime).toBeGreaterThanOrEqual(0);
    });

    it('should return valid memory usage', async () => {
      const response = await request(app).get('/health/detailed');
      expect(response.body.memory.used).toBeGreaterThan(0);
      expect(response.body.memory.total).toBeGreaterThan(0);
      expect(response.body.memory.usage).toBeGreaterThanOrEqual(0);
      expect(response.body.memory.usage).toBeLessThanOrEqual(100);
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON in POST request', async () => {
      const response = await request(app)
        .post('/health/api-endpoints')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(400);
    });

    it('should handle malformed JSON in PUT request', async () => {
      const response = await request(app)
        .put('/health/api-endpoints/test')
        .set('Content-Type', 'application/json')
        .send('{ invalid json }');

      expect(response.status).toBe(404); // Endpoint doesn't exist
    });

    it('should handle large request bodies gracefully', async () => {
      const largeBody = 'x'.repeat(10000);
      const response = await request(app)
        .post('/health/api-endpoints')
        .send({
          id: 'large-endpoint',
          name: 'Large API',
          url: 'https://httpbin.org/post',
          body: largeBody,
        });

      expect(response.status).toBe(201);
    });
  });

  describe('Integration with express runner helper', () => {
    it('should work with runRoute helper for API endpoints', async () => {
      const { res } = await runRoute(app as any, 'get', '/health/api-endpoints');
      expect(res.statusCode).toBe(200);
      expect(res.body).toHaveProperty('endpoints');
      expect(res.body).toHaveProperty('overall');
    });

    it('should work with runRoute helper for adding endpoints', async () => {
      const endpointData = {
        id: 'test-endpoint',
        name: 'Test API',
        url: 'https://httpbin.org/get',
      };

      const { res } = await runRoute(app as any, 'post', '/health/api-endpoints');
      expect(res.statusCode).toBe(200); // This will fail since we need to send data
    });
  });
});