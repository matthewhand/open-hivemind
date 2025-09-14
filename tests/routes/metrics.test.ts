import express from 'express';
import request from 'supertest';
import metricsRouter from '../../src/routes/metrics';
import { MetricsCollector } from '@src/monitoring/MetricsCollector';

// Mock MetricsCollector
jest.mock('@src/monitoring/MetricsCollector');

describe('Metrics Route', () => {
  let app: express.Application;

  beforeEach(() => {
    jest.clearAllMocks();
    app = express();
    app.use('/', metricsRouter);
  });

  describe('GET /metrics', () => {
    it('should return Prometheus format metrics', async () => {
      const mockPrometheusData = `# HELP hivemind_messages_total Total messages processed
# TYPE hivemind_messages_total counter
hivemind_messages_total 125

# HELP hivemind_response_time_seconds Response time in seconds
# TYPE hivemind_response_time_seconds histogram
hivemind_response_time_seconds_bucket{le="0.1"} 45
hivemind_response_time_seconds_bucket{le="0.5"} 89
hivemind_response_time_seconds_bucket{le="1.0"} 105
hivemind_response_time_seconds_bucket{le="+Inf"} 125
hivemind_response_time_seconds_sum 45.7
hivemind_response_time_seconds_count 125

# HELP hivemind_errors_total Total errors encountered
# TYPE hivemind_errors_total counter
hivemind_errors_total 3

# HELP hivemind_uptime_seconds Bot uptime in seconds
# TYPE hivemind_uptime_seconds gauge
hivemind_uptime_seconds 3600`;

      const mockInstance = {
        getPrometheusFormat: jest.fn().mockReturnValue(mockPrometheusData)
      };
      
      (MetricsCollector.getInstance as jest.Mock).mockReturnValue(mockInstance);

      const response = await request(app).get('/metrics');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toBe(mockPrometheusData);
    });

    it('should handle empty metrics', async () => {
      const mockInstance = {
        getPrometheusFormat: jest.fn().mockReturnValue('')
      };
      
      (MetricsCollector.getInstance as jest.Mock).mockReturnValue(mockInstance);

      const response = await request(app).get('/metrics');
      
      expect(response.status).toBe(200);
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toBe('');
    });

    it('should handle metrics collector errors', async () => {
      const mockInstance = {
        getPrometheusFormat: jest.fn(() => {
          throw new Error('Metrics collection failed');
        })
      };
      
      (MetricsCollector.getInstance as jest.Mock).mockReturnValue(mockInstance);

      const response = await request(app).get('/metrics');
      
      expect(response.status).toBe(500);
      // Should return HTML content for error pages
      expect(response.headers['content-type']).toContain('text/html');
    });

    it('should return 404 for non-existent endpoints', async () => {
      const mockInstance = {
        getPrometheusFormat: jest.fn()
      };
      
      (MetricsCollector.getInstance as jest.Mock).mockReturnValue(mockInstance);

      const response = await request(app).get('/metrics/non-existent');
      
      expect(response.status).toBe(404);
    });

    it('should handle POST requests to metrics endpoint', async () => {
      const mockInstance = {
        getPrometheusFormat: jest.fn()
      };
      
      (MetricsCollector.getInstance as jest.Mock).mockReturnValue(mockInstance);

      const response = await request(app).post('/metrics');
      
      expect(response.status).toBe(404);
    });

    it('should handle malformed requests gracefully', async () => {
      const mockInstance = {
        getPrometheusFormat: jest.fn()
      };
      
      (MetricsCollector.getInstance as jest.Mock).mockReturnValue(mockInstance);

      const response = await request(app).get('/metrics').set('Invalid-Header', 'value');
      
      // Should still work with additional headers
      expect(response.status).toBe(200);
    });
  });
});