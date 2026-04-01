import { Router } from 'express';
import llmProvidersRouter from './llmProviders';
import mcpServersRouter from './mcpServers';
import messengerProvidersRouter from './messengerProviders';
import systemInfoRouter from './systemInfo';

const router = Router();

// Mount all sub-routers at '/' so route paths are preserved
router.use('/', llmProvidersRouter);
router.use('/', messengerProvidersRouter);
router.use('/', mcpServersRouter);
router.use('/', systemInfoRouter);

export default router;
