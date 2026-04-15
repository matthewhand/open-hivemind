import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { Discord } from '@hivemind/message-discord';
import { SlackService } from '@hivemind/message-slack';
import { authenticate, requireAdmin } from '../auth/middleware';
import { providerRegistry } from '../registries/ProviderRegistry';
import { auditMiddleware, logAdminAction, type AuditedRequest } from '../server/middleware/audit';
import { ipWhitelist } from '../server/middleware/security';
import type { IBotInfo } from '../types/botInfo';
import { type IMessageProvider } from '../types/IProvider';
import { serializeSchema } from '../utils/schemaSerializer';
import { personasRouter } from './personasRoutes';
import { statusRouter } from './statusRoutes';

const debug = Debug('app:admin');
export const adminRouter = Router();

adminRouter.use(ipWhitelist);

adminRouter.use(authenticate);

adminRouter.use(auditMiddleware);

// Mount sub-routers
adminRouter.use('/', personasRouter);
adminRouter.use('/', statusRouter);

adminRouter.get('/bots', async (_req: Request, res: Response) => {
  try {
    const { BotManager } = await import('../managers/BotManager');
    const manager = await BotManager.getInstance();
    const bots = await manager.getAllBots();
    const statuses = await manager.getBotsStatus();
    const statusMap = new Map(statuses.map((s) => [s.id, s.isRunning]));

    const result = bots.map((bot) => ({
      id: bot.id,
      name: bot.name,
      provider: bot.messageProvider,
      messageProvider: bot.messageProvider,
      llmProvider: bot.llmProvider,
      persona: bot.persona,
      status: bot.isActive ? 'active' : 'disabled',
      connected: statusMap.get(bot.id) || false,
      isActive: bot.isActive,
    }));

    res.json({ success: true, bots: result });
  } catch (error) {
    debug('Failed to retrieve bots from BotManager', error);
    res.json({ success: true, bots: [] });
  }
});

adminRouter.get('/llm-providers', (_req: Request, res: Response) => {
  const providers = providerRegistry
    .getLLMProviders()
    .map((p) => ({ key: p.id, label: p.label, docsUrl: p.docsUrl, helpText: p.helpText }));
  res.json({ success: true, providers });
});

adminRouter.get('/messenger-providers', (_req: Request, res: Response) => {
  const providers = providerRegistry
    .getMessageProviders()
    .map((p) => ({ key: p.id, label: p.label, docsUrl: p.docsUrl, helpText: p.helpText }));
  res.json({ success: true, providers });
});

adminRouter.get(
  '/providers/:providerId/schema',
  requireAdmin,
  async (req: Request, res: Response) => {
    const { providerId } = req.params;
    const provider = providerRegistry.get(providerId);

    if (!provider) {
      return res.status(404).json({ success: false, error: `Provider '${providerId}' not found` });
    }

    try {
      const schema = provider.getSchema();
      const serialized = serializeSchema(schema);
      return res.json({ success: true, schema: serialized });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : String(e);
      debug(`Failed to get schema for provider ${providerId}`, e);
      return res.status(500).json({ success: false, error: message });
    }
  }
);

adminRouter.post(
  '/providers/:providerId/bots',
  requireAdmin,
  async (req: AuditedRequest, res: Response) => {
    const { providerId } = req.params;
    const provider = providerRegistry.get(providerId);

    if (!provider || provider.type !== 'messenger') {
      return res
        .status(404)
        .json({ success: false, error: `Message provider '${providerId}' not found` });
    }

    const body = req.body as { name?: string; token?: string; llm?: string };
    try {
      await (provider as IMessageProvider).addBot(req.body);

      logAdminAction(
        req,
        `CREATE_${providerId.toUpperCase()}_BOT`,
        `${providerId}-bots/${body.name || 'unknown'}`,
        'success',
        `Created ${provider.label} bot`
      );
      return res.json({ success: true, message: `Created ${provider.label} bot` });
    } catch (e) {
      const message = (e as Error)?.message || String(e);
      logAdminAction(
        req,
        `CREATE_${providerId.toUpperCase()}_BOT`,
        `${providerId}-bots/${body.name || 'unknown'}`,
        'failure',
        `Failed to create ${provider.label} bot: ${message}`
      );
      return res.status(500).json({ success: false, error: message });
    }
  }
);

/*
    const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
    const messengersPath = path.join(configDir, 'messengers.json');
    let cfg: { slack?: { mode?: string;
        instances?: { name: string; token: string; signingSecret: string; llm?: string }[]; }; } = { slack: { instances: [] } };
    try { const fileContent = await fs.promises.readFile(messengersPath, 'utf8');
      cfg = JSON.parse(fileContent); } catch (e) { if ((e as { code?: string }).code === 'ENOENT') { } else { debug('Failed reading messengers.json', e);
        throw e; } }
    cfg.slack = cfg.slack || {};
    cfg.slack.mode = cfg.slack.mode || mode || 'socket';
    cfg.slack.instances = cfg.slack.instances || [];
    cfg.slack.instances.push({ name, token: botToken, signingSecret, llm });

    try { await fs.promises.mkdir(path.dirname(messengersPath), { recursive: true });
      await fs.promises.writeFile(messengersPath, JSON.stringify(cfg, null, 2), 'utf8'); } catch (e) { debug('Failed writing messengers.json', e); }

    try { const slack = SlackService.getInstance();
      const instanceCfg = { name, slack: { botToken, signingSecret, appToken: appToken || '', defaultChannelId: defaultChannelId || '', joinChannels: joinChannels || '', mode: mode || 'socket' }, llm };
      await (slack as unknown as { addBot: (cfg: typeof instanceCfg) => Promise<void> }).addBot?.(
        instanceCfg
      ); } catch (e) { debug('Runtime addBot failed (continue, config was persisted):', e); }
*/

adminRouter.post('/slack-bots', requireAdmin, async (req: AuditedRequest, res: Response) => {
  const provider = providerRegistry.get('slack') as IMessageProvider;
  if (!provider) return res.status(404).json({ success: false, error: 'Slack provider not found' });
  const body = req.body as { name?: string; token?: string };
  try {
    await provider.addBot(req.body);
    logAdminAction(
      req,
      'CREATE_SLACK_BOT',
      `slack-bots/${body.name}`,
      'success',
      'Created Slack bot'
    );
    return res.json({ success: true });
  } catch (e) {
    const message = (e as Error)?.message || String(e);
    logAdminAction(
      req,
      'CREATE_SLACK_BOT',
      `slack-bots/${body.name || 'unknown'}`,
      'failure',
      `Failed to create Slack bot: ${message}`
    );
    return res.status(500).json({ success: false, error: message });
  }
});

adminRouter.post('/discord-bots', requireAdmin, async (req: AuditedRequest, res: Response) => {
  const provider = providerRegistry.get('discord') as IMessageProvider;
  if (!provider)
    return res.status(404).json({ success: false, error: 'Discord provider not found' });
  try {
    const { name, token, llm } = (req.body || {}) as {
      name?: string;
      token?: string;
      llm?: string;
    };
    if (!token) {
      logAdminAction(
        req,
        'CREATE_DISCORD_BOT',
        `discord-bots/${name || 'unnamed'}`,
        'failure',
        'Missing required field: token'
      );
      return res.status(400).json({ success: false, error: 'token is required' });
    }

    const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
    const messengersPath = path.join(configDir, 'messengers.json');
    let cfg: { discord?: { instances?: { name: string; token: string; llm?: string }[] } } = {
      discord: { instances: [] },
    };
    try {
      const fileContent = await fs.promises.readFile(messengersPath, 'utf8');
      cfg = JSON.parse(fileContent);
    } catch (e) {
      if ((e as { code?: string }).code === 'ENOENT') {
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
      return res.json({ success: true, note: 'Added and saved.' });
    } catch (e) {
      debug('Discord runtime add failed; config persisted:', e);
    }
    logAdminAction(
      req,
      'CREATE_DISCORD_BOT',
      `discord-bots/${name || 'unnamed'}`,
      'success',
      'Created Discord bot'
    );
    return res.json({ success: true, note: 'Saved. Restart app to initialize Discord bot.' });
  } catch (e) {
    const message = (e as Error)?.message || String(e);
    const discordBody = req.body as { name?: string };
    logAdminAction(
      req,
      'CREATE_DISCORD_BOT',
      `discord-bots/${discordBody.name || 'unnamed'}`,
      'failure',
      `Failed to create Discord bot: ${message}`
    );
    return res.status(500).json({ success: false, error: message });
  }
});

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
        return res.status(400).json({ success: false, error: 'messengers.json not found' });
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
    return res.json({ success: true, addedSlack, addedDiscord });
  } catch (e) {
    const message = (e as Error)?.message || String(e);
    logAdminAction(
      req,
      'RELOAD_BOTS',
      'bots/reload',
      'failure',
      `Failed to reload bots: ${message}`
    );
    return res.status(500).json({ success: false, error: message });
  }
});

export default adminRouter;
