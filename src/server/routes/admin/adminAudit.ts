import Debug from 'debug';
import { Router } from 'express';
import activityRouter from '../activity';

const router = Router();
const debug = Debug('app:webui:admin:audit');

router.use('/activity', activityRouter);

export default router;
