import express from 'express';
import request from 'supertest';
import { ProviderMetricsCollector } from '@src/monitoring/ProviderMetricsCollector';
import metricsRouter from '@src/server/routes/health/metrics';

/**
 * Verifies provider-level metrics recorded via ProviderMetricsCollector are
 * surfaced on the Prometheus endpoint exposed by the health metrics router.
 */
describe('GET /metrics/prometheus provider metrics wiring', () => {
  const app = express();
  app.use('/metrics', metricsRouter);

  beforeEach(() => {
    ProviderMetricsCollector.getInstance().resetAllMetrics();
  });

  it('includes provider message and LLM metrics in the Prometheus output', async () => {
    const collector = ProviderMetricsCollector.getInstance();
    collector.recordMessageReceived('discord');
    collector.recordMessageSent('discord', 50);
    collector.recordLlmRequest('openai', 200, { prompt: 7, total: 7 }, undefined, true);

    const res = await request(app).get('/metrics/prometheus');

    expect(res.status).toBe(200);
    expect(res.text).toContain('process_uptime_seconds');
    expect(res.text).toMatch(/hivemind_messages_received_total\{provider="discord"\} 1/);
    expect(res.text).toMatch(/hivemind_messages_sent_total\{provider="discord"\} 1/);
    expect(res.text).toMatch(/hivemind_llm_requests_total\{provider="openai",status="success"\} 1/);
  });
});
