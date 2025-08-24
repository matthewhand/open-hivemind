import { Router } from 'express';
import { MetricsCollector } from '@src/monitoring/MetricsCollector';

const router = Router();

router.get('/metrics', (req, res) => {
  const collector = MetricsCollector.getInstance();
  res.set('Content-Type', 'text/plain');
  res.send(collector.getPrometheusFormat());
});

export default router;