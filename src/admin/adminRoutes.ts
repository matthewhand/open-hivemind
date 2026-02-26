import { Router, Request, Response } from 'express';
import Debug from 'debug';
import fs from 'fs';
import path from 'path';
import SlackService from '@integrations/slack/SlackService';
import { Discord } from '@integrations/discord/DiscordService';
import { auditMiddleware, AuditedRequest, logAdminAction } from '../server/middleware/audit';
import { ipWhitelist } from '../server/middleware/security';
import { authenticate, requireAdmin } from '../auth/middleware';

interface Persona {
  key: string;
  name: string;
  systemPrompt: string;
}

interface SlackBotConfig {
  slack?: {
    defaultChannelId?: string;
    mode?: string;
  };
}

interface DiscordBot {
  botUserName?: string;
  config?: {
    name?: string;
    token?: string;
    discord?: {
      token?: string;
    };
  };
}

interface BotInstance {
  name: string;
  token: string;
  signingSecret?: string;
  appToken?: string;
  defaultChannelId?: string;
  joinChannels?: string;
  mode?: string;
  llm?: unknown;
}

interface DiscordInstance extends Omit<BotInstance, 'signingSecret' | 'appToken' | 'defaultChannelId' | 'joinChannels' | 'mode'> {}

interface MessengersConfig {
  slack?: {
    instances: BotInstance[];
    mode?: string;
  };
  discord?: {
    instances: DiscordInstance[];
  };
}

const debug = Debug('app:admin');
export const adminRouter = Router();

// Apply IP whitelist middleware first (blocks unauthorized IPs)
adminRouter.use(ipWhitelist);

// Apply authentication middleware (requires valid JWT token)
adminRouter.use((req, res, next) => {
 Promise.resolve(authenticate(req, res, next)).catch(next);
});

// Apply audit middleware to all admin routes
adminRouter.use((req, res, next) => {
 Promise.resolve(auditMiddleware(req, res, next)).catch(next);
});

function loadPersonas(): Persona[] {
  const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
  const personasDir = path.join(configDir, 'personas');
  const fallback: Persona[] = [
    { key: 'friendly-helper', name: 'Friendly Helper', systemPrompt: 'You are a friendly, concise assistant.' },
    { key: 'dev-assistant', name: 'Dev Assistant', systemPrompt: 'You are a senior engineer. Answer with pragmatic code examples.' },
    { key: 'teacher', name: 'Teacher', systemPrompt: 'Explain concepts clearly with analogies and steps.' },
  ];
  try {
    if (!fs.existsSync(personasDir)) return fallback;
    const out: Persona[] = [];
    for (const file of fs.readdirSync(personasDir)) {
      if (!file.endsWith('.json')) continue;
      try {
        const raw = fs.readFileSync(path.join(personasDir, file), 'utf8');
        const data = JSON.parse(raw) as unknown;
        if (data && typeof data === 'object' && 'key' in data && 'name' in data && 'systemPrompt' in data && typeof (data as Persona).key === 'string' && typeof (data as Persona).name === 'string' && typeof (data as Persona).systemPrompt === 'string') {
          out.push(data as Persona);
        }
      } catch (e) {
        debug('Invalid persona file:', file, e);
      }
    }
    return out.length ? out : fallback;
  } catch (e) {
    debug('Failed loading personas', e);
    return fallback;
  }
}

adminRouter.get('/status', (req: Request, res: Response) => {
  (async () => {
    try {
      const slack = SlackService.getInstance();
      const slackBots = slack.getBotNames();
      const slackInfo = slackBots.map((name: string) => {
        const cfg: SlackBotConfig = slack.getBotConfig(name) || {};
        return {
          provider: 'slack',
          name,
          defaultChannel: cfg.slack?.defaultChannelId ?? '',
          mode: cfg.slack?.mode ?? 'socket',
        };
      });
      let discordBots: string[] = [];
      let discordInfo: Array<{ provider: string; name: string }> = [];
      try {
        const ds = (Discord as unknown as { DiscordService: { getInstance: () => { getAllBots: () => DiscordBot[] } } }).DiscordService.getInstance();
        const bots: DiscordBot[] = ds.getAllBots?.() ?? [];
        discordBots = bots.map((b) => b?.botUserName ?? b?.config?.name ?? 'discord');
        discordInfo = bots.map((b) => ({ provider: 'discord', name: b?.botUserName ?? b?.config?.name ?? 'discord' }));
      } catch {}
      res.json({ ok: true, slackBots, discordBots, discordCount: discordBots.length, slackInfo, discordInfo });
    } catch {
      res.json({ ok: true, bots: [] });
    }
  })().catch((err) => {
    debug('Status route error', err);
    res.status(500).json({ ok: false, error: 'Internal error' });
  });
});

adminRouter.get('/personas', (req: Request, res: Response) => {
  res.json({ ok: true, personas: loadPersonas() });
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
    helpText: 'Create a Slack app, enable Socket Mode or Events, and generate the bot and app tokens.',
  },
  {
    key: 'mattermost',
    label: 'Mattermost',
    docsUrl: 'https://developers.mattermost.com/integrate/admin-guide/admin-bot-accounts/',
    helpText: 'Create a Mattermost bot account and generate a personal access token for it.',
  },
];

adminRouter.get('/llm-providers', (req: Request, res: Response) => {
  res.json({ ok: true, providers: LLM_PROVIDERS });
});

adminRouter.get('/messenger-providers', (req: Request, res: Response) => {
  res.json({ ok: true, providers: MESSENGER_PROVIDERS });
});

// Minimal Slack bot creation: supports a single instance add at runtime
adminRouter.post('/slack-bots', requireAdmin, (req: AuditedRequest, res: Response) => {
 (async () => {
   try {
     interface SlackBotBody {
       name: string;
       botToken: string;
       signingSecret: string;
       appToken?: string;
       defaultChannelId?: string;
       joinChannels?: string;
       mode?: string;
       llm?: unknown;
     }
     const { name, botToken, signingSecret, appToken, defaultChannelId, joinChannels, mode, llm }: SlackBotBody = req.body || {};
     if (!name || !botToken || !signingSecret) {
       logAdminAction(req, 'CREATE_SLACK_BOT', `slack-bots/${name}`, 'failure', 'Missing required fields: name, botToken, signingSecret');
       return res.status(400).json({ ok: false, error: 'name, botToken, and signingSecret are required' });
     }

     // Persist to config/providers/messengers.json for demo persistence
     const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
     const messengersPath = path.join(configDir, 'messengers.json');
     let cfg: MessengersConfig = { slack: { instances: [] } };
     try {
       if (fs.existsSync(messengersPath)) {
         const raw = fs.readFileSync(messengersPath, 'utf8');
         cfg = JSON.parse(raw) as MessengersConfig;
       }
     } catch (e) {
       debug('Failed reading messengers.json, starting fresh', e);
     }
     cfg.slack ??= { instances: [] };
     cfg.slack.mode ??= (mode || 'socket');
     cfg.slack.instances.push({ name, token: botToken, signingSecret, appToken, defaultChannelId, joinChannels, mode, llm } as BotInstance);

     try {
       fs.mkdirSync(path.dirname(messengersPath), { recursive: true });
       fs.writeFileSync(messengersPath, JSON.stringify(cfg, null, 2), 'utf8');
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
           appToken: appToken ?? '',
           defaultChannelId: defaultChannelId ?? '',
           joinChannels: joinChannels ?? '',
           mode: mode ?? 'socket'
         },
         llm
       };
       const addBot = (slack as { addBot?: (cfg: unknown) => Promise<void> }).addBot;
       if (addBot) {
         await addBot(instanceCfg);
       }
     } catch (e) {
       debug('Runtime addBot failed (continue, config was persisted):', e);
     }

     logAdminAction(req, 'CREATE_SLACK_BOT', `slack-bots/${name}`, 'success', `Created Slack bot ${name} with token and configuration`);
     res.json({ ok: true });
   } catch (e: unknown) {
     const errorMsg = e instanceof Error ? e.message : String(e);
     const body = req.body as { name?: string };
     logAdminAction(req, 'CREATE_SLACK_BOT', `slack-bots/${body.name || 'unknown'}`, 'failure', `Failed to create Slack bot: ${errorMsg}`);
     res.status(500).json({ ok: false, error: errorMsg });
   }
 })().catch((err) => {
   debug('Slack bot creation error', err);
   res.status(500).json({ ok: false, error: 'Internal error' });
 });
});

export default adminRouter;

// Discord admin routes
adminRouter.post('/discord-bots', requireAdmin, (req: AuditedRequest, res: Response) => {
 (async () => {
   try {
     interface DiscordBotBody {
       name?: string;
       token: string;
       llm?: unknown;
     }
     const { name, token, llm }: DiscordBotBody = req.body || {};
     if (!token) {
       logAdminAction(req, 'CREATE_DISCORD_BOT', `discord-bots/${name || 'unnamed'}`, 'failure', 'Missing required field: token');
       return res.status(400).json({ ok: false, error: 'token is required' });
     }

     const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
     const messengersPath = path.join(configDir, 'messengers.json');
     let cfg: MessengersConfig = { discord: { instances: [] } };
     try {
       if (fs.existsSync(messengersPath)) {
         const raw = fs.readFileSync(messengersPath, 'utf8');
         cfg = JSON.parse(raw) as MessengersConfig;
       }
     } catch (e) {
       debug('Failed reading messengers.json, starting fresh', e);
     }
     cfg.discord ??= { instances: [] };
     cfg.discord.instances.push({ name: name ?? '', token, llm } as DiscordInstance);

     try {
       fs.mkdirSync(path.dirname(messengersPath), { recursive: true });
       fs.writeFileSync(messengersPath, JSON.stringify(cfg, null, 2), 'utf8');
     } catch (e) {
       debug('Failed writing messengers.json', e);
     }

     // Try runtime add
     try {
       const ds = (Discord as unknown as { DiscordService: { getInstance: () => { addBot?: (cfg: unknown) => Promise<void>; getAllBots?: () => DiscordBot[] } } }).DiscordService.getInstance();
       const instanceCfg = { name: name ?? '', token, llm };
       const addBot = ds.addBot;
       if (addBot) {
         await addBot(instanceCfg);
         logAdminAction(req, 'CREATE_DISCORD_BOT', `discord-bots/${name ?? 'unnamed'}`, 'success', `Created Discord bot ${name ?? 'unnamed'} with runtime initialization`);
         res.json({ ok: true, note: 'Added and saved.' });
         return;
       }
     } catch (e) {
       debug('Discord runtime add failed; config persisted:', e);
     }
     logAdminAction(req, 'CREATE_DISCORD_BOT', `discord-bots/${name ?? 'unnamed'}`, 'success', `Created Discord bot ${name ?? 'unnamed'} (requires restart for initialization)`);
     res.json({ ok: true, note: 'Saved. Restart app to initialize Discord bot.' });
   } catch (e: unknown) {
     const errorMsg = e instanceof Error ? e.message : String(e);
     const body = req.body as { name?: string };
     logAdminAction(req, 'CREATE_DISCORD_BOT', `discord-bots/${body.name ?? 'unnamed'}`, 'failure', `Failed to create Discord bot: ${errorMsg}`);
     res.status(500).json({ ok: false, error: errorMsg });
   }
 })().catch((err) => {
   debug('Discord bot creation error', err);
   res.status(500).json({ ok: false, error: 'Internal error' });
 });
});


// Reload bots from messengers.json (adds missing instances for Slack and Discord)
adminRouter.post('/reload', requireAdmin, (req: AuditedRequest, res: Response) => {
(async () => {
  try {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
    const messengersPath = path.join(configDir, 'messengers.json');
    if (!fs.existsSync(messengersPath)) {
      return res.status(400).json({ ok: false, error: 'messengers.json not found' });
    }
    const raw = fs.readFileSync(messengersPath, 'utf8');
    const cfg: MessengersConfig = JSON.parse(raw) as MessengersConfig;
    let addedSlack = 0;
    let addedDiscord = 0;
    try {
      const slack = SlackService.getInstance();
      const existing = new Set(slack.getBotNames());
      const instances: BotInstance[] = cfg.slack?.instances ?? [];
      for (const inst of instances) {
        const nm = inst.name ?? '';
        if (nm && !existing.has(nm)) {
          const addBot = (slack as { addBot?: (cfg: unknown) => Promise<void> }).addBot;
          if (addBot) {
            await addBot({
              name: nm,
              slack: {
                botToken: inst.token,
                signingSecret: inst.signingSecret ?? '',
                mode: cfg.slack?.mode ?? 'socket',
              }
            });
          }
          addedSlack++;
        }
      }
    } catch (e) {
      debug('Slack reload error', e);
    }

    try {
      const ds = (Discord as unknown as { DiscordService: { getInstance: () => { addBot?: (cfg: unknown) => Promise<void>; getAllBots?: () => DiscordBot[] } } }).DiscordService.getInstance();
      const bots: DiscordBot[] = ds.getAllBots?.() ?? [];
      const have = new Set(bots.map(b => b?.config?.discord?.token ?? b?.config?.token ?? ''));
      const instances: DiscordInstance[] = cfg.discord?.instances ?? [];
      for (const inst of instances) {
        if (inst.token && !have.has(inst.token)) {
          const addBot = ds.addBot;
          if (addBot) {
            await addBot({ name: inst.name ?? '', token: inst.token });
          }
          addedDiscord++;
        }
      }
    } catch (e) {
      debug('Discord reload error', e);
    }

    logAdminAction(req, 'RELOAD_BOTS', 'bots/reload', 'success', `Reloaded bots from messengers.json: ${addedSlack} Slack bots, ${addedDiscord} Discord bots added`);
    res.json({ ok: true, addedSlack, addedDiscord });
  } catch (e: unknown) {
    const errorMsg = e instanceof Error ? e.message : String(e);
    logAdminAction(req, 'RELOAD_BOTS', 'bots/reload', 'failure', `Failed to reload bots: ${errorMsg}`);
    res.status(500).json({ ok: false, error: errorMsg });
  }
})().catch((err) => {
  debug('Reload bots error', err);
  res.status(500).json({ ok: false, error: 'Internal error' });
});
});
