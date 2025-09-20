import { Router } from 'express';
import { MetricsCollector } from '@src/monitoring/MetricsCollector';

const router = Router();

router.get('/metrics', (req, res) => {
  const collector = MetricsCollector.getInstance();
  res.set('Content-Type', 'text/plain');
  res.send(collector.getPrometheusFormat());
});

router.get('/metrics/json', (req, res) => {
  const collector = MetricsCollector.getInstance();
  res.json(collector.getMetrics());
});

export default router;