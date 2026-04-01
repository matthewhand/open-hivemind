import { Router } from 'express';
import basicRouter from './basic';
import detailedRouter from './detailed';
import diagnosticsRouter from './diagnostics';
import metricsRouter from './metrics';

const router = Router();

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
