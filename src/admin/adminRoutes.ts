import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { authenticate, requireAdmin } from '../auth/middleware';
import { auditMiddleware, logAdminAction, type AuditedRequest } from '../server/middleware/audit';
import { ipWhitelist } from '../server/middleware/security';
import { ProviderRegistry } from '../registries/ProviderRegistry';

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

// GET /status - Get status from all registered providers
adminRouter.get('/status', async (_req: Request, res: Response) => {
  const registry = ProviderRegistry.getInstance();
  const providers = registry.getAll();

  const bots: any[] = [];

  for (const provider of providers) {
    if (provider.getMetadata().type === 'messenger') {
      try {
        const status = await provider.getStatus();
        if (status.bots) {
          bots.push(...status.bots);
        }
      } catch (e) {
        debug(`Failed to get status for ${provider.getMetadata().id}`, e);
      }
    }
  }

  // Legacy format support for frontend compatibility
  const slackBots = bots.filter((b) => b.provider === 'slack').map((b) => b.name);
  const discordBots = bots.filter((b) => b.provider === 'discord').map((b) => b.name);

  res.json({
    ok: true,
    bots,
    slackBots,
    discordBots,
    discordCount: discordBots.length,
    slackInfo: bots.filter((b) => b.provider === 'slack'),
    discordInfo: bots.filter((b) => b.provider === 'discord'),
  });
});

adminRouter.get('/personas', async (_req: Request, res: Response) => {
  res.json({ ok: true, personas: await loadPersonas() });
});

// GET /llm-providers - List LLM providers from registry
adminRouter.get('/llm-providers', (_req: Request, res: Response) => {
  const registry = ProviderRegistry.getInstance();
  const providers = registry.getByType('llm').map((p) => {
    const m = p.getMetadata();
    return {
      key: m.id,
      label: m.name,
      docsUrl: m.docsUrl,
      helpText: m.helpText,
    };
  });
  res.json({ ok: true, providers });
});

// GET /messenger-providers - List Messenger providers from registry
adminRouter.get('/messenger-providers', (_req: Request, res: Response) => {
  const registry = ProviderRegistry.getInstance();
  const providers = registry.getByType('messenger').map((p) => {
    const m = p.getMetadata();
    return {
      key: m.id,
      label: m.name,
      docsUrl: m.docsUrl,
      helpText: m.helpText,
    };
  });
  res.json({ ok: true, providers });
});

// POST /reload - Reload all providers
adminRouter.post('/reload', requireAdmin, async (req: AuditedRequest, res: Response) => {
  const registry = ProviderRegistry.getInstance();
  const providers = registry.getAll();
  const results: any = {};
  const addedSlack = 0; // Legacy compat return
  const addedDiscord = 0; // Legacy compat return

  for (const provider of providers) {
    if (provider.refresh) {
      try {
        await provider.refresh();
        results[provider.getMetadata().id] = 'success';
      } catch (e: any) {
        results[provider.getMetadata().id] = `failed: ${e.message}`;
      }
    }
  }

  logAdminAction(
    req,
    'RELOAD_BOTS',
    'bots/reload',
    'success',
    `Reloaded providers: ${Object.keys(results).join(', ')}`
  );

  return res.json({ ok: true, results, addedSlack, addedDiscord });
});

// Helper for persistence (Legacy Messengers.json support)
async function persistMessengerConfig(type: 'slack' | 'discord', instanceConfig: any) {
  const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
  const messengersPath = path.join(configDir, 'messengers.json');
  let cfg: any = {};
  try {
    const fileContent = await fs.promises.readFile(messengersPath, 'utf8');
    cfg = JSON.parse(fileContent);
  } catch (e: any) {
    if (e.code !== 'ENOENT') {throw e;}
  }
  cfg[type] = cfg[type] || {};
  cfg[type].instances = cfg[type].instances || [];
  cfg[type].instances.push(instanceConfig);

  await fs.promises.mkdir(path.dirname(messengersPath), { recursive: true });
  await fs.promises.writeFile(messengersPath, JSON.stringify(cfg, null, 2), 'utf8');
}

// POST /slack-bots - Legacy route wrapping generic logic
adminRouter.post('/slack-bots', requireAdmin, async (req: AuditedRequest, res: Response) => {
  try {
    const { name, botToken, signingSecret, appToken, defaultChannelId, joinChannels, mode, llm } =
      req.body || {};
    if (!name || !botToken || !signingSecret) {
      return res
        .status(400)
        .json({ ok: false, error: 'name, botToken, and signingSecret are required' });
    }

    // Persist
    await persistMessengerConfig('slack', { name, token: botToken, signingSecret, llm });

    // Runtime Add
    const registry = ProviderRegistry.getInstance();
    const slack = registry.get('slack');
    if (slack && (slack as any).addBot) {
      const instanceCfg = {
        name,
        slack: {
          botToken,
          signingSecret,
          appToken: appToken || '',
          defaultChannelId: defaultChannelId || '',
          joinChannels: joinChannels || '',
          mode: mode || 'socket',
        },
        llm,
      };
      await (slack as any).addBot(instanceCfg);
    }

    logAdminAction(
      req,
      'CREATE_SLACK_BOT',
      `slack-bots/${name}`,
      'success',
      'Created Slack bot'
    );
    return res.json({ ok: true });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /discord-bots - Legacy route wrapping generic logic
adminRouter.post('/discord-bots', requireAdmin, async (req: AuditedRequest, res: Response) => {
  try {
    const { name, token, llm } = req.body || {};
    if (!token) {return res.status(400).json({ ok: false, error: 'token is required' });}

    await persistMessengerConfig('discord', { name: name || '', token, llm });

    const registry = ProviderRegistry.getInstance();
    const discord = registry.get('discord');
    if (discord && (discord as any).addBot) {
      await (discord as any).addBot({ name: name || '', token, llm });
    }

    logAdminAction(
      req,
      'CREATE_DISCORD_BOT',
      `discord-bots/${name}`,
      'success',
      'Created Discord bot'
    );
    return res.json({ ok: true, note: 'Saved.' });
  } catch (e: any) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

export default adminRouter;
