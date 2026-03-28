import Debug from 'debug';
import { Router } from 'express';

const router = Router();
const debug = Debug('app:webui:admin:bulk');

// Any specific bulk operations would go here.
// Currently, there are no explicit bulk operations in admin.ts
// but we provide this file as per architectural separation.

export default router;
