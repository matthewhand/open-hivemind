import { Router, type Request, type Response } from 'express';
import { ProviderRegistry } from '@src/registries/ProviderRegistry';
import type { IToolInstaller } from '@hivemind/shared-types';

const swarmRouter = Router();

function getInstaller(): IToolInstaller {
    const registry = ProviderRegistry.getInstance();
    const entry = registry.get('openswarm');
    if (!entry || !entry.instance) {
        throw new Error('OpenSwarm installer not available');
    }
    return entry.instance as unknown as IToolInstaller;
}

// Check system requirements
swarmRouter.get('/check', async (_req: Request, res: Response) => {
  try {
    const installer = getInstaller();
    const pythonAvailable = await installer.checkPrerequisites();
    const swarmInstalled = await installer.isInstalled();

    res.json({
      ok: true,
      pythonAvailable,
      swarmInstalled,
      webUIUrl: installer.getWebUIUrl(),
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Install OpenSwarm
swarmRouter.post('/install', async (_req: Request, res: Response) => {
  try {
    const installer = getInstaller();
    const result = await installer.install();
    res.json({ ok: result.success, message: result.message });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Start OpenSwarm server
swarmRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const installer = getInstaller();
    const rawPort = req.body.port;
    let port = 8000;

    if (rawPort !== undefined && rawPort !== null && rawPort !== '') {
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
