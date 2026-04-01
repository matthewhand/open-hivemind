import { Router } from 'express';
import { createCoreRoutes } from './core';
import { createRealtimeRoutes } from './realtime';
import { createRuleRoutes } from './rules';
import { createSchemaRoutes } from './schemas';

const router = Router();

router.use(createCoreRoutes());
router.use(createSchemaRoutes());
router.use(createRuleRoutes());
router.use(createRealtimeRoutes());

export default router;
