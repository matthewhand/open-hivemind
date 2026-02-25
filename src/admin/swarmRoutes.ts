import { Router, type Request, type Response } from 'express';
import { ProviderRegistry } from '../registries/ProviderRegistry';
import { IToolInstaller } from '../types/IToolInstaller';

const swarmRouter = Router();

// Helper to get installer
function getInstaller(): IToolInstaller | undefined {
    const registry = ProviderRegistry.getInstance();
    // Assuming 'openswarm' is the ID for SwarmInstaller as registered in initProviders
    return registry.getInstaller('openswarm');
}

// Check system requirements
swarmRouter.get('/check', async (_req: Request, res: Response) => {
  try {
    const installer = getInstaller();
    if (!installer) return res.status(500).json({ ok: false, error: 'Swarm installer not found' });

    const pythonAvailable = await installer.checkPrerequisites();
    const swarmInstalled = await installer.checkInstalled();

    return res.json({
      ok: true,
      pythonAvailable,
      swarmInstalled,
      webUIUrl: installer.getWebUIUrl(),
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Install OpenSwarm
swarmRouter.post('/install', async (_req: Request, res: Response) => {
  try {
    const installer = getInstaller();
    if (!installer) return res.status(500).json({ ok: false, error: 'Swarm installer not found' });

    const result = await installer.install();
    return res.json({ ok: result.success, message: result.message });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Start OpenSwarm server
swarmRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const installer = getInstaller();
    if (!installer) return res.status(500).json({ ok: false, error: 'Swarm installer not found' });

    const rawPort = req.body.port;
    let port = 8000;

    if (rawPort !== undefined && rawPort !== null && rawPort !== '') {
      // Basic validation
      if (
        typeof rawPort !== 'number' &&
        (typeof rawPort !== 'string' || !/^\d+$/.test(String(rawPort).trim()))
      ) {
        return res.status(400).json({ ok: false, error: 'Invalid port format' });
      }

      port = parseInt(String(rawPort).trim(), 10);

      if (port < 1 || port > 65535) {
        return res.status(400).json({ ok: false, error: 'Port must be between 1 and 65535' });
      }
    }

    const result = await installer.start(port);
    return res.json({ ok: result.success, message: result.message });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

export default swarmRouter;
