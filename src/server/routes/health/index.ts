import { Router } from 'express';
import basicRouter from './basic';
import detailedRouter from './detailed';
import diagnosticsRouter from './diagnostics';
import metricsRouter from './metrics';
import { requestCounterMiddleware } from './runtimeMetrics';

const router = Router();

// Count every request flowing through the health router so the JSON metrics
// endpoint can report a real request total and rate.
router.use(requestCounterMiddleware);

// Basic health routes (/health/, /health/ready, /health/live)
router.use('/', basicRouter);

// Detailed health and API endpoint monitoring routes
router.use('/', detailedRouter);

// System metrics and Prometheus routes
router.use('/metrics', metricsRouter);

// Diagnostic, alerts, errors, and recovery routes
router.use('/', diagnosticsRouter);

export { prometheusMetricsHandler } from './metrics';
export default router;
