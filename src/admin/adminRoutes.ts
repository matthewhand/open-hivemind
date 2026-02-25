import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { authenticate, requireAdmin } from '../auth/middleware';
import { auditMiddleware, logAdminAction, type AuditedRequest } from '../server/middleware/audit';
import { ipWhitelist } from '../server/middleware/security';
import { IMessageProvider } from '@src/types/IProvider';

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
    const result: any = { ok: true, bots: [], details: {} };

    for (const p of providers) {
      const status = await p.getStatus();
      result.details[p.id] = status;
      // Backward compatibility
      if (p.id === 'slack') {
        result.slackBots = status.bots;
        result.slackInfo = status.details;
      }
      if (p.id === 'discord') {
        result.discordBots = status.bots;
        result.discordCount = status.count;
        result.discordInfo = status.details;
      }
    }
    res.json(result);
  } catch (e) {
    res.json({ ok: false, error: String(e) });
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

// Generic bot creation endpoint
adminRouter.post(
  '/providers/:providerId/bots',
  requireAdmin,
  async (req: AuditedRequest, res: Response) => {
    const { providerId } = req.params;
    const config = req.body;
    const name = config.name || 'unnamed';

    try {
      const provider = providerRegistry.get(providerId);
      if (!provider || provider.type !== 'messenger') {
        return res
          .status(404)
          .json({ ok: false, error: `Messenger provider '${providerId}' not found` });
      }

      // Cast to IMessageProvider
      const msgProvider = provider as IMessageProvider;

      await msgProvider.addBot(config);

      logAdminAction(
        req,
        'CREATE_BOT',
        `providers/${providerId}/bots/${name}`,
        'success',
        `Created bot ${name} for provider ${providerId}`
      );
      return res.json({ ok: true, message: `Bot ${name} created successfully` });
    } catch (e: any) {
      logAdminAction(
        req,
        'CREATE_BOT',
        `providers/${providerId}/bots/${name}`,
        'failure',
        `Failed to create bot: ${e?.message || String(e)}`
      );
      return res.status(500).json({ ok: false, error: e?.message || String(e) });
    }
  }
);

// Legacy Slack bot creation: supports a single instance add at runtime
adminRouter.post('/slack-bots', requireAdmin, async (req: AuditedRequest, res: Response) => {
  try {
    const provider = providerRegistry.get('slack') as IMessageProvider;
    if (!provider) throw new Error('Slack provider not found');
    await provider.addBot(req.body);

    logAdminAction(
      req,
      'CREATE_SLACK_BOT',
      `slack-bots/${req.body?.name}`,
      'success',
      `Created Slack bot ${req.body?.name}`
    );
    return res.json({ ok: true });
  } catch (e: any) {
    logAdminAction(
      req,
      'CREATE_SLACK_BOT',
      `slack-bots/${req.body?.name || 'unknown'}`,
      'failure',
      `Failed to create Slack bot: ${e?.message || String(e)}`
    );
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

export default adminRouter;

// Legacy Discord admin routes
adminRouter.post('/discord-bots', requireAdmin, async (req: AuditedRequest, res: Response) => {
  try {
    const provider = providerRegistry.get('discord') as IMessageProvider;
    if (!provider) throw new Error('Discord provider not found');
    await provider.addBot(req.body);

    logAdminAction(
      req,
      'CREATE_DISCORD_BOT',
      `discord-bots/${req.body?.name || 'unnamed'}`,
      'success',
      `Created Discord bot ${req.body?.name || 'unnamed'}`
    );
    return res.json({ ok: true, note: 'Saved.' });
  } catch (e: any) {
    logAdminAction(
      req,
      'CREATE_DISCORD_BOT',
      `discord-bots/${req.body?.name || 'unnamed'}`,
      'failure',
      `Failed to create Discord bot: ${e?.message || String(e)}`
    );
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

// Reload bots from messengers.json (adds missing instances for Slack and Discord)
adminRouter.post('/reload', requireAdmin, async (req: AuditedRequest, res: Response) => {
  try {
    const providers = providerRegistry.getMessageProviders();
    const results: any = {};
    let totalAdded = 0;

    for (const p of providers) {
      const reloadResult = await p.reload();
      results[p.id] = reloadResult;
      if (reloadResult.added) {
        totalAdded += reloadResult.added;
      }
    }

    logAdminAction(
      req,
      'RELOAD_BOTS',
      'bots/reload',
      'success',
      `Reloaded bots: ${totalAdded} added. Details: ${JSON.stringify(results)}`
    );
    return res.json({
      ok: true,
      results,
      addedSlack: results.slack?.added || 0,
      addedDiscord: results.discord?.added || 0,
    });
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
