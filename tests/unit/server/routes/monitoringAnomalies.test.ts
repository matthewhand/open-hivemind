/**
 * Tests for GET /api/monitoring/anomalies, which exposes the results of
 * IntegrationAnomalyDetector (wired into the server bootstrap in initServices).
 *
 * The detector is a singleton, so we drive it directly via its public API
 * (addAnomaly is private, but checkThreshold-driven detection populates it via
 * runDetection). Here we exercise the route contract and verify it reflects
 * whatever anomalies the detector has recorded.
 */

import express from 'express';
import request from 'supertest';
import { IntegrationAnomalyDetector } from '../../../../src/monitoring/IntegrationAnomalyDetector';
import { ProviderMetricsCollector } from '../../../../src/monitoring/ProviderMetricsCollector';
import monitoringRouter from '../../../../src/server/routes/monitoring';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/monitoring', monitoringRouter);
  return app;
}

describe('GET /api/monitoring/anomalies', () => {
  const app = buildApp();

  beforeEach(() => {
    IntegrationAnomalyDetector.getInstance().clearAnomalies();
  });

  it('returns an empty anomaly set when nothing has been detected', async () => {
    const res = await request(app).get('/api/monitoring/anomalies').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data).toEqual(
      expect.objectContaining({
        summary: expect.objectContaining({
          total: 0,
          bySeverity: expect.any(Object),
        }),
        anomalies: [],
      })
    );
  });

  it('reflects anomalies recorded by the detector after runDetection', async () => {
    const detector = IntegrationAnomalyDetector.getInstance();
    const metrics = ProviderMetricsCollector.getInstance();

    // Seed Slack metrics that breach the critical response-time threshold
    // (criticalThreshold for response_time_spike is 5000ms).
    metrics.recordMessageSent('slack', 9000);

    detector.runDetection();

    const res = await request(app).get('/api/monitoring/anomalies').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.summary.total).toBeGreaterThan(0);
    expect(Array.isArray(res.body.data.anomalies)).toBe(true);
    const slackAnomaly = res.body.data.anomalies.find(
      (a: { integration: string }) => a.integration === 'slack'
    );
    expect(slackAnomaly).toBeDefined();
    expect(slackAnomaly.severity).toBe('critical');
  });

  it('supports filtering by integration via query param', async () => {
    const detector = IntegrationAnomalyDetector.getInstance();
    const metrics = ProviderMetricsCollector.getInstance();

    metrics.recordMessageSent('discord', 9000);
    detector.runDetection();

    const res = await request(app)
      .get('/api/monitoring/anomalies')
      .query({ integration: 'nonexistent-integration' })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.anomalies).toEqual([]);
  });
});
