import { Router, Request, Response } from 'express';
import { SwarmInstaller } from '@src/integrations/openswarm/SwarmInstaller';

export const installer = new SwarmInstaller();
const swarmRouter = Router();

interface StartBody {
  port?: number;
}

// Check system requirements
swarmRouter.get('/check', (_req: Request, res: Response) => {
  (async () => {
    try {
      const pythonAvailable = await installer.checkPython();
      const swarmInstalled = await installer.checkSwarmInstalled();
      
      res.json({
        ok: true,
        pythonAvailable,
        swarmInstalled,
        webUIUrl: installer.getSwarmWebUIUrl()
      });
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ ok: false, error: errorMsg });
    }
  })().catch((err) => {
    const errorMsg = err instanceof Error ? err.message : 'Internal error';
    res.status(500).json({ ok: false, error: errorMsg });
  });
});

// Install OpenSwarm
swarmRouter.post('/install', (_req: Request, res: Response) => {
  (async () => {
    try {
      const result = await installer.installSwarm();
      res.json({ ok: result.success, message: result.message });
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ ok: false, error: errorMsg });
    }
  })().catch((err) => {
    const errorMsg = err instanceof Error ? err.message : 'Internal error';
    res.status(500).json({ ok: false, error: errorMsg });
  });
});

// Start OpenSwarm server
swarmRouter.post('/start', (req: Request, res: Response) => {
  (async () => {
    try {
      const { port }: StartBody = req.body || {};
      const result = await installer.startSwarm(port ?? 8000);
      res.json({ ok: result.success, message: result.message });
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      res.status(500).json({ ok: false, error: errorMsg });
    }
  })().catch((err) => {
    const errorMsg = err instanceof Error ? err.message : 'Internal error';
    res.status(500).json({ ok: false, error: errorMsg });
  });
});

export default swarmRouter;