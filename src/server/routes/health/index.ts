import { Router } from 'express';
import basicRouter from './basic';
import detailedRouter from './detailed';
import diagnosticsRouter from './diagnostics';
import metricsRouter from './metrics';

const router = Router();

// Mount sub-routers
router.use('/', basicRouter);
router.use('/', detailedRouter);
router.use('/', metricsRouter);
router.use('/', diagnosticsRouter);

export default router;
