import { Router, type Request, type Response } from 'express';
import { getAgent, listAgents } from '@hivemind/llm-letta';
import { isSafeUrl } from '../../utils/ssrfGuard';

const router = Router();

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

    if (!apiKey) {
      return res.status(400).json({
        error: 'Missing API key',
        message:
          'Please provide Letta API key via x-letta-api-key header or apiKey query parameter',
      });
    }

    const isLocalAllowed =
      process.env.LETTA_ALLOW_LOCAL === 'true' || process.env.ALLOW_LOCAL_NETWORK_ACCESS === 'true';

    try {
      const parsedUrl = new URL(apiUrl);
      const hostname = parsedUrl.hostname;

      const isAllowedDomain = hostname === 'letta.com' || hostname.endsWith('.letta.com');

      if (!isLocalAllowed && !isAllowedDomain) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Invalid Letta API URL domain. Must be letta.com or a subdomain.',
        });
      }
    } catch {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid API URL format.',
      });
    }

    if (!isLocalAllowed && !(await isSafeUrl(apiUrl))) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid Letta API URL.',
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

    if (!apiKey) {
      return res.status(400).json({
        error: 'Missing API key',
        message:
          'Please provide Letta API key via x-letta-api-key header or apiKey query parameter',
      });
    }

    const isLocalAllowed =
      process.env.LETTA_ALLOW_LOCAL === 'true' || process.env.ALLOW_LOCAL_NETWORK_ACCESS === 'true';

    try {
      const parsedUrl = new URL(apiUrl);
      const hostname = parsedUrl.hostname;

      const isAllowedDomain = hostname === 'letta.com' || hostname.endsWith('.letta.com');

      if (!isLocalAllowed && !isAllowedDomain) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Invalid Letta API URL domain. Must be letta.com or a subdomain.',
        });
      }
    } catch {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid API URL format.',
      });
    }

    if (!isLocalAllowed && !(await isSafeUrl(apiUrl))) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Invalid Letta API URL.',
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
