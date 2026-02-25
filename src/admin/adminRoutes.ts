import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { ProviderRegistry } from '../registries/ProviderRegistry';
import { IMessageProvider, ILLMProvider } from '../types/IProvider';
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

    // Arrays for legacy support
    const bots: string[] = [];
    const botInfo: any[] = [];

    // Legacy mapping vars
    let slackBots: string[] = [];
    let slackInfo: any[] = [];
    let discordBots: string[] = [];
    let discordInfo: any[] = [];
    let discordCount = 0;

    for (const provider of providers) {
        try {
            const status = await provider.getStatus();
            if (status.bots) {
                const names = status.bots.map((b: any) => b.name);
                bots.push(...names);
                botInfo.push(...status.bots);

                if (provider.id === 'slack') {
                    slackBots = names;
                    slackInfo = status.bots;
                } else if (provider.id === 'discord') {
                    discordBots = names;
                    discordInfo = status.bots;
                    discordCount = status.bots.length;
                }
            }
        } catch (e) {
            debug(`Failed to get status for provider ${provider.id}`, e);
        }
    }

    res.json({
      ok: true,
      bots,
      // Legacy fields for backward compatibility
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
adminRouter.post('/providers/:type/bots', requireAdmin, async (req: AuditedRequest, res: Response) => {
    try {
        const { type } = req.params;
        const registry = ProviderRegistry.getInstance();
        const provider = registry.getProvider(type) as IMessageProvider;

        if (!provider || provider.type !== 'message') {
            return res.status(404).json({ ok: false, error: `Message provider '${type}' not found` });
        }

        const result = await provider.createBot(req.body);

        if (!result.success) {
            logAdminAction(
                req,
                `CREATE_${type.toUpperCase()}_BOT`,
                `${type}-bots/${req.body?.name || 'unknown'}`,
                'failure',
                result.error || 'Unknown error'
            );
            return res.status(400).json({ ok: false, error: result.error });
        }

        logAdminAction(
            req,
            `CREATE_${type.toUpperCase()}_BOT`,
            `${type}-bots/${req.body?.name || 'unknown'}`,
            'success',
            `Created ${type} bot ${req.body?.name}`
        );
        return res.json({ ok: true });
    } catch (e: any) {
        return res.status(500).json({ ok: false, error: e.message });
    }
});

// Deprecated routes - mapped to generic one
adminRouter.post('/slack-bots', requireAdmin, async (req: AuditedRequest, res: Response) => {
    try {
        const registry = ProviderRegistry.getInstance();
        const provider = registry.getProvider('slack') as IMessageProvider;
        if (!provider) return res.status(500).json({ ok: false, error: 'Slack provider not available' });

        const result = await provider.createBot(req.body);
         if (!result.success) {
            logAdminAction(
                req,
                'CREATE_SLACK_BOT',
                `slack-bots/${req.body?.name || 'unknown'}`,
                'failure',
                result.error || 'Unknown error'
            );
             return res.status(400).json({ ok: false, error: result.error });
         }
         logAdminAction(
            req,
            'CREATE_SLACK_BOT',
            `slack-bots/${req.body?.name || 'unknown'}`,
            'success',
            `Created Slack bot ${req.body?.name}`
        );
         return res.json({ ok: true });
    } catch(e: any) {
        return res.status(500).json({ ok: false, error: e.message });
    }
});

adminRouter.post('/discord-bots', requireAdmin, async (req: AuditedRequest, res: Response) => {
    try {
        const registry = ProviderRegistry.getInstance();
        const provider = registry.getProvider('discord') as IMessageProvider;
        if (!provider) return res.status(500).json({ ok: false, error: 'Discord provider not available' });

        const result = await provider.createBot(req.body);
         if (!result.success) {
            logAdminAction(
                req,
                'CREATE_DISCORD_BOT',
                `discord-bots/${req.body?.name || 'unknown'}`,
                'failure',
                result.error || 'Unknown error'
            );
             return res.status(400).json({ ok: false, error: result.error });
         }
         logAdminAction(
            req,
            'CREATE_DISCORD_BOT',
            `discord-bots/${req.body?.name || 'unknown'}`,
            'success',
            `Created Discord bot ${req.body?.name}`
        );
         // Mimic old response
         return res.json({ ok: true, note: 'Saved. Restart app to initialize Discord bot.' });
    } catch(e: any) {
        return res.status(500).json({ ok: false, error: e.message });
    }
});

// Reload bots from messengers.json (adds missing instances for Slack and Discord)
adminRouter.post('/reload', requireAdmin, async (req: AuditedRequest, res: Response) => {
  try {
    const registry = ProviderRegistry.getInstance();
    const providers = registry.getMessageProviders();
    const stats: any = {};
    let addedSlack = 0;
    let addedDiscord = 0;

    for (const provider of providers) {
        try {
            const result = await provider.reload();
            if (provider.id === 'slack') addedSlack = result.added || 0;
            if (provider.id === 'discord') addedDiscord = result.added || 0;
            stats[`added${provider.label}`] = result.added || 0;
        } catch (e) {
            debug(`Reload error for ${provider.id}`, e);
        }
    }

    // Support legacy response keys for slack/discord
    const response: any = { ok: true, ...stats, addedSlack, addedDiscord };

    logAdminAction(
      req,
      'RELOAD_BOTS',
      'bots/reload',
      'success',
      `Reloaded bots: ${JSON.stringify(stats)}`
    );
    return res.json(response);
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
