import { Router, type Request, type Response } from 'express';
import { ProviderRegistry } from '../registries/ProviderRegistry';

const swarmRouter = Router();

// Check system requirements
swarmRouter.get('/check', async (_req: Request, res: Response) => {
  try {
    const registry = ProviderRegistry.getInstance();
    const installer = registry.getInstaller('swarm');

    if (!installer) {
      return res.status(404).json({ ok: false, error: 'Swarm installer not found' });
    }

    const prerequisites = await installer.checkPrerequisites();
    const installed = await installer.checkInstalled();
    const webUIUrl = installer.getWebUIUrl ? installer.getWebUIUrl() : '';

    // Handle checkPrerequisites returning object or boolean
    // My SwarmInstallerProvider implementation returns { success, message } on failure, or true on success.
    // Wait, let's check SwarmInstallerProvider.ts again.
    /*
      async checkPrerequisites(): Promise<boolean | { success: boolean; message: string }> {
        const python = await this.installer.checkPython();
        if (!python) {
          return { success: false, message: 'Python not found' };
        }
        return true;
      }
    */
    // If it returns true, success is true. If object, success is in it.
    const pythonAvailable =
      prerequisites === true ? true : (prerequisites as any).success || false;

    return res.json({
      ok: true,
      pythonAvailable,
      swarmInstalled: installed,
      webUIUrl,
    });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

// Install OpenSwarm
swarmRouter.post('/install', async (_req: Request, res: Response) => {
  try {
    const registry = ProviderRegistry.getInstance();
    const installer = registry.getInstaller('swarm');
    if (!installer) {
      return res.status(404).json({ ok: false, error: 'Swarm installer not found' });
    }

    const result = await installer.install();
    return res.json({ ok: result.success, message: result.message });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
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
        return res.status(400).json({ ok: false, error: 'Port must be between 1 and 65535' });
      }
    }

    const registry = ProviderRegistry.getInstance();
    const installer = registry.getInstaller('swarm');
    if (!installer) {
      return res.status(404).json({ ok: false, error: 'Swarm installer not found' });
    }

    const result = await installer.start({ port });
    return res.json({ ok: result.success, message: result.message });
  } catch (error: any) {
    return res.status(500).json({ ok: false, error: error.message });
  }
});

export default swarmRouter;
