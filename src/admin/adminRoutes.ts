import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { ProviderRegistry } from '../registries/ProviderRegistry';
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
    const providers = registry.getByType('messenger');

    let allBots: string[] = [];
    let allInfo: any[] = [];
    let slackBots: string[] = [];
    let slackInfo: any[] = [];
    let discordBots: string[] = [];
    let discordInfo: any[] = [];

    for (const entry of providers) {
        if (entry.instance && entry.instance.getStatus) {
            try {
                const status = await entry.instance.getStatus();
                if (status.ok) {
                    allBots = allBots.concat(status.bots || []);
                    allInfo = allInfo.concat(status.details || []);

                    if (entry.metadata.id === 'slack') {
                        slackBots = status.bots || [];
                        slackInfo = status.details || [];
                    } else if (entry.metadata.id === 'discord') {
                        discordBots = status.bots || [];
                        discordInfo = status.details || [];
                    }
                }
            } catch (e) {
                debug(`Error getting status for ${entry.metadata.id}:`, e);
            }
        }
    }

    res.json({
      ok: true,
      bots: allBots, // Generic list
      // Backward compatibility fields
      slackBots,
      discordBots,
      discordCount: discordBots.length,
      slackInfo,
      discordInfo,
    });
  } catch (e) {
    debug('Status error', e);
    res.json({ ok: true, bots: [] });
  }
});

adminRouter.get('/personas', async (_req: Request, res: Response) => {
  res.json({ ok: true, personas: await loadPersonas() });
});

adminRouter.get('/llm-providers', (_req: Request, res: Response) => {
  const providers = ProviderRegistry.getInstance().getByType('llm');
  const list = providers.map(p => ({
      key: p.metadata.id,
      label: p.metadata.name,
      docsUrl: p.metadata.docsUrl,
      helpText: p.metadata.helpText
  }));
  res.json({ ok: true, providers: list });
});

adminRouter.get('/messenger-providers', (_req: Request, res: Response) => {
  const providers = ProviderRegistry.getInstance().getByType('messenger');
  const list = providers.map(p => ({
      key: p.metadata.id,
      label: p.metadata.name,
      docsUrl: p.metadata.docsUrl,
      helpText: p.metadata.helpText
  }));
  res.json({ ok: true, providers: list });
});

// Generic bot creation endpoint
adminRouter.post('/providers/:type/bots', requireAdmin, async (req: AuditedRequest, res: Response) => {
    const { type } = req.params;
    const registry = ProviderRegistry.getInstance();
    const entry = registry.get(type);

    if (!entry) {
        return res.status(404).json({ ok: false, error: `Provider '${type}' not found` });
    }

    // For Slack/Discord, we maintain backward compatibility with messengers.json persistence
    if (['slack', 'discord'].includes(type)) {
        try {
            const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
            const messengersPath = path.join(configDir, 'messengers.json');
            let cfg: any = {};
            try {
                const fileContent = await fs.promises.readFile(messengersPath, 'utf8');
                cfg = JSON.parse(fileContent);
            } catch (e: any) {
                 // ignore ENOENT
            }

            cfg[type] = cfg[type] || {};
            cfg[type].instances = cfg[type].instances || [];

            // Map request body to config structure
            const { name, token, botToken, signingSecret, llm, ...rest } = req.body;

            const instanceConfig: any = { name, ...rest };
            if (token) instanceConfig.token = token;
            if (botToken) instanceConfig.token = botToken;
            if (signingSecret) instanceConfig.signingSecret = signingSecret;
            if (llm) instanceConfig.llm = llm;

            cfg[type].instances.push(instanceConfig);

            await fs.promises.mkdir(path.dirname(messengersPath), { recursive: true });
            await fs.promises.writeFile(messengersPath, JSON.stringify(cfg, null, 2), 'utf8');

        } catch (e: any) {
            debug(`Failed to persist config for ${type}`, e);
        }
    }

    // Runtime add
    if (entry.instance && entry.instance.addBot) {
        try {
            // Need to adapt body to what addBot expects
            let configToAdd = req.body;

            if (type === 'slack') {
                const { name, botToken, signingSecret, appToken, defaultChannelId, joinChannels, mode, llm } = req.body;
                 configToAdd = {
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
            } else if (type === 'discord') {
                const { name, token, llm } = req.body;
                configToAdd = { name: name || '', token, llm };
            }

            await entry.instance.addBot(configToAdd);

             logAdminAction(
                req,
                `CREATE_${type.toUpperCase()}_BOT`,
                `${type}-bots/${req.body.name}`,
                'success',
                `Created ${type} bot`
            );
            return res.json({ ok: true });

        } catch (e: any) {
             logAdminAction(
                req,
                `CREATE_${type.toUpperCase()}_BOT`,
                `${type}-bots/${req.body.name}`,
                'failure',
                `Failed to create bot: ${e.message}`
            );
            return res.status(500).json({ ok: false, error: e.message });
        }
    } else {
        return res.json({ ok: true, note: 'Configuration saved. Restart required.' });
    }
});

// Backward compatibility routes - mapped to generic one
adminRouter.post('/slack-bots', requireAdmin, async (req: AuditedRequest, res: Response) => {
    req.params.type = 'slack';
    // We need to call the generic handler.
    // Since I defined it inline, I can't call it easily unless I extract it.
    // I'll extract it.
    await handleCreateBot(req, res);
});

adminRouter.post(['/discord-bots'], requireAdmin, async (req: AuditedRequest, res: Response) => {
    req.params.type = 'discord';
    await handleCreateBot(req, res);
});

async function handleCreateBot(req: AuditedRequest, res: Response) {
    const { type } = req.params;
    const registry = ProviderRegistry.getInstance();
    const entry = registry.get(type);

    if (!entry) {
        return res.status(404).json({ ok: false, error: `Provider '${type}' not found` });
    }

    // Persistence Logic (SAME AS ABOVE)
    if (['slack', 'discord'].includes(type)) {
        try {
            const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
            const messengersPath = path.join(configDir, 'messengers.json');
            let cfg: any = {};
            try {
                const fileContent = await fs.promises.readFile(messengersPath, 'utf8');
                cfg = JSON.parse(fileContent);
            } catch (e: any) {}

            cfg[type] = cfg[type] || {};
            cfg[type].instances = cfg[type].instances || [];

            const { name, token, botToken, signingSecret, llm, ...rest } = req.body;
            const instanceConfig: any = { name, ...rest };
            if (token) instanceConfig.token = token;
            if (botToken) instanceConfig.token = botToken;
            if (signingSecret) instanceConfig.signingSecret = signingSecret;
            if (llm) instanceConfig.llm = llm;

            cfg[type].instances.push(instanceConfig);
            await fs.promises.mkdir(path.dirname(messengersPath), { recursive: true });
            await fs.promises.writeFile(messengersPath, JSON.stringify(cfg, null, 2), 'utf8');
        } catch (e: any) { debug('Persistence error', e); }
    }

    // Runtime Add
    if (entry.instance && entry.instance.addBot) {
        try {
            let configToAdd = req.body;
            if (type === 'slack') {
                const { name, botToken, signingSecret, appToken, defaultChannelId, joinChannels, mode, llm } = req.body;
                 configToAdd = {
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
            } else if (type === 'discord') {
                const { name, token, llm } = req.body;
                configToAdd = { name: name || '', token, llm };
            }

            await entry.instance.addBot(configToAdd);

             logAdminAction(
                req,
                `CREATE_${type.toUpperCase()}_BOT`,
                `${type}-bots/${req.body.name}`,
                'success',
                `Created ${type} bot`
            );
            return res.json({ ok: true });
        } catch (e: any) {
             logAdminAction(
                req,
                `CREATE_${type.toUpperCase()}_BOT`,
                `${type}-bots/${req.body.name}`,
                'failure',
                `Failed to create bot: ${e.message}`
            );
            return res.status(500).json({ ok: false, error: e.message });
        }
    } else {
        return res.json({ ok: true, note: 'Configuration saved. Restart required.' });
    }
}

// Generic reload
adminRouter.post('/reload', requireAdmin, async (req: AuditedRequest, res: Response) => {
    const registry = ProviderRegistry.getInstance();
    const providers = registry.getAll();

    let results: any = {};

    try {
        const BotConfigurationManager = require('@src/config/BotConfigurationManager').BotConfigurationManager;
        BotConfigurationManager.getInstance().reload();
    } catch(e) { debug('Failed to reload BotConfigManager', e); }

    for (const entry of providers) {
        if (entry.instance && entry.instance.refresh) {
            try {
                await entry.instance.refresh();
                results[entry.metadata.id] = 'reloaded';
            } catch (e: any) {
                results[entry.metadata.id] = `failed: ${e.message}`;
            }
        }
    }

    logAdminAction(req, 'RELOAD_BOTS', 'bots/reload', 'success', 'Reloaded providers');
    res.json({ ok: true, results });
});

export default adminRouter;
