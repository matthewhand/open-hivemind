import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { ProviderRegistry } from '../registries/ProviderRegistry';
import type { IBotInfo } from '@src/types/botInfo';
import { authenticate, requireAdmin } from '../auth/middleware';
import { auditMiddleware, logAdminAction, type AuditedRequest } from '../server/middleware/audit';
import { ipWhitelist } from '../server/middleware/security';
import { IMessageProvider } from '../types/IProvider';

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

    // Construct response compatible with frontend
    let slackBots: string[] = [];
    let slackInfo: any[] = [];
    let discordBots: string[] = [];
    let discordInfo: any[] = [];
    let discordCount = 0;

    for (const p of providers) {
      if (p.id === 'slack') {
        const status = await p.getStatus();
        if (status.ok && status.bots) {
          slackBots = status.bots.map((b: any) => b.name);
          // Fetch detailed info via getBots for slackInfo
          slackInfo = await p.getBots();
        }
      } else if (p.id === 'discord') {
        const status = await p.getStatus();
        if (status.ok && status.bots) {
          discordBots = status.bots.map((b: any) => b.name);
          discordInfo = status.bots;
          discordCount = status.count;
        }
      }
    }

    res.json({
      ok: true,
      slackBots,
      discordBots,
      discordCount,
      slackInfo,
      discordInfo,
    });
  } catch {
    res.json({ ok: true, bots: [] });
  }
});

adminRouter.get('/personas', async (_req: Request, res: Response) => {
  res.json({ ok: true, personas: await loadPersonas() });
});

adminRouter.get('/llm-providers', (_req: Request, res: Response) => {
  const registry = ProviderRegistry.getInstance();
  const providers = registry.getLLMProviders().map(p => ({
    key: p.id,
    label: p.label,
    docsUrl: p.docsUrl,
    helpText: p.helpText
  }));
  res.json({ ok: true, providers });
});

adminRouter.get('/messenger-providers', (_req: Request, res: Response) => {
  const registry = ProviderRegistry.getInstance();
  const providers = registry.getMessageProviders().map(p => ({
    key: p.id,
    label: p.label,
    docsUrl: p.docsUrl,
    helpText: p.helpText
  }));
  res.json({ ok: true, providers });
});

// Generic bot creation
adminRouter.post('/providers/:providerId/bots', requireAdmin, async (req: AuditedRequest, res: Response) => {
  const { providerId } = req.params;
  const registry = ProviderRegistry.getInstance();
  const provider = registry.getProvider(providerId);

  if (!provider || provider.type !== 'message') {
    return res.status(404).json({ ok: false, error: 'Provider not found or not a message provider' });
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
    return res.json({ ok: true, note: 'Bot added.' });
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
});

// Backward compatibility for old routes (Slack)
adminRouter.post('/slack-bots', requireAdmin, async (req: AuditedRequest, res: Response) => {
    const registry = ProviderRegistry.getInstance();
    const provider = registry.getProvider('slack');
    if (!provider) return res.status(500).json({ok: false, error: 'Slack provider not found'});

    try {
        await (provider as IMessageProvider).addBot(req.body);
        logAdminAction(req, 'CREATE_SLACK_BOT', `slack-bots/${req.body?.name}`, 'success', 'Created Slack bot via legacy route');
        return res.json({ ok: true });
    } catch(e: any) {
        logAdminAction(req, 'CREATE_SLACK_BOT', `slack-bots/${req.body?.name}`, 'failure', e.message);
        return res.status(500).json({ ok: false, error: e.message });
    }
});

// Backward compatibility for old routes (Discord)
adminRouter.post('/discord-bots', requireAdmin, async (req: AuditedRequest, res: Response) => {
    const registry = ProviderRegistry.getInstance();
    const provider = registry.getProvider('discord');
    if (!provider) return res.status(500).json({ok: false, error: 'Discord provider not found'});

    try {
        await (provider as IMessageProvider).addBot(req.body);
        logAdminAction(req, 'CREATE_DISCORD_BOT', `discord-bots/${req.body?.name}`, 'success', 'Created Discord bot via legacy route');
        return res.json({ ok: true, note: 'Saved. Restart app to initialize Discord bot.' });
    } catch(e: any) {
        logAdminAction(req, 'CREATE_DISCORD_BOT', `discord-bots/${req.body?.name}`, 'failure', e.message);
        return res.status(500).json({ ok: false, error: e.message });
    }
});


// Reload bots from messengers.json
adminRouter.post('/reload', requireAdmin, async (req: AuditedRequest, res: Response) => {
  try {
    const registry = ProviderRegistry.getInstance();
    const providers = registry.getMessageProviders();

    let addedSlack = 0;
    let addedDiscord = 0;

    for (const p of providers) {
       const result = await p.reload();
       if (result.ok && result.added) {
         if (p.id === 'slack') addedSlack += result.added;
         if (p.id === 'discord') addedDiscord += result.added;
       }
    }

    logAdminAction(
      req,
      'RELOAD_BOTS',
      'bots/reload',
      'success',
      `Reloaded bots from messengers.json`
    );
    return res.json({ ok: true, addedSlack, addedDiscord });
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
