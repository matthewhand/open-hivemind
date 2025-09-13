import { Router, Request, Response } from 'express';
import Debug from 'debug';
import fs from 'fs';
import path from 'path';
import SlackService from '@integrations/slack/SlackService';
import { Discord } from '@integrations/discord/DiscordService';
import { auditMiddleware, AuditedRequest, logAdminAction } from '../webui/middleware/audit';
import { ipWhitelist } from '../webui/middleware/security';
import { authenticate, requireAdmin } from '../auth/middleware';
import { AuthMiddlewareRequest } from '../auth/types';

const debug = Debug('app:admin');
export const adminRouter = Router();

// Apply IP whitelist middleware first (blocks unauthorized IPs)
adminRouter.use(ipWhitelist);

// Apply authentication middleware (requires valid JWT token)
adminRouter.use(authenticate);

// Apply audit middleware to all admin routes
adminRouter.use(auditMiddleware);

function loadPersonas(): Array<{ key: string; name: string; systemPrompt: string }> {
  const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
  const personasDir = path.join(configDir, 'personas');
  const fallback = [
    { key: 'friendly-helper', name: 'Friendly Helper', systemPrompt: 'You are a friendly, concise assistant.' },
    { key: 'dev-assistant', name: 'Dev Assistant', systemPrompt: 'You are a senior engineer. Answer with pragmatic code examples.' },
    { key: 'teacher', name: 'Teacher', systemPrompt: 'Explain concepts clearly with analogies and steps.' },
  ];
  try {
    if (!fs.existsSync(personasDir)) return fallback;
    const out: any[] = [];
    for (const file of fs.readdirSync(personasDir)) {
      if (!file.endsWith('.json')) continue;
      try {
        const data = JSON.parse(fs.readFileSync(path.join(personasDir, file), 'utf8'));
        if (data && data.key && data.name && typeof data.systemPrompt === 'string') out.push(data);
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
      const bots = ((ds.getAllBots?.() || []) as any[]);
      discordBots = bots.map((b: any) => b?.botUserName || b?.config?.name || 'discord');
      discordInfo = bots.map((b: any) => ({ provider: 'discord', name: b?.botUserName || b?.config?.name || 'discord' }));
    } catch {}
    res.json({ ok: true, slackBots, discordBots, discordCount: discordBots.length, slackInfo, discordInfo });
  } catch {
    res.json({ ok: true, bots: [] });
  }
});

adminRouter.get('/personas', (_req: Request, res: Response) => {
  res.json({ ok: true, personas: loadPersonas() });
});

// Minimal Slack bot creation: supports a single instance add at runtime
adminRouter.post('/slack-bots', requireAdmin, async (req: AuditedRequest, res: Response) => {
  try {
    const { name, botToken, signingSecret, appToken, defaultChannelId, joinChannels, mode, llm } = req.body || {};
    if (!name || !botToken || !signingSecret) {
      logAdminAction(req, 'CREATE_SLACK_BOT', `slack-bots/${name}`, 'failure', 'Missing required fields: name, botToken, signingSecret');
      return res.status(400).json({ ok: false, error: 'name, botToken, and signingSecret are required' });
    }

    // Persist to config/providers/messengers.json for demo persistence
    const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
    const messengersPath = path.join(configDir, 'messengers.json');
    let cfg: any = { slack: { instances: [] } };
    try {
      if (fs.existsSync(messengersPath)) {
        cfg = JSON.parse(fs.readFileSync(messengersPath, 'utf8'));
      }
    } catch (e) {
      debug('Failed reading messengers.json, starting fresh', e);
    }
    cfg.slack = cfg.slack || {};
    cfg.slack.mode = cfg.slack.mode || (mode || 'socket');
    cfg.slack.instances = cfg.slack.instances || [];
    cfg.slack.instances.push({ name, token: botToken, signingSecret, llm });

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
          appToken: appToken || '',
          defaultChannelId: defaultChannelId || '',
          joinChannels: joinChannels || '',
          mode: mode || 'socket'
        },
        llm
      };
      await (slack as any).addBot?.(instanceCfg);
    } catch (e) {
      debug('Runtime addBot failed (continue, config was persisted):', e);
    }

    logAdminAction(req, 'CREATE_SLACK_BOT', `slack-bots/${name}`, 'success', `Created Slack bot ${name} with token and configuration`);
    res.json({ ok: true });
  } catch (e: any) {
    logAdminAction(req, 'CREATE_SLACK_BOT', `slack-bots/${req.body?.name || 'unknown'}`, 'failure', `Failed to create Slack bot: ${e?.message || String(e)}`);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

export default adminRouter;

// Discord admin routes
adminRouter.post('/discord-bots', requireAdmin, async (req: AuditedRequest, res: Response) => {
  try {
    const { name, token, llm } = req.body || {};
    if (!token) {
      logAdminAction(req, 'CREATE_DISCORD_BOT', `discord-bots/${name || 'unnamed'}`, 'failure', 'Missing required field: token');
      return res.status(400).json({ ok: false, error: 'token is required' });
    }

    const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
    const messengersPath = path.join(configDir, 'messengers.json');
    let cfg: any = { discord: { instances: [] } };
    try {
      if (fs.existsSync(messengersPath)) {
        cfg = JSON.parse(fs.readFileSync(messengersPath, 'utf8'));
      }
    } catch (e) {
      debug('Failed reading messengers.json, starting fresh', e);
    }
    cfg.discord = cfg.discord || {};
    cfg.discord.instances = cfg.discord.instances || [];
    cfg.discord.instances.push({ name: name || '', token, llm });

    try {
      fs.mkdirSync(path.dirname(messengersPath), { recursive: true });
      fs.writeFileSync(messengersPath, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (e) {
      debug('Failed writing messengers.json', e);
    }

    // Try runtime add
    try {
      const ds = (Discord as any).DiscordService.getInstance();
      const instanceCfg = { name: name || '', token, llm };
      await ds.addBot?.(instanceCfg);
      logAdminAction(req, 'CREATE_DISCORD_BOT', `discord-bots/${name || 'unnamed'}`, 'success', `Created Discord bot ${name || 'unnamed'} with runtime initialization`);
      res.json({ ok: true, note: 'Added and saved.' });
      return;
    } catch (e) {
      debug('Discord runtime add failed; config persisted:', e);
    }
    logAdminAction(req, 'CREATE_DISCORD_BOT', `discord-bots/${name || 'unnamed'}`, 'success', `Created Discord bot ${name || 'unnamed'} (requires restart for initialization)`);
    res.json({ ok: true, note: 'Saved. Restart app to initialize Discord bot.' });
  } catch (e: any) {
    logAdminAction(req, 'CREATE_DISCORD_BOT', `discord-bots/${req.body?.name || 'unnamed'}`, 'failure', `Failed to create Discord bot: ${e?.message || String(e)}`);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});


// Reload bots from messengers.json (adds missing instances for Slack and Discord)
adminRouter.post('/reload', requireAdmin, async (req: AuditedRequest, res: Response) => {
  try {
    const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
    const messengersPath = path.join(configDir, 'messengers.json');
    if (!fs.existsSync(messengersPath)) {
      return res.status(400).json({ ok: false, error: 'messengers.json not found' });
    }
    const cfg = JSON.parse(fs.readFileSync(messengersPath, 'utf8'));
    let addedSlack = 0;
    let addedDiscord = 0;
    try {
      const slack = SlackService.getInstance();
      const existing = new Set(slack.getBotNames());
      const instances = (cfg.slack?.instances || []);
      for (const inst of instances) {
        const nm = inst.name || '';
        if (!nm || !existing.has(nm)) {
          await (slack as any).addBot?.({
            name: nm || `Bot${Date.now()}`,
            slack: {
              botToken: inst.token,
              signingSecret: inst.signingSecret || '',
              mode: cfg.slack?.mode || 'socket',
            }
          });
          addedSlack++;
        }
      }
    } catch (e) {
      debug('Slack reload error', e);
    }

    try {
      const ds = (Discord as any).DiscordService.getInstance();
      const have = new Set(((ds.getAllBots?.() || []) as any[]).map(b => b?.config?.discord?.token || b?.config?.token));
      const instances = (cfg.discord?.instances || []);
      for (const inst of instances) {
        if (inst.token && !have.has(inst.token)) {
          await ds.addBot?.({ name: inst.name || '', token: inst.token });
          addedDiscord++;
        }
      }
    } catch (e) {
      debug('Discord reload error', e);
    }

    logAdminAction(req, 'RELOAD_BOTS', 'bots/reload', 'success', `Reloaded bots from messengers.json: ${addedSlack} Slack bots, ${addedDiscord} Discord bots added`);
    res.json({ ok: true, addedSlack, addedDiscord });
  } catch (e: any) {
    logAdminAction(req, 'RELOAD_BOTS', 'bots/reload', 'failure', `Failed to reload bots: ${e?.message || String(e)}`);
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});
