import Debug from 'debug';
import { Router, type Request, type Response } from 'express';
import { HTTP_STATUS } from '../../../types/constants';

const router = Router();
const debug = Debug('app:admin:provider-health');

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Status = 'healthy' | 'degraded' | 'down';
type CircuitBreakerState = 'closed' | 'open' | 'half-open';

interface LatencyPercentiles {
  p50: number;
  p95: number;
  p99: number;
}

interface ProviderHealth {
  key: string;
  name: string;
  type: string;
  status: Status;
  latency: LatencyPercentiles;
  errorRate: number;
  uptime: number;
  lastCheck: string;
  circuitBreaker: CircuitBreakerState;
  suggestedFallback: string;
}

interface ProviderHealthResponse {
  llm: ProviderHealth[];
  memory: ProviderHealth[];
  message: ProviderHealth[];
  tool: ProviderHealth[];
}

// ---------------------------------------------------------------------------
// Mock data generator
// ---------------------------------------------------------------------------

function nowISO(): string {
  return new Date().toISOString();
}

/**
 * Returns simulated provider health data.
 * Replace this function with real metrics collection once a metrics backend
 * (e.g. Prometheus, custom counters) is wired up.
 */
function getMockProviderHealth(): ProviderHealthResponse {
  return {
    llm: [
      {
        key: 'openai-main',
        name: 'OpenAI Production',
        type: 'openai',
        status: 'healthy',
        latency: { p50: 240, p95: 480, p99: 820 },
        errorRate: 0.02,
        uptime: 99.97,
        lastCheck: nowISO(),
        circuitBreaker: 'closed',
        suggestedFallback: 'anthropic — 99.8 % uptime, 120 ms p95',
      },
      {
        key: 'anthropic-alt',
        name: 'Anthropic Fallback',
        type: 'anthropic',
        status: 'healthy',
        latency: { p50: 120, p95: 260, p99: 410 },
        errorRate: 0.01,
        uptime: 99.98,
        lastCheck: nowISO(),
        circuitBreaker: 'closed',
        suggestedFallback: 'openai-main — 99.97 % uptime, 480 ms p95',
      },
      {
        key: 'openrouter',
        name: 'OpenRouter',
        type: 'openrouter',
        status: 'degraded',
        latency: { p50: 580, p95: 1200, p99: 2400 },
        errorRate: 0.12,
        uptime: 97.4,
        lastCheck: nowISO(),
        circuitBreaker: 'half-open',
        suggestedFallback: 'anthropic-alt — 99.98 % uptime, 260 ms p95',
      },
    ],
    memory: [
      {
        key: 'mem0-prod',
        name: 'Mem0 Production',
        type: 'mem0',
        status: 'healthy',
        latency: { p50: 45, p95: 90, p99: 180 },
        errorRate: 0.005,
        uptime: 99.99,
        lastCheck: nowISO(),
        circuitBreaker: 'closed',
        suggestedFallback: 'mem4ai — 99.95 % uptime, 55 ms p95',
      },
      {
        key: 'mem4ai',
        name: 'Mem4AI',
        type: 'mem4ai',
        status: 'healthy',
        latency: { p50: 55, p95: 110, p99: 210 },
        errorRate: 0.008,
        uptime: 99.95,
        lastCheck: nowISO(),
        circuitBreaker: 'closed',
        suggestedFallback: 'mem0-prod — 99.99 % uptime, 90 ms p95',
      },
    ],
    message: [
      {
        key: 'discord-bot',
        name: 'Discord Bot',
        type: 'discord',
        status: 'healthy',
        latency: { p50: 15, p95: 45, p99: 120 },
        errorRate: 0.003,
        uptime: 99.99,
        lastCheck: nowISO(),
        circuitBreaker: 'closed',
        suggestedFallback: 'slack-bot — 99.97 % uptime, 30 ms p95',
      },
      {
        key: 'slack-bot',
        name: 'Slack Bot',
        type: 'slack',
        status: 'healthy',
        latency: { p50: 30, p95: 65, p99: 150 },
        errorRate: 0.006,
        uptime: 99.97,
        lastCheck: nowISO(),
        circuitBreaker: 'closed',
        suggestedFallback: 'discord-bot — 99.99 % uptime, 45 ms p95',
      },
      {
        key: 'mattermost-bot',
        name: 'Mattermost Bot',
        type: 'mattermost',
        status: 'down',
        latency: { p50: 0, p95: 0, p99: 0 },
        errorRate: 1.0,
        uptime: 85.2,
        lastCheck: nowISO(),
        circuitBreaker: 'open',
        suggestedFallback: 'discord-bot — 99.99 % uptime, 45 ms p95',
      },
    ],
    tool: [
      {
        key: 'mcp-filesystem',
        name: 'MCP Filesystem',
        type: 'mcp',
        status: 'healthy',
        latency: { p50: 10, p95: 30, p99: 80 },
        errorRate: 0.001,
        uptime: 99.99,
        lastCheck: nowISO(),
        circuitBreaker: 'closed',
        suggestedFallback: 'None configured',
      },
      {
        key: 'mcp-fetch',
        name: 'MCP Fetch',
        type: 'mcp',
        status: 'healthy',
        latency: { p50: 180, p95: 400, p99: 750 },
        errorRate: 0.04,
        uptime: 99.5,
        lastCheck: nowISO(),
        circuitBreaker: 'closed',
        suggestedFallback: 'mcp-filesystem — 99.99 % uptime, 30 ms p95',
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Route
// ---------------------------------------------------------------------------

/**
 * GET /api/admin/provider-health
 *
 * Returns mock health data for all configured providers.
 * Replace mock data with real metrics once a collection pipeline exists.
 */
router.get('/provider-health', (_req: Request, res: Response) => {
  try {
    const data = getMockProviderHealth();
    debug('Returning provider health data');
    return res.json({
      success: true,
      data,
    });
  } catch (error) {
    debug('Error generating provider health: %s', (error as Error).message);
    return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
      success: false,
      error: 'Failed to retrieve provider health data',
      code: 'PROVIDER_HEALTH_ERROR',
      message: (error as Error).message || 'An error occurred while retrieving provider health',
    });
  }
});

export default router;
