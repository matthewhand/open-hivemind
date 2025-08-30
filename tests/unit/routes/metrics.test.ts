import request from 'supertest';
import express from 'express';
import metricsRouter from '@src/routes/metrics';
import { MetricsCollector } from '@src/monitoring/MetricsCollector';

// Mock MetricsCollector
jest.mock('@src/monitoring/MetricsCollector');
const mockMetricsCollector = MetricsCollector as jest.MockedClass<typeof MetricsCollector>;

const app = express();
app.use('/', metricsRouter);

describe('Metrics Routes', () => {
  let mockCollectorInstance: jest.Mocked<MetricsCollector>;

  beforeEach(() => {
    mockCollectorInstance = {
      getPrometheusFormat: jest.fn(),
      getMetrics: jest.fn(),
      incrementMessages: jest.fn(),
      recordResponseTime: jest.fn()
    } as any;
    
    mockMetricsCollector.getInstance.mockReturnValue(mockCollectorInstance);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /metrics', () => {
    it('should return Prometheus format metrics', async () => {
      const mockPrometheusData = `# HELP hivemind_messages_total Total messages processed
# TYPE hivemind_messages_total counter
hivemind_messages_total 42

# HELP hivemind_uptime_seconds Bot uptime in seconds
# TYPE hivemind_uptime_seconds gauge
hivemind_uptime_seconds 3600`;
      
      mockCollectorInstance.getPrometheusFormat.mockReturnValue(mockPrometheusData);

      const response = await request(app)
        .get('/metrics')
        .expect(200);
      
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toContain('hivemind_messages_total');
      expect(response.text).toContain('hivemind_uptime_seconds');
      expect(response.text).toContain('42');
      expect(response.text).toContain('3600');
      expect(mockCollectorInstance.getPrometheusFormat).toHaveBeenCalledTimes(1);
    });

    it('should handle empty metrics gracefully', async () => {
      mockCollectorInstance.getPrometheusFormat.mockReturnValue('');

      const response = await request(app)
        .get('/metrics')
        .expect(200);
      
      expect(response.headers['content-type']).toContain('text/plain');
      expect(response.text).toBe('');
    });

    it('should handle metrics collector errors by throwing', async () => {
      mockCollectorInstance.getPrometheusFormat.mockImplementation(() => {
        throw new Error('Metrics collection failed');
      });

      // The route doesn't handle errors, so it will throw and return 500
      await request(app)
        .get('/metrics')
        .expect(500);
    });

    it('should return correct content type header', async () => {
      mockCollectorInstance.getPrometheusFormat.mockReturnValue('test_metric 1');

      const response = await request(app)
        .get('/metrics')
        .expect(200);
      
      expect(response.headers['content-type']).toContain('text/plain');
    });

    it('should include standard Prometheus metric format', async () => {
      const mockData = `# HELP test_counter A test counter
# TYPE test_counter counter
test_counter{label="value"} 123`;
      mockCollectorInstance.getPrometheusFormat.mockReturnValue(mockData);

      const response = await request(app)
        .get('/metrics')
        .expect(200);
      
      expect(response.text).toContain('# HELP');
      expect(response.text).toContain('# TYPE');
      expect(response.text).toMatch(/\w+\{.*\} \d+/);
    });
  });

  describe('Error handling', () => {
    it('should return 404 for non-existent endpoints', async () => {
      await request(app)
        .get('/nonexistent')
        .expect(404);
    });

    it('should handle POST requests to metrics endpoint', async () => {
      await request(app)
        .post('/metrics')
        .expect(404);
    });

    it('should handle malformed requests gracefully', async () => {
      mockCollectorInstance.getPrometheusFormat.mockReturnValue('valid_metric 1');

      const response = await request(app)
        .get('/metrics')
        .set('Accept', 'application/json')
        .expect(200);
      
      // Should still return text/plain regardless of Accept header
      expect(response.headers['content-type']).toContain('text/plain');
    });
  });
});