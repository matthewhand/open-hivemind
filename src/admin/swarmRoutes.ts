import { Router, type Request, type Response } from 'express';
import { providerRegistry } from '../registries/ProviderRegistry';
import type { IToolInstaller } from '../types/IToolInstaller';

const swarmRouter = Router();

const getInstaller = (): IToolInstaller => {
  const installer = providerRegistry.getInstaller('openswarm');
  if (!installer) {
    throw new Error('OpenSwarm installer not registered');
  }
  return installer;
};

// Check system requirements
swarmRouter.get('/check', async (_req: Request, res: Response) => {
  try {
    const installer = getInstaller();
    const pythonAvailable = await installer.checkPrerequisites();
    const swarmInstalled = await installer.checkInstalled();

    res.json({
      success: true,
      pythonAvailable,
      swarmInstalled,
      webUIUrl: installer.getWebUIUrl ? installer.getWebUIUrl() : '',
    });
  } catch (error: unknown) {
    res
      .status(500)
      .json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

// Install OpenSwarm
swarmRouter.post('/install', async (_req: Request, res: Response) => {
  try {
    const installer = getInstaller();
    const result = await installer.install();
    res.json({ success: result.success, message: result.message });
  } catch (error: unknown) {
    res
      .status(500)
      .json({ success: false, error: error instanceof Error ? error.message : String(error) });
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
        return res.status(400).json({ success: false, error: 'Invalid port format' });
      }

      port = parseInt(String(rawPort).trim(), 10);

      if (port < 1 || port > 65535) {
        return res.status(400).json({ success: false, error: 'Port must be between 1 and 65535' });
      }
    }

    const installer = getInstaller();
    const result = await installer.start({ port });
    return res.json({ success: result.success, message: result.message });
  } catch (error: unknown) {
    return res
      .status(500)
      .json({ success: false, error: error instanceof Error ? error.message : String(error) });
  }
});

export default swarmRouter;
