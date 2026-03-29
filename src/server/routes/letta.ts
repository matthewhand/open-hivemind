import dns from 'dns';
import net from 'net';
import { Router, type Request, type Response } from 'express';
import { getAgent, listAgents } from '@hivemind/llm-letta';
import { ErrorResponses } from '../../utils/errorResponse';
import { isPrivateIP, isSafeUrl } from '../../utils/ssrfGuard';
import { ApiResponse } from "../utils/ApiResponse";

const router = Router();

/**
 * Validates the Letta API URL against an allowlist and SSRF protection.
 */
async function validateLettaUrl(url: string): Promise<{ isValid: boolean; error?: string }> {
  try {
    const parsedUrl = new URL(url);
    const hostname = parsedUrl.hostname.toLowerCase();

    // 1. Strict allowlist for Letta cloud (prevent subdomain bypass e.g. letta.com.attacker.com)
    const hostParts = hostname.split('.');
    const isLettaCloud =
      hostParts.length >= 2 &&
      hostParts[hostParts.length - 1] === 'com' &&
      hostParts[hostParts.length - 2] === 'letta';

    // 2. Allow local network if explicitly enabled
    const allowLocal =
      process.env.ALLOW_LOCAL_NETWORK_ACCESS === 'true' || process.env.LETTA_ALLOW_LOCAL === 'true';

    if (!isLettaCloud && !allowLocal) {
      return {
        isValid: false,
        error: 'Target URL is not in the allowlist. Only *.letta.com is allowed by default.',
      };
    }

    // 3. Always block private/reserved IPs regardless of allowLocal
    if (net.isIP(hostname)) {
      if (isPrivateIP(hostname)) {
        return {
          isValid: false,
          error: 'Target URL is blocked for security reasons (private/local network access).',
        };
      }
    } else {
      try {
        const { address } = await dns.promises.lookup(hostname);
        if (isPrivateIP(address)) {
          return {
            isValid: false,
            error: 'Target URL is blocked for security reasons (private/local network access).',
          };
        }
      } catch {
        return { isValid: false, error: 'Target URL hostname could not be resolved.' };
      }
    }

    // 4. For non-local URLs also run full isSafeUrl check
    if (!allowLocal && !(await isSafeUrl(url))) {
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
 */
router.get('/agents', async (req: Request, res: Response) => {
  try {
    const apiKey = req.headers['x-letta-api-key'] as string;
    const apiUrl =
      (req.headers['x-letta-api-url'] as string) ||
      (req.query.apiUrl as string) ||
      'https://api.letta.com/v1';

    if (!apiKey) {
      return ApiResponse.error(res, 'Please provide Letta API key or agent ID via headers', 400);
    }

    const validation = await validateLettaUrl(apiUrl);
    if (!validation.isValid) {
      return ApiResponse.error(res, 'Please provide Letta API key or agent ID via headers', 400);
    }

    const agents = await listAgents(apiKey, apiUrl);
    return res.json(agents);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Letta agents lookup error:', error);
    return ApiResponse.error(res, message, 500);
  }
});

/**
 * GET /api/letta/agents/:id - Get a specific agent details
 */
router.get('/agents/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const apiKey = req.headers['x-letta-api-key'] as string;
    const apiUrl =
      (req.headers['x-letta-api-url'] as string) ||
      (req.query.apiUrl as string) ||
      'https://api.letta.com/v1';

    if (!apiKey) {
      return ApiResponse.error(res, 'Please provide Letta API key or agent ID via headers', 400);
    }

    const validation = await validateLettaUrl(apiUrl);
    if (!validation.isValid) {
      return ApiResponse.error(res, 'Please provide Letta API key or agent ID via headers', 400);
    }

    const agent = await getAgent(id, apiKey, apiUrl);
    return res.json(agent);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Letta agent details error:', error);
    return ApiResponse.error(res, message, 500);
  }
});

export default router;
