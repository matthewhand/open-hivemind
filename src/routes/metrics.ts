import { Router } from 'express';
import { getMetrics } from '@src/utils/metrics';
import appConfig from '@config/appConfig';

const router = Router();

router.get('/metrics', (req, res) => {
  // Dev-only: disable unless explicitly enabled
  if (!appConfig.get('METRICS_ROUTE_ENABLED')) {
    return res.status(404).send('Not Found');
  }
  res.status(200).json(getMetrics());
});

export default router;
