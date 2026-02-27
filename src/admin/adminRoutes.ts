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
    const out: { key: string; name: string; systemPrompt: string }[] = results.filter(
      (item): item is { key: string; name: string; systemPrompt: string } => item !== null
    );

    return out.length ? out : fallback;
  } catch (e) {
    debug('Failed loading personas', e);
    return fallback;
  }
}

adminRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const slack = SlackService.getInstance();
    const slackBots = slack.getBotNames();
    const slackInfo = slackBots.map((name: string) => {
      const cfg = slack.getBotConfig(name) || {};
      return {
        provider: 'slack',
        name,
        defaultChannel: cfg?.slack?.defaultChannelId || '',
        mode: cfg?.slack?.mode || 'socket',
      };
    });
    let discordBots: string[] = [];
    let discordInfo: { provider: string; name: string }[] = [];
    try {
      // Use unknown casting to bypass strict type checks for dynamic property access
      const DiscordModule = Discord as unknown as {
        DiscordService: { getInstance: () => unknown };
      };
      const ds = DiscordModule.DiscordService.getInstance() as {
        getAllBots?: () => IBotInfo[];
      };
      const bots = ds.getAllBots?.() || [];
      discordBots = bots.map((b) => b?.botUserName || b?.config?.name || 'discord');
      discordInfo = bots.map((b) => ({
        provider: 'discord',
        name: b?.botUserName || b?.config?.name || 'discord',
      }));
    } catch {}
    res.json({
      ok: true,
      slackBots,
      discordBots,
      discordCount: discordBots.length,
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
    } catch (e) {
      debug(`Error adding bot to provider ${providerId}`, e);
      // Fall through to manual persistence attempt if runtime add failed?
      // Or just log it. Given the original code lacked a catch, we'll just log and continue
      // to the persistence logic which seems to be the fallback/legacy path.
    }

    // Persist to config/providers/messengers.json for demo persistence
    const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
    const messengersPath = path.join(configDir, 'messengers.json');
    let cfg: {
      slack?: {
        mode?: string;
        instances?: { name: string; token: string; signingSecret: string; llm?: string }[];
      };
    } = { slack: { instances: [] } };
    try {
      const fileContent = await fs.promises.readFile(messengersPath, 'utf8');
      cfg = JSON.parse(fileContent);
    } catch (e) {
      if ((e as { code?: string }).code === 'ENOENT') {
        // File doesn't exist yet, start with empty config
      } else {
        debug('Failed reading messengers.json', e);
        throw e;
      }
    }
    cfg.slack = cfg.slack || {};
    cfg.slack.mode = cfg.slack.mode || mode || 'socket';
    cfg.slack.instances = cfg.slack.instances || [];
    cfg.slack.instances.push({ name, token: botToken, signingSecret, llm });

    try {
      await fs.promises.mkdir(path.dirname(messengersPath), { recursive: true });
      await fs.promises.writeFile(messengersPath, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (e) {
      debug('Failed writing messengers.json', e);
      // Non-fatal; still attempt runtime add
    }

    // Runtime add via SlackService
    try {
      const slack = SlackService.getInstance();
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
      // Cast slack to unknown to access addBot which might be dynamically added or not in type def
      await (slack as unknown as { addBot: (cfg: typeof instanceCfg) => Promise<void> }).addBot?.(
        instanceCfg
      );
    } catch (e) {
      debug('Runtime addBot failed (continue, config was persisted):', e);
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
  } catch (e) {
    const message = (e as Error)?.message || String(e);
    logAdminAction(
      req,
      'CREATE_SLACK_BOT',
      `slack-bots/${req.body?.name || 'unknown'}`,
      'failure',
      `Failed to create Slack bot: ${message}`
    );
    return res.status(500).json({ ok: false, error: message });
  }
});

adminRouter.post('/discord-bots', requireAdmin, async (req: AuditedRequest, res: Response) => {
  const provider = providerRegistry.get('discord') as IMessageProvider;
  if (!provider) return res.status(404).json({ ok: false, error: 'Discord provider not found' });
  try {
    const { name, token, llm } = req.body || {};
    if (!token) {
      logAdminAction(
        req,
        'CREATE_DISCORD_BOT',
        `discord-bots/${name || 'unnamed'}`,
        'failure',
        'Missing required field: token'
      );
      return res.status(400).json({ ok: false, error: 'token is required' });
    }

    const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
    const messengersPath = path.join(configDir, 'messengers.json');
    let cfg: {
      discord?: { instances?: { name: string; token: string; llm?: string }[] };
    } = { discord: { instances: [] } };
    try {
      const fileContent = await fs.promises.readFile(messengersPath, 'utf8');
      cfg = JSON.parse(fileContent);
    } catch (e) {
      if ((e as { code?: string }).code === 'ENOENT') {
        // File doesn't exist yet, start with empty config
      } else {
        debug('Failed reading messengers.json', e);
        throw e;
      }
    }
    cfg.discord = cfg.discord || {};
    cfg.discord.instances = cfg.discord.instances || [];
    cfg.discord.instances.push({ name: name || '', token, llm });

    try {
      await fs.promises.mkdir(path.dirname(messengersPath), { recursive: true });
      await fs.promises.writeFile(messengersPath, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (e) {
      debug('Failed writing messengers.json', e);
    }

    // Try runtime add
    try {
      const DiscordModule = Discord as unknown as {
        DiscordService: { getInstance: () => unknown };
      };
      const ds = DiscordModule.DiscordService.getInstance() as {
        addBot?: (config: { name: string; token: string; llm?: string }) => Promise<void>;
      };
      const instanceCfg = { name: name || '', token, llm };
      await ds.addBot?.(instanceCfg);
      logAdminAction(
        req,
        'CREATE_DISCORD_BOT',
        `discord-bots/${name || 'unnamed'}`,
        'success',
        `Created Discord bot ${name || 'unnamed'} with runtime initialization`
      );
      return res.json({ ok: true, note: 'Added and saved.' });
    } catch (e) {
      debug('Discord runtime add failed; config persisted:', e);
    }
    logAdminAction(
      req,
      'CREATE_DISCORD_BOT',
      `discord-bots/${req.body?.name}`,
      'success',
      'Created Discord bot'
    );
    return res.json({ ok: true, note: 'Saved. Restart app to initialize Discord bot.' });
  } catch (e) {
    const message = (e as Error)?.message || String(e);
    logAdminAction(
      req,
      'CREATE_DISCORD_BOT',
      `discord-bots/${req.body?.name || 'unnamed'}`,
      'failure',
      `Failed to create Discord bot: ${message}`
    );
    return res.status(500).json({ ok: false, error: message });
  }
});

// Reload bots
adminRouter.post('/reload', requireAdmin, async (req: AuditedRequest, res: Response) => {
  try {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
    const messengersPath = path.join(configDir, 'messengers.json');
    let cfg: {
      slack?: {
        mode?: string;
        instances?: { name: string; token: string; signingSecret: string; llm?: string }[];
      };
      discord?: { instances?: { name: string; token: string; llm?: string }[] };
    };
    try {
      const content = await fs.promises.readFile(messengersPath, 'utf8');
      cfg = JSON.parse(content);
    } catch (e) {
      if ((e as { code?: string }).code === 'ENOENT') {
        return res.status(400).json({ ok: false, error: 'messengers.json not found' });
      }
      throw e;
    }
    let addedSlack = 0;
    let addedDiscord = 0;
    try {
      const slack = SlackService.getInstance();
      const existing = new Set(slack.getBotNames());
      const instances = cfg.slack?.instances || [];
      for (const inst of instances) {
        const nm = inst.name || '';
        if (!nm || !existing.has(nm)) {
          // Cast slack to unknown to access addBot
          const slackAny = slack as unknown as {
            addBot: (cfg: {
              name: string;
              slack: { botToken: string; signingSecret: string; mode: string };
            }) => Promise<void>;
          };
          await slackAny.addBot?.({
            name: nm || `Bot${Date.now()}`,
            slack: {
              botToken: inst.token,
              signingSecret: inst.signingSecret || '',
              mode: cfg.slack?.mode || 'socket',
            },
          });
          addedSlack++;
        }
      }
    } catch (e) {
      debug('Slack reload error', e);
    }

    try {
      const DiscordModule = Discord as unknown as {
        DiscordService: { getInstance: () => unknown };
      };
      const ds = DiscordModule.DiscordService.getInstance() as {
        getAllBots?: () => IBotInfo[];
        addBot?: (config: { name: string; token: string }) => Promise<void>;
      };
      const allBots = ds.getAllBots?.() || [];
      const have = new Set(allBots.map((b) => b?.config?.discord?.token || b?.config?.token));
      const instances = cfg.discord?.instances || [];
      for (const inst of instances) {
        if (inst.token && !have.has(inst.token)) {
          await ds.addBot?.({ name: inst.name || '', token: inst.token });
          addedDiscord++;
        }
      }
    } catch (e) {
      debug('Discord reload error', e);
    }

    logAdminAction(
      req,
      'RELOAD_BOTS',
      'bots/reload',
      'success',
      `Reloaded bots from messengers.json: ${addedSlack} Slack bots, ${addedDiscord} Discord bots added`
    );
    return res.json({ ok: true, addedSlack, addedDiscord });
  } catch (e) {
    const message = (e as Error)?.message || String(e);
    logAdminAction(
      req,
      'RELOAD_BOTS',
      'bots/reload',
      'failure',
      `Failed to reload bots: ${message}`
    );
    return res.status(500).json({ ok: false, error: message });
  }
});

export default adminRouter;
