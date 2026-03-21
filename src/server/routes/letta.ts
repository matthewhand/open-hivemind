import { Router, type Request, type Response } from 'express';
import { getAgent, listAgents } from '@hivemind/llm-letta';
import { isSafeUrl } from '../../utils/ssrfGuard';

const router = Router();

// Apply rate limiting to Letta proxy endpoints
const rateLimit = require('express-rate-limit').default;
const isTestEnv = process.env.NODE_ENV === 'test';
const proxyRateLimit = isTestEnv
  ? (_req: Request, _res: Response, next: any) => next()
  : rateLimit({
      windowMs: 15 * 60 * 1000, // 15 minutes
      max: 100,
      message: 'Too many requests to Letta API, please try again later.',
      standardHeaders: true,
    });

router.use(proxyRateLimit);

async function validateLettaUrl(url: string): Promise<{ isValid: boolean; error?: string }> {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();
    const isTrustedLetta = hostname === 'letta.com' || hostname.endsWith('.letta.com');
    const allowLocal = process.env.ALLOW_LOCAL_NETWORK_ACCESS === 'true' || process.env.LETTA_ALLOW_LOCAL === 'true';

    if (!isTrustedLetta && !allowLocal) {
      console.warn(`[Letta Proxy] Blocked unauthorized domain attempt: ${hostname}`);
      return { isValid: false, error: 'Target URL is not in the allowlist. Only *.letta.com is allowed by default.' };
    }
    if (!(await isSafeUrl(url))) {
      console.warn(`[Letta Proxy] SSRF Guard blocked URL: ${url}`);
      return { isValid: false, error: 'Target URL is blocked for security reasons (private/local network access).' };
    }
    return { isValid: true };
  } catch {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

router.get('/agents', async (req: Request, res: Response) => {
  try {
    const apiKey = (req.headers['x-letta-api-key'] || req.query.apiKey) as string;
    const apiUrlInput = (req.headers['x-letta-api-url'] || req.query.apiUrl) as string;
    const apiUrl = apiUrlInput || 'https://api.letta.com/v1';

    const validation = await validateLettaUrl(apiUrl);
    if (!validation.isValid) return res.status(403).json({ error: 'Security Warning', message: validation.error });

    if (!apiKey) return res.status(400).json({ error: 'Missing API key', message: 'Please provide Letta API key' });

    const agents = await listAgents(apiKey, apiUrl);
    return res.json(agents);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Letta agents lookup error:', error);
    return res.status(500).json({ error: 'Letta API Error', message });
  }
});

router.get('/agents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const apiKey = (req.headers['x-letta-api-key'] || req.query.apiKey) as string;
    const apiUrlInput = (req.headers['x-letta-api-url'] || req.query.apiUrl) as string;
    const apiUrl = apiUrlInput || 'https://api.letta.com/v1';

    const validation = await validateLettaUrl(apiUrl);
    if (!validation.isValid) return res.status(403).json({ error: 'Security Warning', message: validation.error });

    if (!apiKey) return res.status(400).json({ error: 'Missing API key', message: 'Please provide Letta API key' });

    const agent = await getAgent(id, apiKey, apiUrl);
    return res.json(agent);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Letta agent details error:', error);
    return res.status(500).json({ error: 'Letta API Error', message });
  }
});

export default router;
