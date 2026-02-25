import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { ProviderRegistry } from '../registry/ProviderRegistry';
import type { IBotInfo } from '@src/types/botInfo';
import { authenticate, requireAdmin } from '../auth/middleware';
import { auditMiddleware, logAdminAction, type AuditedRequest } from '../server/middleware/audit';
import { ipWhitelist } from '../server/middleware/security';

const debug = Debug('app:admin');
export const adminRouter = Router();

// Apply IP whitelist middleware first (blocks unauthorized IPs)
adminRouter.use(ipWhitelist);

// Apply authentication middleware (requires valid JWT token)
adminRouter.use(authenticate);

// Apply audit middleware to all admin routes
adminRouter.use(auditMiddleware);

async function loadPersonas(): Promise<{ key: string; name: string; systemPrompt: string }[]> {
  const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
  const personasDir = path.join(configDir, 'personas');
  const fallback = [
    {
      key: 'friendly-helper',
      name: 'Friendly Helper',
      systemPrompt: 'You are a friendly, concise assistant.',
    },
    {
      key: 'dev-assistant',
      name: 'Dev Assistant',
      systemPrompt: 'You are a senior engineer. Answer with pragmatic code examples.',
    },
    {
      key: 'teacher',
      name: 'Teacher',
      systemPrompt: 'Explain concepts clearly with analogies and steps.',
    },
  ];
  try {
    try {
      await fs.promises.access(personasDir);
    } catch {
      return fallback;
    }

    const files = await fs.promises.readdir(personasDir);
    const validFiles = files.filter((file) => file.endsWith('.json'));

    const promises = validFiles.map(async (file) => {
      try {
        const content = await fs.promises.readFile(path.join(personasDir, file), 'utf8');
        const data = JSON.parse(content);
        if (data && data.key && data.name && typeof data.systemPrompt === 'string') {
          return data;
        }
      } catch (e) {
        debug('Invalid persona file:', file, e);
      }
      return null;
    });

    const results = await Promise.all(promises);
    const out: any[] = results.filter((item) => item !== null);

    return out.length ? out : fallback;
  } catch (e) {
    debug('Failed loading personas', e);
    return fallback;
  }
}

adminRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const registry = ProviderRegistry.getInstance();
    const providers = registry.getMessageProviders();
    const statuses = await Promise.all(providers.map((p) => p.getStatus()));

    // Aggregate bots for unified view
    // Each status is { ok: true, bots: [], count: ... }
    const allBots = statuses.flatMap((s: any) => s.bots || []);

    // Backward compatibility fields if needed, or just return unified structure
    res.json({
      ok: true,
      bots: allBots,
      providers: statuses
    });
  } catch (e) {
    res.json({ ok: false, error: String(e), bots: [] });
  }
});

adminRouter.get('/personas', async (_req: Request, res: Response) => {
  res.json({ ok: true, personas: await loadPersonas() });
});

adminRouter.get('/providers/llm', (_req: Request, res: Response) => {
  const registry = ProviderRegistry.getInstance();
  const providers = registry.getLLMProviders().map((p) => p.getMetadata());
  res.json({ ok: true, providers });
});

adminRouter.get('/providers/messenger', (_req: Request, res: Response) => {
  const registry = ProviderRegistry.getInstance();
  const providers = registry.getMessageProviders().map((p) => p.getMetadata());
  res.json({ ok: true, providers });
});

// Generic bot creation
adminRouter.post(
  '/providers/:providerId/bots',
  requireAdmin,
  async (req: AuditedRequest, res: Response) => {
    const { providerId } = req.params;
    const registry = ProviderRegistry.getInstance();
    const provider = registry.getProvider(providerId);

    if (!provider || provider.type !== 'message') {
      return res
        .status(404)
        .json({ ok: false, error: 'Provider not found or not a message provider' });
    }

    try {
      const config = req.body;
      const { name } = config;

      if (!name) {
        return res.status(400).json({ ok: false, error: 'Bot name is required' });
      }

      // Persist config
      const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
      // Use convention providers/${providerId}.json
      const providerConfigPath = path.join(configDir, 'providers', `${providerId}.json`);

      // Ensure directory exists
      await fs.promises.mkdir(path.dirname(providerConfigPath), { recursive: true });

      // Read existing
      let cfg: any = {};
      try {
        const content = await fs.promises.readFile(providerConfigPath, 'utf8');
        cfg = JSON.parse(content);
      } catch {
        // Start fresh
      }

      // Ensure structure matches convict expectation (key at root)
      cfg[providerId] = cfg[providerId] || {};
      cfg[providerId].instances = cfg[providerId].instances || [];
      cfg[providerId].instances.push(config);

      await fs.promises.writeFile(providerConfigPath, JSON.stringify(cfg, null, 2), 'utf8');

      // Add runtime
      await (provider as any).addBot(config);

      logAdminAction(
        req,
        'CREATE_BOT',
        `${providerId}-bots/${name}`,
        'success',
        `Created bot ${name}`
      );
      return res.json({ ok: true });
    } catch (e: any) {
      logAdminAction(req, 'CREATE_BOT', `${providerId}-bots`, 'failure', String(e));
      return res.status(500).json({ ok: false, error: String(e) });
    }
  }
);

export default adminRouter;


// Reload bots
adminRouter.post('/reload', requireAdmin, async (req: AuditedRequest, res: Response) => {
  try {
    const registry = ProviderRegistry.getInstance();
    const providers = registry.getMessageProviders();

    const results = await Promise.all(providers.map(async (p) => {
      try {
        if (p.refresh) {
          const result = await p.refresh();
          return { provider: p.id, success: true, result };
        }
        return { provider: p.id, skipped: true };
      } catch (e) {
        return { provider: p.id, success: false, error: String(e) };
      }
    }));

    logAdminAction(
      req,
      'RELOAD_BOTS',
      'bots/reload',
      'success',
      'Reloaded providers via registry'
    );
    return res.json({ ok: true, results });
  } catch (e: any) {
    logAdminAction(
      req,
      'RELOAD_BOTS',
      'bots/reload',
      'failure',
      `Failed to reload bots: ${e?.message || String(e)}`
    );
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});
