/**
 * Tests for GET /api/monitoring/kpis/:id, specifically the `deferred` flag that
 * tells clients whether a KPI's value is real pipeline-derived data or a
 * not-yet-fed placeholder (cost / multi-day retention metrics that read back as
 * 0). The id list is the single source of truth in DEFERRED_KPI_IDS.
 */

import express from 'express';
import request from 'supertest';
import { DEFERRED_KPI_IDS } from '../../../../src/observability/BusinessKpiRecorder';
import monitoringRouter from '../../../../src/server/routes/monitoring';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/monitoring', monitoringRouter);
  return app;
}

describe('GET /api/monitoring/kpis/:id deferred flag', () => {
  const app = buildApp();

  it('marks a deferred (placeholder) KPI with deferred: true', async () => {
    const deferredId = DEFERRED_KPI_IDS[0]; // e.g. user_engagement_rate
    const res = await request(app).get(`/api/monitoring/kpis/${deferredId}`).expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.kpi.id).toBe(deferredId);
    expect(res.body.data.deferred).toBe(true);
  });

  it('marks a live pipeline-fed KPI with deferred: false', async () => {
    // total_interactions is fed from real message:incoming events.
    const res = await request(app).get('/api/monitoring/kpis/total_interactions').expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.data.kpi.id).toBe('total_interactions');
    expect(res.body.data.deferred).toBe(false);
  });

  it('returns 404 for an unknown KPI id', async () => {
    const res = await request(app).get('/api/monitoring/kpis/not-a-real-kpi').expect(404);
    expect(res.body.success).toBe(false);
  });
});
