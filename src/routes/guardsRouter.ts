import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';

const guardsRouter = Router();

guardsRouter.post('/', (req: Request, res: Response) => {
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

export default guardsRouter;
