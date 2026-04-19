import fs from 'fs';
import path from 'path';
import Debug from 'debug';
import { Router, type Request, type Response } from 'express';

const debug = Debug('app:admin:personas');

export const personasRouter = Router();

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

    const results = await Promise.allSettled(promises);
    const out: { key: string; name: string; systemPrompt: string }[] = results
      .map((r) => (r.status === 'fulfilled' ? r.value : null))
      .filter((item): item is { key: string; name: string; systemPrompt: string } => item !== null);

    return out.length ? out : fallback;
  } catch (e) {
    debug('Failed loading personas', e);
    return fallback;
  }
}

personasRouter.get('/personas', async (_req: Request, res: Response) => {
  res.json({ success: true, personas: await loadPersonas() });
});

export { loadPersonas };
