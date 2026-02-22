import { Router, type Request, type Response } from 'express';
import { SwarmInstaller } from '@src/integrations/openswarm/SwarmInstaller';

export const installer = new SwarmInstaller();
const swarmRouter = Router();

// Check system requirements
swarmRouter.get('/check', async (_req: Request, res: Response) => {
  try {
    const pythonAvailable = await installer.checkPython();
    const swarmInstalled = await installer.checkSwarmInstalled();

    res.json({
      ok: true,
      pythonAvailable,
      swarmInstalled,
      webUIUrl: installer.getSwarmWebUIUrl(),
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Install OpenSwarm
swarmRouter.post('/install', async (_req: Request, res: Response) => {
  try {
    const result = await installer.installSwarm();
    res.json({ ok: result.success, message: result.message });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Start OpenSwarm server
swarmRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const rawPort = req.body.port;
    let port = 8000;

    if (rawPort !== undefined && rawPort !== null && rawPort !== '') {
      // Basic validation: must be a number or a string that looks like a number
      if (
        typeof rawPort !== 'number' &&
        (typeof rawPort !== 'string' || !/^\d+$/.test(String(rawPort).trim()))
      ) {
        return res.status(400).json({ ok: false, error: 'Invalid port format' });
      }

      port = parseInt(String(rawPort).trim(), 10);

      if (port < 1 || port > 65535) {
        res.status(400).json({ ok: false, error: 'Port must be between 1 and 65535' });
        return;
      }
    }

    const result = await installer.startSwarm(port);
    res.json({ ok: result.success, message: result.message });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default swarmRouter;
