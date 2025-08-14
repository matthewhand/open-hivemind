import { Router } from 'express';
import { getMetrics } from '@src/utils/metrics';

const router = Router();

router.get('/metrics', (req, res) => {
  // Dev-only: disable unless explicitly enabled
  if (process.env.METRICS_ROUTE_ENABLED !== 'true') {
    return res.status(404).send('Not Found');
  }
  res.status(200).json(getMetrics());
});

export default router;
