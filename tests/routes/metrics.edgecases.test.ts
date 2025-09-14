import express from 'express';
import request from 'supertest';
import metricsRouter from '../../src/routes/metrics';
import { MetricsCollector } from '@src/monitoring/MetricsCollector';

// Mock MetricsCollector
jest.mock('@src/monitoring/MetricsCollector');

describe('Metrics Route Edge Cases', () => {
  let app: express.Application;
  let mockMetricsCollector: any;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use('/', metricsRouter);
    
    // Mock the MetricsCollector class
    mockMetricsCollector = MetricsCollector as jest.MockedClass<typeof MetricsCollector>;
  });

  describe('Metrics Collection Edge Cases', () => {
    it('should handle very large metrics output', async () => {
      const largeMetricsData = '# HELP hivemind_messages_total Total messages processed\n'.repeat(10000) +
                             '# TYPE hivemind_messages_total counter\n'.repeat(10000) +
                             'hivemind_messages_total 999999\n'.repeat(10000);
      
      const mockInstance = {
        getPrometheusFormat: jest.fn().mockReturnValue(largeMetricsData)
      };
      
      mockMetricsCollector.getInstance.mockReturnValue(mockInstance as any);

      const response = await request(app).get('/metrics');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('hivemind_messages_total');
      expect(response.text.length).toBeGreaterThan(100000);
    });

    it('should handle metrics with special characters', async () => {
      const specialMetricsData = `# HELP hivemind_custom_label Metrics with special labels
# TYPE hivemind_custom_label counter
hivemind_custom_label{label="value with spaces",other="special chars: @#$%^&*()"} 42
hivemind_unicode{label="测试"} 1
hivemind_emoji{label="🚀"} 1`;

      const mockInstance = {
        getPrometheusFormat: jest.fn().mockReturnValue(specialMetricsData)
      };
      
      mockMetricsCollector.getInstance.mockReturnValue(mockInstance as any);

      const response = await request(app).get('/metrics');
      
      expect(response.status).toBe(200);
      expect(response.text).toBe(specialMetricsData);
    });

    it('should handle concurrent requests', async () => {
      const mockData1 = 'hivemind_test_metric_1 1\n';
      const mockData2 = 'hivemind_test_metric_2 2\n';
      
      const mockInstance = {
        getPrometheusFormat: jest.fn()
          .mockReturnValueOnce(mockData1)
          .mockReturnValueOnce(mockData2)
      };
      
      mockMetricsCollector.getInstance.mockReturnValue(mockInstance as any);

      const requests = [
        request(app).get('/metrics'),
        request(app).get('/metrics')
      ];
      
      const responses = await Promise.all(requests);
      
      expect(responses[0].status).toBe(200);
      expect(responses[0].text).toBe(mockData1);
      expect(responses[1].status).toBe(200);
      expect(responses[1].text).toBe(mockData2);
    });

    it('should maintain performance with many requests', async () => {
      const mockData = 'hivemind_performance_test 1\n';
      const mockInstance = {
        getPrometheusFormat: jest.fn().mockReturnValue(mockData)
      };
      
      mockMetricsCollector.getInstance.mockReturnValue(mockInstance as any);

      const startTime = Date.now();
      const requests = Array(50).fill(null).map(() => request(app).get('/metrics'));
      const responses = await Promise.all(requests);
      const duration = Date.now() - startTime;
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.text).toBe(mockData);
      });
      
      // Should handle 50 requests in under 5 seconds
      expect(duration).toBeLessThan(5000);
    });

    it('should handle metrics collector returning null', async () => {
      const mockInstance = {
        getPrometheusFormat: jest.fn().mockReturnValue(null)
      };
      
      mockMetricsCollector.getInstance.mockReturnValue(mockInstance as any);

      const response = await request(app).get('/metrics');
      
      expect(response.status).toBe(200);
      expect(response.text).toBe('');
    });

    it('should handle metrics collector returning undefined', async () => {
      const mockInstance = {
        getPrometheusFormat: jest.fn().mockReturnValue(undefined)
      };
      
      mockMetricsCollector.getInstance.mockReturnValue(mockInstance as any);

      const response = await request(app).get('/metrics');
      
      expect(response.status).toBe(200);
      expect(response.text).toBe('');
    });

    it('should handle different HTTP methods', async () => {
      // Test POST method
      const postResponse = await request(app).post('/metrics');
      expect(postResponse.status).toBe(404);
      
      // Test PUT method
      const putResponse = await request(app).put('/metrics');
      expect(putResponse.status).toBe(404);
      
      // Test DELETE method
      const deleteResponse = await request(app).delete('/metrics');
      expect(deleteResponse.status).toBe(404);
      
      // Test PATCH method
      const patchResponse = await request(app).patch('/metrics');
      expect(patchResponse.status).toBe(404);
    });

    it('should handle requests with various headers', async () => {
      const mockData = 'hivemind_header_test 1\n';
      const mockInstance = {
        getPrometheusFormat: jest.fn().mockReturnValue(mockData)
      };
      
      mockMetricsCollector.getInstance.mockReturnValue(mockInstance as any);

      const response = await request(app)
        .get('/metrics')
        .set('Accept', 'text/plain')
        .set('User-Agent', 'TestClient/1.0')
        .set('X-Custom-Header', 'custom-value');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toBe(mockData);
    });

    it('should handle requests with query parameters', async () => {
      const mockData = 'hivemind_query_test 1\n';
      const mockInstance = {
        getPrometheusFormat: jest.fn().mockReturnValue(mockData)
      };
      
      mockMetricsCollector.getInstance.mockReturnValue(mockInstance as any);

      const response = await request(app)
        .get('/metrics')
        .query({ format: 'prometheus', refresh: 'true' });
      
      expect(response.status).toBe(200);
      expect(response.text).toBe(mockData);
    });

    it('should handle malformed requests gracefully', async () => {
      const mockData = 'hivemind_malformed_test 1\n';
      const mockInstance = {
        getPrometheusFormat: jest.fn().mockReturnValue(mockData)
      };
      
      mockMetricsCollector.getInstance.mockReturnValue(mockInstance as any);

      // Test with very large headers
      const response = await request(app)
        .get('/metrics')
        .set('X-Very-Large-Header', 'A'.repeat(10000));
      
      expect(response.status).toBe(200);
      expect(response.text).toBe(mockData);
    });
  });
});