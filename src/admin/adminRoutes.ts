import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { providerRegistry } from '../registries/ProviderRegistry';
import { IMessageProvider } from '../types/IProvider';
import { authenticate, requireAdmin } from '../auth/middleware';
import { auditMiddleware, logAdminAction, type AuditedRequest } from '../server/middleware/audit';
import { ipWhitelist } from '../server/middleware/security';
import { serializeSchema } from '../utils/schemaSerializer';

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
    const providers = providerRegistry.getMessageProviders();
    const result: any = { ok: true };

    // Backward compatibility for UI
    let slackBots: any[] = [];
    let discordBots: any[] = [];
    let slackInfo: any[] = [];
    let discordInfo: any[] = [];

    for (const provider of providers) {
      try {
        const status = await provider.getStatus();
        if (provider.id === 'slack') {
          slackInfo = status.bots || [];
          slackBots = slackInfo.map((b: any) => b.name);
        } else if (provider.id === 'discord') {
          discordInfo = status.bots || [];
          discordBots = discordInfo.map((b: any) => b.name || 'discord');
        }
        // Add generic key for all providers
        result[provider.id] = status;
      } catch (e) {
        debug(`Failed to get status for provider ${provider.id}`, e);
      }
    }

    result.slackBots = slackBots;
    result.discordBots = discordBots;
    result.discordCount = discordBots.length;
    result.slackInfo = slackInfo;
    result.discordInfo = discordInfo;

    res.json(result);
  } catch {
    res.json({ ok: true, bots: [] });
  }
});

adminRouter.get('/personas', async (_req: Request, res: Response) => {
  res.json({ ok: true, personas: await loadPersonas() });
});

adminRouter.get('/llm-providers', (_req: Request, res: Response) => {
  const providers = providerRegistry.getLLMProviders().map((p) => ({
    key: p.id,
    label: p.label,
    docsUrl: p.docsUrl,
    helpText: p.helpText,
  }));
  res.json({ ok: true, providers });
});

adminRouter.get('/messenger-providers', (_req: Request, res: Response) => {
  const providers = providerRegistry.getMessageProviders().map((p) => ({
    key: p.id,
    label: p.label,
    docsUrl: p.docsUrl,
    helpText: p.helpText,
  }));
  res.json({ ok: true, providers });
});

adminRouter.get('/providers/:providerId/schema', requireAdmin, async (req: Request, res: Response) => {
  const { providerId } = req.params;
  const provider = providerRegistry.get(providerId);

  if (!provider) {
    return res.status(404).json({ ok: false, error: `Provider '${providerId}' not found` });
  }

  try {
    const schema = provider.getSchema();
    const serialized = serializeSchema(schema);
    return res.json({ ok: true, schema: serialized });
  } catch (e: any) {
    debug(`Failed to get schema for provider ${providerId}`, e);
    return res.status(500).json({ ok: false, error: e.message || String(e) });
  }
});

// Generic bot creation endpoint
adminRouter.post(
  '/providers/:providerId/bots',
  requireAdmin,
  async (req: AuditedRequest, res: Response) => {
    const { providerId } = req.params;
    const provider = providerRegistry.get(providerId);

    if (!provider || provider.type !== 'messenger') {
      return res
        .status(404)
        .json({ ok: false, error: `Message provider '${providerId}' not found` });
    }

    try {
      await (provider as IMessageProvider).addBot(req.body);

      logAdminAction(
        req,
        `CREATE_${providerId.toUpperCase()}_BOT`,
        `${providerId}-bots/${req.body?.name || 'unknown'}`,
        'success',
        `Created ${provider.label} bot`
      );
      return res.json({ ok: true });
    } catch (e: any) {
      logAdminAction(
        req,
        `CREATE_${providerId.toUpperCase()}_BOT`,
        `${providerId}-bots/${req.body?.name || 'unknown'}`,
        'failure',
        `Failed to create ${provider.label} bot: ${e?.message || String(e)}`
      );
      return res.status(500).json({ ok: false, error: e?.message || String(e) });
    }
  }
);

adminRouter.post('/slack-bots', requireAdmin, async (req: AuditedRequest, res: Response) => {
  const provider = providerRegistry.get('slack') as IMessageProvider;
  if (!provider) return res.status(404).json({ ok: false, error: 'Slack provider not found' });
  try {
    await provider.addBot(req.body);
    logAdminAction(
      req,
      'CREATE_SLACK_BOT',
      `slack-bots/${req.body?.name}`,
      'success',
      'Created Slack bot'
    );
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

adminRouter.post('/discord-bots', requireAdmin, async (req: AuditedRequest, res: Response) => {
  const provider = providerRegistry.get('discord') as IMessageProvider;
  if (!provider) return res.status(404).json({ ok: false, error: 'Discord provider not found' });
  try {
    await provider.addBot(req.body);
    logAdminAction(
      req,
      'CREATE_DISCORD_BOT',
      `discord-bots/${req.body?.name}`,
      'success',
      'Created Discord bot'
    );
    return res.json({ ok: true, note: 'Added and saved.' });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// Reload bots
adminRouter.post('/reload', requireAdmin, async (req: AuditedRequest, res: Response) => {
  try {
    const providers = providerRegistry.getMessageProviders();
    const result: any = { ok: true };

    for (const provider of providers) {
      if (provider.reload) {
        try {
          const reloadResult = await provider.reload();
          if (provider.id === 'slack') result.addedSlack = reloadResult?.added || 0;
          if (provider.id === 'discord') result.addedDiscord = reloadResult?.added || 0;
        } catch (e) {
          debug(`Reload failed for ${provider.id}`, e);
        }
      }
    }

    logAdminAction(req, 'RELOAD_BOTS', 'bots/reload', 'success', `Reloaded bots`);
    return res.json(result);
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

export default adminRouter;
