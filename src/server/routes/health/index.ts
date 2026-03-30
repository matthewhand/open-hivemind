import { Router } from 'express';
import basicRouter from './basic';
import detailedRouter from './detailed';
import metricsRouter from './metrics';
import diagnosticsRouter from './diagnostics';

const router = Router();

// Mount sub-routers
router.use('/', basicRouter);
router.use('/', detailedRouter);
router.use('/', metricsRouter);
router.use('/', diagnosticsRouter);

export default router;
