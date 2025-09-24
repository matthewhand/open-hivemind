import { Router, Request, Response } from 'express';
import adminRouter from '@src/admin/adminRoutes';
import swarmRouter from '@src/admin/swarmRoutes';
import dashboardRouter from '@src/webui/routes/dashboard';
import configRouter from '@src/webui/routes/config';
import botsRouter from '@src/webui/routes/bots';
import botConfigRouter from '@src/webui/routes/botConfig';
import validationRouter from '@src/webui/routes/validation';
import hotReloadRouter from '@src/webui/routes/hotReload';
import ciRouter from '@src/webui/routes/ci';
import enterpriseRouter from '@src/webui/routes/enterprise';
import secureConfigRouter from '@src/webui/routes/secureConfig';
import authRouter from '@src/webui/routes/auth';
import adminApiRouter from '@src/webui/routes/admin';
import openapiRouter from '@src/webui/routes/openapi';
import { ipWhitelist } from '@src/webui/middleware/security';
import { authenticate } from '@src/auth/middleware';
import { auditMiddleware } from '@src/webui/middleware/audit';
import fs from 'fs';
import path from 'path';

const uberRouter = Router();

// Apply middleware
uberRouter.use(ipWhitelist);
uberRouter.use(authenticate);
uberRouter.use(auditMiddleware);

// Mount existing routers
uberRouter.use('/admin', adminRouter);
uberRouter.use('/swarm', swarmRouter);
uberRouter.use('/dashboard', dashboardRouter);
uberRouter.use('/config', configRouter);
uberRouter.use('/bots', botsRouter);
uberRouter.use('/botConfig', botConfigRouter);
uberRouter.use('/validation', validationRouter);
uberRouter.use('/hotReload', hotReloadRouter);
uberRouter.use('/ci', ciRouter);
uberRouter.use('/enterprise', enterpriseRouter);
uberRouter.use('/secureConfig', secureConfigRouter);
uberRouter.use('/auth', authRouter);
uberRouter.use('/adminApi', adminApiRouter);
uberRouter.use('/openapi', openapiRouter);

// POST /guards endpoint
uberRouter.post('/guards', (req: Request, res: Response) => {
    const { type, users, ips } = req.body;
    if (!type || !['owner', 'users', 'ip'].includes(type)) {
        return res.status(400).json({ error: 'Invalid type. Must be owner, users, or ip.' });
    }
    // For now, log the update. In real implementation, update config/personas or db.
    console.log(`[GUARDS] Updated guards: type=${type}, users=${users}, ips=${ips}`);
    // Example: Update a persona config (assuming a guards.json in personas)
    const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
    const guardsPath = path.join(configDir, 'personas', 'guards.json');
    try {
        const guardsData = { type, users: users || [], ips: ips || [] };
        fs.writeFileSync(guardsPath, JSON.stringify(guardsData, null, 2));
        res.json({ success: true, message: 'Guards updated successfully.' });
    } catch (error) {
        console.error('[GUARDS] Error updating guards:', error);
        res.status(500).json({ error: 'Failed to update guards.' });
    }
});

export default uberRouter;