import { Router, type Request, type Response } from 'express';
import { getAgent, listAgents } from '@hivemind/llm-letta';
import { isSafeUrl } from '@hivemind/shared-types';

const router = Router();

/**
 * Validates the Letta API URL against an allowlist and SSRF protection.
 */
async function validateLettaUrl(url: string): Promise<{ isValid: boolean; error?: string }> {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // 1. Strict allowlist for Letta cloud
    const isLettaCloud = hostname === 'api.letta.com' || hostname.endsWith('.letta.com');

    // 2. Allow local network if explicitly enabled
    const allowLocal = process.env.ALLOW_LOCAL_NETWORK_ACCESS === 'true' || process.env.LETTA_ALLOW_LOCAL === 'true';

    if (!isLettaCloud && !allowLocal) {
      return {
        isValid: false,
        error: 'Target URL is not in the allowlist. Only *.letta.com is allowed by default.',
      };
    }

    // 3. General SSRF protection (IP-based checks)
    if (!(await isSafeUrl(url))) {
      return {
        isValid: false,
        error: 'Target URL is blocked for security reasons (private/local network access).',
      };
    }

    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Invalid URL format' };
  }
}

/**
 * GET /api/letta/agents - List available Letta agents
 * This endpoint proxies the request to Letta API using the provided credentials
 */
router.get('/agents', async (req: Request, res: Response) => {
  try {
    // Get credentials from query params or headers
    const apiKey = (req.headers['x-letta-api-key'] as string) || (req.query.apiKey as string);
    const apiUrl =
      (req.headers['x-letta-api-url'] as string) ||
      (req.query.apiUrl as string) ||
      'https://api.letta.com/v1';

    // Security Check: SSRF Protection & Allowlist
    const validation = await validateLettaUrl(apiUrl);
    if (!validation.isValid) {
      return res.status(403).json({
        error: 'Security Warning',
        message: validation.error,
      });
    }

    if (!apiKey) {
      return res.status(400).json({
        error: 'Missing API key',
        message:
          'Please provide Letta API key via x-letta-api-key header or apiKey query parameter',
      });
    }

    const agents = await listAgents(apiKey, apiUrl);
    return res.json(agents);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Letta agents lookup error:', error);
    return res.status(500).json({
      error: 'Letta API Error',
      message,
    });
  }
});

/**
 * GET /api/letta/agents/:id - Get a specific agent details
 */
router.get('/agents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const apiKey = (req.headers['x-letta-api-key'] as string) || (req.query.apiKey as string);
    const apiUrl =
      (req.headers['x-letta-api-url'] as string) ||
      (req.query.apiUrl as string) ||
      'https://api.letta.com/v1';

    // Security Check: SSRF Protection & Allowlist
    const validation = await validateLettaUrl(apiUrl);
    if (!validation.isValid) {
      return res.status(403).json({
        error: 'Security Warning',
        message: validation.error,
      });
    }

    if (!apiKey) {
      return res.status(400).json({
        error: 'Missing API key',
        message:
          'Please provide Letta API key via x-letta-api-key header or apiKey query parameter',
      });
    }

    const agent = await getAgent(id, apiKey, apiUrl);
    return res.json(agent);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Letta agent details error:', error);
    return res.status(500).json({
      error: 'Letta API Error',
      message,
    });
  }
});

export default router;
