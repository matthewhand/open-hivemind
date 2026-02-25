import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { providerRegistry } from '../registries/ProviderRegistry';
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
    const providers = providerRegistry.getMessageProviders();
    const allInstances: any[] = [];
    const allBots: string[] = [];

    for (const provider of providers) {
      const status = await provider.getStatus();
      if (status.ok && status.instances) {
        const pInstances = status.instances.map((inst: any) => ({
          ...inst,
          provider: provider.id
        }));
        allInstances.push(...pInstances);
        allBots.push(...pInstances.map((i: any) => i.name));
      }
    }

    const slackInfo = allInstances.filter(i => i.provider === 'slack');
    const discordInfo = allInstances.filter(i => i.provider === 'discord');

    res.json({
      ok: true,
      bots: allBots,
      slackBots: slackInfo.map(i => i.name),
      discordBots: discordInfo.map(i => i.name),
      discordCount: discordInfo.length,
      slackInfo,
      discordInfo,
      instances: allInstances
    });
  } catch (e: any) {
    res.json({ ok: true, bots: [], error: e.message });
  }
});

adminRouter.get('/personas', async (_req: Request, res: Response) => {
  res.json({ ok: true, personas: await loadPersonas() });
});

adminRouter.get('/llm-providers', (_req: Request, res: Response) => {
  const providers = providerRegistry.getLlmProviders();
  res.json({
    ok: true,
    providers: providers.map(p => ({
      key: p.id,
      label: p.label,
      docsUrl: p.docsUrl,
      helpText: p.helpText
    }))
  });
});

adminRouter.get('/messenger-providers', (_req: Request, res: Response) => {
  const providers = providerRegistry.getMessageProviders();
  res.json({
    ok: true,
    providers: providers.map(p => ({
      key: p.id,
      label: p.label,
      docsUrl: p.docsUrl,
      helpText: p.helpText
    }))
  });
});

// Generic bot creation
adminRouter.post('/providers/:providerId/bots', requireAdmin, async (req: AuditedRequest, res: Response) => {
  try {
    const { providerId } = req.params;
    const providers = providerRegistry.getMessageProviders();
    const messageProvider = providers.find(p => p.id === providerId);

    if (!messageProvider) {
      return res.status(404).json({ ok: false, error: `Provider ${providerId} not found or is not a message provider` });
    }

    if (!messageProvider.addBot) {
         return res.status(400).json({ ok: false, error: `Provider ${providerId} does not support adding bots` });
    }

    await messageProvider.addBot(req.body);

    logAdminAction(
      req,
      'CREATE_BOT',
      `providers/${providerId}/bots`,
      'success',
      `Created bot for provider ${providerId}`
    );
    return res.json({ ok: true });
  } catch (e: any) {
    logAdminAction(
      req,
      'CREATE_BOT',
      `providers/${req.params.providerId}/bots`,
      'failure',
      `Failed to create bot: ${e?.message || String(e)}`
    );
    return res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

export default adminRouter;

// Reload bots from messengers.json (adds missing instances for Slack and Discord)
adminRouter.post('/reload', requireAdmin, async (req: AuditedRequest, res: Response) => {
  try {
    const providers = providerRegistry.getMessageProviders();
    const details: Record<string, string> = {};

    for (const provider of providers) {
      if (provider.reload) {
        try {
          await provider.reload();
          details[provider.id] = 'reloaded';
        } catch (e: any) {
          details[provider.id] = `failed: ${e.message}`;
        }
      }
    }

    logAdminAction(
      req,
      'RELOAD_BOTS',
      'bots/reload',
      'success',
      `Reloaded bots: ${JSON.stringify(details)}`
    );
    // Returning 0 for addedSlack/addedDiscord as we don't track them precisely anymore
    return res.json({ ok: true, addedSlack: 0, addedDiscord: 0, details });
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
