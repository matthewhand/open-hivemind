import express from 'express';
import request from 'supertest';
import metricsRouter from '../../src/routes/metrics';
import { MetricsCollector } from '@src/monitoring/MetricsCollector';

// Mock MetricsCollector
jest.mock('@src/monitoring/MetricsCollector');

describe('Metrics Route Additional Tests', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use('/', metricsRouter);
  });

  describe('GET /metrics additional tests', () => {
    it('should return metrics with different content types', async () => {
      const mockInstance = {
        getPrometheusFormat: jest.fn().mockReturnValue('# HELP test_metric Test metric\n# TYPE test_metric counter\ntest_metric 1')
      };
      
      (MetricsCollector.getInstance as jest.Mock).mockReturnValue(mockInstance);

      const response = await request(app).get('/metrics');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
    });

    it('should handle concurrent requests', async () => {
      const mockInstance = {
        getPrometheusFormat: jest.fn().mockReturnValue('# HELP concurrent_test Concurrent test\n# TYPE concurrent_test gauge\nconcurrent_test 42')
      };
      
      (MetricsCollector.getInstance as jest.Mock).mockReturnValue(mockInstance);

      const requests = Array(5).fill(null).map(() => request(app).get('/metrics'));
      const responses = await Promise.all(requests);
      
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.text).toContain('concurrent_test 42');
      });
    });

    it('should handle large metrics output', async () => {
      const largeMetrics = '# HELP large_metric Large metric\n# TYPE large_metric counter\nlarge_metric 1000000\n'.repeat(1000);
      const mockInstance = {
        getPrometheusFormat: jest.fn().mockReturnValue(largeMetrics)
      };
      
      (MetricsCollector.getInstance as jest.Mock).mockReturnValue(mockInstance);

      const response = await request(app).get('/metrics');
      
      expect(response.status).toBe(200);
      expect(response.text.length).toBeGreaterThan(10000);
    });

    it('should handle special characters in metrics', async () => {
      const specialMetrics = '# HELP special_chars Metric with special chars\n# TYPE special_chars counter\nspecial_chars{label="test with spaces & symbols @#$%"} 1';
      const mockInstance = {
        getPrometheusFormat: jest.fn().mockReturnValue(specialMetrics)
      };
      
      (MetricsCollector.getInstance as jest.Mock).mockReturnValue(mockInstance);

      const response = await request(app).get('/metrics');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('test with spaces & symbols @#$%');
    });

    it('should handle unicode characters in metrics', async () => {
      const unicodeMetrics = '# HELP unicode_metric Unicode test\n# TYPE unicode_metric counter\nunicode_metric{label="测试"} 1\nunicode_metric{label="🚀"} 2';
      const mockInstance = {
        getPrometheusFormat: jest.fn().mockReturnValue(unicodeMetrics)
      };
      
      (MetricsCollector.getInstance as jest.Mock).mockReturnValue(mockInstance);

      const response = await request(app).get('/metrics');
      
      expect(response.status).toBe(200);
      expect(response.text).toContain('测试');
      expect(response.text).toContain('🚀');
    });

    it('should handle empty response from metrics collector', async () => {
      const mockInstance = {
        getPrometheusFormat: jest.fn().mockReturnValue('')
      };
      
      (MetricsCollector.getInstance as jest.Mock).mockReturnValue(mockInstance);

      const response = await request(app).get('/metrics');
      
      expect(response.status).toBe(200);
      expect(response.text).toBe('');
    });

    it('should handle null response from metrics collector', async () => {
      const mockInstance = {
        getPrometheusFormat: jest.fn().mockReturnValue(null)
      };
      
      (MetricsCollector.getInstance as jest.Mock).mockReturnValue(mockInstance);

      const response = await request(app).get('/metrics');
      
      expect(response.status).toBe(200);
      expect(response.text).toBe('');
    });
  });
});