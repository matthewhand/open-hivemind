import { Router, Request, Response } from 'express';
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
      webUIUrl: installer.getSwarmWebUIUrl()
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
    const port = req.body.port || 8000;
    const result = await installer.startSwarm(port);
    res.json({ ok: result.success, message: result.message });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

export default swarmRouter;