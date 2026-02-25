import { Router, type Request, type Response } from 'express';
import { ProviderRegistry } from '../registries/ProviderRegistry';
import { IToolInstaller } from '@hivemind/shared-types';

const swarmRouter = Router();

// Helper to get installer
function getSwarmInstaller(): IToolInstaller | undefined {
  const registry = ProviderRegistry.getInstance();
  const provider = registry.get('openswarm');
  if (provider && provider.getMetadata().type === 'tool') {
    return provider as unknown as IToolInstaller;
  }
  return undefined;
}

// Check system requirements
swarmRouter.get('/check', async (_req: Request, res: Response) => {
  try {
    const installer = getSwarmInstaller();
    if (!installer) {
      return res.status(404).json({ ok: false, error: 'OpenSwarm provider not found' });
    }

    const preq = await installer.checkPrerequisites();
    const installed = await installer.checkInstalled();
    const webUIUrl = installer.getWebUIUrl ? installer.getWebUIUrl() : '';

    res.json({
      ok: true,
      pythonAvailable: preq.success,
      swarmInstalled: installed,
      webUIUrl: webUIUrl,
    });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Install OpenSwarm
swarmRouter.post('/install', async (_req: Request, res: Response) => {
  try {
    const installer = getSwarmInstaller();
    if (!installer) {
      return res.status(404).json({ ok: false, error: 'OpenSwarm provider not found' });
    }

    const result = await installer.install();
    res.json({ ok: result.success, message: result.message });
  } catch (error: any) {
    res.status(500).json({ ok: false, error: error.message });
  }
});

// Start OpenSwarm server
swarmRouter.post('/start', async (req: Request, res: Response) => {
  try {
    const installer = getSwarmInstaller();
    if (!installer) {
      return res.status(404).json({ ok: false, error: 'OpenSwarm provider not found' });
    }

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
        return res.status(400).json({ ok: false, error: 'Port must be between 1 and 65535' });
      }
    }

    if (installer.start) {
      const result = await installer.start(port);
      return res.json({ ok: result.success, message: result.message });
    } else {
      return res.status(400).json({ ok: false, error: 'Start not supported by this installer' });
    }
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

export default swarmRouter;
