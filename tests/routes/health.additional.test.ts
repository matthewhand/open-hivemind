import express from 'express';
import request from 'supertest';
import healthRouter from '../../src/routes/health';

describe('Health Route Additional Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.disable('x-powered-by');
    app.set('case sensitive routing', true);
    app.set('strict routing', true);
    app.use('/', healthRouter);
  });

  describe('GET /health additional tests', () => {
    it('should respond with text/html content type', async () => {
      const response = await request(app).get('/health');
      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');
      expect(response.headers['content-type']).toContain('text/html');
    });

    it('should handle requests with custom headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('X-Custom-Header', 'test-value')
        .set('Authorization', 'Bearer test-token');
      
      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');
    });

    it('should handle requests with query parameters', async () => {
      const response = await request(app)
        .get('/health')
        .query({ test: 'value', another: 'param' });
      
      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');
    });

    it('should handle requests with different Accept headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('Accept', 'text/plain');
      
      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');
    });

    it('should handle requests with different content types', async () => {
      const response = await request(app)
        .get('/health')
        .set('Content-Type', 'application/json');
      
      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');
    });

    it('should handle very fast successive requests', async () => {
      const requests = Array(20).fill(null).map(() => request(app).get('/health'));
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.text).toBe('OK');
      });
    });

    it('should maintain consistent response across multiple calls', async () => {
      for (let i = 0; i < 10; i++) {
        const response = await request(app).get('/health');
        expect(response.status).toBe(200);
        expect(response.text).toBe('OK');
        expect(response.headers['content-type']).toMatch(/text/);
      }
    });

    it('should handle requests with very large headers', async () => {
      const response = await request(app)
        .get('/health')
        .set('X-Large-Header', 'A'.repeat(5000));
      
      expect(response.status).toBe(200);
      expect(response.text).toBe('OK');
    });
  });
});