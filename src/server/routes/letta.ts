import { Router, type Request, type Response } from 'express';
import { getAgent, listAgents } from '@hivemind/llm-letta';
import { createLogger } from '@src/common/StructuredLogger';

const router = Router();
const logger = createLogger('routes:letta');

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

    const agents = await listAgents(apiKey, apiUrl);
    return res.json(agents);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      'Letta agents lookup error:',
      error instanceof Error ? error : new Error(String(error))
    );
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

    const agent = await getAgent(id, apiKey, apiUrl);
    return res.json(agent);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    logger.error(
      'Letta agent details error:',
      error instanceof Error ? error : new Error(String(error))
    );
    return res.status(500).json({
      error: 'Letta API Error',
      message,
    });
  }
});

export default router;
