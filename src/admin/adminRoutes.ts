import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { providerRegistry } from '../config/ProviderRegistry';
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
    const providers = providerRegistry.getAll();
    const allBots: any[] = [];

    for (const provider of providers) {
      try {
        const bots = await provider.getBots();
        allBots.push(...bots);
      } catch (e) {
        debug(`Failed to get bots for provider ${provider.getMetadata().id}`, e);
      }
    }

    const slackInfo = allBots.filter((b) => b.provider === 'slack');
    const slackBots = slackInfo.map((b) => b.name);

    const discordInfo = allBots.filter((b) => b.provider === 'discord');
    const discordBots = discordInfo.map((b) => b.name);

    res.json({
      ok: true,
      slackBots,
      discordBots,
      discordCount: discordBots.length,
      slackInfo,
      discordInfo,
      allBots,
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

// Generic Bot Creation
adminRouter.post(
  '/providers/:type/bots',
  requireAdmin,
  async (req: AuditedRequest, res: Response) => {
    try {
      const { type } = req.params;
      const provider = providerRegistry.get(type);

      if (!provider) {
        return res.status(404).json({ ok: false, error: `Provider ${type} not found` });
      }

      if (!provider.addBot) {
        return res
          .status(400)
          .json({ ok: false, error: `Provider ${type} does not support adding bots` });
      }

      const { name } = req.body;

      // Persist to config/messengers.json (legacy persistence)
      const configDir = process.env.NODE_CONFIG_DIR || path.join(__dirname, '../../config');
      const messengersPath = path.join(configDir, 'messengers.json');
      let cfg: any = {};
      try {
        const fileContent = await fs.promises.readFile(messengersPath, 'utf8');
        cfg = JSON.parse(fileContent);
      } catch (e: any) {
        if (e.code !== 'ENOENT') {
          debug('Failed reading messengers.json', e);
        }
      }

      cfg[type] = cfg[type] || {};
      cfg[type].instances = cfg[type].instances || [];
      // Store the config object, or specific fields?
      // For now, store the whole body as it contains token, name, etc.
      // We might want to filter sensitive fields if we were cleaner, but legacy did this.
      cfg[type].instances.push(req.body);

      try {
        await fs.promises.mkdir(path.dirname(messengersPath), { recursive: true });
        await fs.promises.writeFile(messengersPath, JSON.stringify(cfg, null, 2), 'utf8');
      } catch (e) {
        debug('Failed writing messengers.json', e);
      }

      // Runtime add
      try {
        await provider.addBot(req.body);
      } catch (e: any) {
        debug(`Runtime addBot failed for ${type}:`, e);
      }

      logAdminAction(
        req,
        'CREATE_BOT',
        `${type}-bots/${name}`,
        'success',
        `Created ${type} bot ${name}`
      );
      return res.json({ ok: true });
    } catch (e: any) {
      logAdminAction(
        req,
        'CREATE_BOT',
        `${req.params.type}-bots/${req.body?.name || 'unknown'}`,
        'failure',
        `Failed to create bot: ${e?.message || String(e)}`
      );
      return res.status(500).json({ ok: false, error: e?.message || String(e) });
    }
  }
);

export default adminRouter;

// Generic Reload
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

    const results: any = {};

    // Iterate over all registered providers
    const providers = providerRegistry.getAll();
    for (const provider of providers) {
      const type = provider.getMetadata().id;
      const instances = cfg[type]?.instances || [];
      let added = 0;

      if (instances.length > 0 && provider.addBot && provider.getBots) {
        try {
          const currentBots = await provider.getBots();
          const existingNames = new Set(currentBots.map((b) => b.name));

          for (const inst of instances) {
            const name = inst.name || '';
            // Only add if not already existing
            // Note: This logic depends on name uniqueness.
            // Some providers might rely on token uniqueness (like Discord in original code).
            // But let's try to be generic.
            if (!existingNames.has(name)) {
                await provider.addBot(inst);
                added++;
            }
          }
        } catch (e) {
          debug(`Reload error for ${type}`, e);
        }
      }
      results[type] = added;
    }

    logAdminAction(
      req,
      'RELOAD_BOTS',
      'bots/reload',
      'success',
      `Reloaded bots: ${JSON.stringify(results)}`
    );
    return res.json({ ok: true, results });
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
