import { Router, Request, Response } from 'express';
import Debug from 'debug';
import fs from 'fs';
import path from 'path';
import SlackService from '@integrations/slack/SlackService';

const debug = Debug('app:admin');
export const adminRouter = Router();

// Simple in-memory personas list for demo; can be moved to config/personas later
const personas = [
  { key: 'friendly-helper', name: 'Friendly Helper', systemPrompt: 'You are a friendly, concise assistant.' },
  { key: 'dev-assistant', name: 'Dev Assistant', systemPrompt: 'You are a senior engineer. Answer with pragmatic code examples.' },
  { key: 'teacher', name: 'Teacher', systemPrompt: 'Explain concepts clearly with analogies and steps.' },
];

adminRouter.get('/status', (_req: Request, res: Response) => {
  try {
    const slack = SlackService.getInstance();
    const bots = slack.getBotNames();
    res.json({ ok: true, bots });
  } catch {
    res.json({ ok: true, bots: [] });
  }
});

adminRouter.get('/personas', (_req: Request, res: Response) => {
  res.json({ ok: true, personas });
});

// Minimal Slack bot creation: supports a single instance add at runtime
adminRouter.post('/slack-bots', async (req: Request, res: Response) => {
  try {
    const { name, botToken, signingSecret, appToken, defaultChannelId, joinChannels, mode, llm } = req.body || {};
    if (!name || !botToken || !signingSecret) {
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
    cfg.slack.instances.push({ name, token: botToken, signingSecret });

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
        }
      };
      await (slack as any).addBot?.(instanceCfg);
    } catch (e) {
      debug('Runtime addBot failed (continue, config was persisted):', e);
    }

    res.json({ ok: true });
  } catch (e: any) {
    res.status(500).json({ ok: false, error: e?.message || String(e) });
  }
});

export default adminRouter;

