import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { Discord } from '@hivemind/adapter-discord';
import type { IBotInfo } from '@src/types/botInfo';
import { SlackService } from '@hivemind/adapter-slack';
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

adminRouter.get('/status', (_req: Request, res: Response) => {
  try {
    const slack = SlackService.getInstance();
    const slackBots = slack.getBotNames();
    const slackInfo = slackBots.map((name: string) => {
      const cfg: any = slack.getBotConfig(name) || {};
      return {
        provider: 'slack',
        name,
        defaultChannel: cfg?.slack?.defaultChannelId || '',
        mode: cfg?.slack?.mode || 'socket',
      };
    });
    let discordBots: string[] = [];
    let discordInfo: any[] = [];
    try {
      const ds = (Discord as any).DiscordService.getInstance();
      const bots = (ds.getAllBots?.() || []) as IBotInfo[];
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

const LLM_PROVIDERS = [
  {
    key: 'openai',
    label: 'OpenAI',
    docsUrl: 'https://platform.openai.com/account/api-keys',
    helpText: 'Create an OpenAI API key from the developer dashboard and paste it here.',
  },
  {
    key: 'flowise',
    label: 'Flowise',
    docsUrl: 'https://docs.flowiseai.com/installation/overview',
    helpText: 'Use the Flowise REST endpoint and API key configured in your Flowise instance.',
  },
  {
    key: 'openwebui',
    label: 'OpenWebUI',
    docsUrl: 'https://docs.openwebui.com/',
    helpText: 'Enable API access in OpenWebUI and copy the token from the administration panel.',
  },
];

const MESSENGER_PROVIDERS = [
  {
    key: 'discord',
    label: 'Discord',
    docsUrl: 'https://discord.com/developers/applications',
    helpText: 'Create a Discord application, add a bot, and copy the bot token from the Bot tab.',
  },
  {
    key: 'slack',
    label: 'Slack',
    docsUrl: 'https://api.slack.com/apps',
    helpText:
      'Create a Slack app, enable Socket Mode or Events, and generate the bot and app tokens.',
  },
  {
    key: 'mattermost',
    label: 'Mattermost',
    docsUrl: 'https://developers.mattermost.com/integrate/admin-guide/admin-bot-accounts/',
    helpText: 'Create a Mattermost bot account and generate a personal access token for it.',
  },
];

adminRouter.get('/llm-providers', (_req: Request, res: Response) => {
  res.json({ ok: true, providers: LLM_PROVIDERS });
});

adminRouter.get('/messenger-providers', (_req: Request, res: Response) => {
  res.json({ ok: true, providers: MESSENGER_PROVIDERS });
});

// Minimal Slack bot creation: supports a single instance add at runtime
adminRouter.post('/slack-bots', requireAdmin, async (req: AuditedRequest, res: Response) => {
  try {
    const { name, botToken, signingSecret, appToken, defaultChannelId, joinChannels, mode, llm } =
      req.body || {};
    if (!name || !botToken || !signingSecret) {
      logAdminAction(
        req,
        'CREATE_SLACK_BOT',
        `slack-bots/${name}`,
        'failure',
        'Missing required fields: name, botToken, signingSecret'
      );
      return res
        .status(400)
        .json({ ok: false, error: 'name, botToken, and signingSecret are required' });
    }

    // Persist to config/providers/messengers.json for demo persistence
    const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
    const messengersPath = path.join(configDir, 'messengers.json');
    let cfg: any = { slack: { instances: [] } };
    try {
      const fileContent = await fs.promises.readFile(messengersPath, 'utf8');
      cfg = JSON.parse(fileContent);
    } catch (e: any) {
      if (e.code === 'ENOENT') {
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
      await (slack as any).addBot?.(instanceCfg);
    } catch (e) {
      debug('Runtime addBot failed (continue, config was persisted):', e);
    }

    logAdminAction(
      req,
      'CREATE_SLACK_BOT',
      `slack-bots/${name}`,
      'success',
      `Created Slack bot ${name} with token and configuration`
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

// Discord admin routes
adminRouter.post('/discord-bots', requireAdmin, async (req: AuditedRequest, res: Response) => {
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
    let cfg: any = { discord: { instances: [] } };
    try {
      const fileContent = await fs.promises.readFile(messengersPath, 'utf8');
      cfg = JSON.parse(fileContent);
    } catch (e: any) {
      if (e.code === 'ENOENT') {
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
      const ds = (Discord as any).DiscordService.getInstance();
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
      `discord-bots/${name || 'unnamed'}`,
      'success',
      `Created Discord bot ${name || 'unnamed'} (requires restart for initialization)`
    );
    return res.json({ ok: true, note: 'Saved. Restart app to initialize Discord bot.' });
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
    const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
    const messengersPath = path.join(configDir, 'messengers.json');
    let cfg: any;
    try {
      const content = await fs.promises.readFile(messengersPath, 'utf8');
      cfg = JSON.parse(content);
    } catch (e: any) {
      if (e.code === 'ENOENT') {
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
          await (slack as any).addBot?.({
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
      const ds = (Discord as any).DiscordService.getInstance();
      const have = new Set(
        ((ds.getAllBots?.() || []) as any[]).map(
          (b) => b?.config?.discord?.token || b?.config?.token
        )
      );
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
