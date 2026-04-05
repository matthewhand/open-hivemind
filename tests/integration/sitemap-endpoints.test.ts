/**
 * Sitemap Endpoint Regression Tests
 *
 * Tests 16 endpoints that have historically been broken by upstream merges
 * (validation double-prefix, MCP provider ordering, Letta graceful fallback, etc.).
 *
 * These tests mount each router directly on a test Express app, matching the
 * established pattern in tests/api/. Auth middleware is mocked or bypassed
 * so we only test that routes exist and return 2xx.
 */

import express, { type Express } from 'express';
import request from 'supertest';

// ---------------------------------------------------------------------------
// Mock auth middleware used by MCP sub-routes (must be before router imports)
// ---------------------------------------------------------------------------
jest.mock('../../src/auth/middleware', () => ({
  authenticate: jest.fn((_req: any, _res: any, next: any) => {
    _req.user = { userId: 'test-admin', role: 'admin', isAdmin: true };
    next();
  }),
  requireAdmin: jest.fn((_req: any, _res: any, next: any) => {
    next();
  }),
  AuthMiddleware: jest.fn().mockImplementation(() => ({
    authenticate: jest.fn((_req: any, _res: any, next: any) => next()),
    requireAdmin: jest.fn((_req: any, _res: any, next: any) => next()),
  })),
}));

// Mock server-level auth middleware
jest.mock('../../src/server/middleware/auth', () => ({
  authenticateToken: jest.fn((_req: any, _res: any, next: any) => {
    _req.user = { userId: 'test-admin', role: 'admin' };
    next();
  }),
  optionalAuth: jest.fn((_req: any, _res: any, next: any) => next()),
  requirePermission: jest.fn(() => (_req: any, _res: any, next: any) => next()),
  requireRole: jest.fn(() => (_req: any, _res: any, next: any) => next()),
}));

// Mock audit middleware (consolidated router uses it)
jest.mock('../../src/server/middleware/audit', () => ({
  auditMiddleware: jest.fn((_req: any, _res: any, next: any) => next()),
  logAdminAction: jest.fn(),
}));

// ---------------------------------------------------------------------------
// Heavy dependency mocks — keep route handlers from crashing
// ---------------------------------------------------------------------------

jest.mock('../../src/config/ConfigurationManager', () => {
  const mockInstance = {
    getAllSettings: jest.fn().mockReturnValue({}),
    getSetting: jest.fn().mockReturnValue(undefined),
    get: jest.fn().mockReturnValue(undefined),
    getGlobalConfig: jest.fn().mockReturnValue({}),
    reload: jest.fn(),
  };
  return {
    ConfigurationManager: {
      getInstance: jest.fn(() => mockInstance),
      instance: mockInstance,
    },
  };
});

jest.mock('../../src/config/BotConfigurationManager', () => {
  const mockInstance = {
    getAllBots: jest.fn().mockReturnValue([]),
    getWarnings: jest.fn().mockReturnValue([]),
    isLegacyMode: jest.fn().mockReturnValue(false),
    reload: jest.fn(),
    getBot: jest.fn().mockReturnValue(undefined),
    getBotConfig: jest.fn().mockReturnValue(undefined),
    getBotConfigs: jest.fn().mockReturnValue([]),
    getBotCount: jest.fn().mockReturnValue(0),
    getActiveBotCount: jest.fn().mockReturnValue(0),
    getBotNames: jest.fn().mockReturnValue([]),
  };
  return {
    BotConfigurationManager: {
      getInstance: jest.fn(() => mockInstance),
    },
  };
});

jest.mock('../../src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: jest.fn(() => ({
      isConnected: jest.fn().mockReturnValue(true),
      getStats: jest.fn().mockResolvedValue({ totalMessages: 0, totalChannels: 0, providers: {} }),
      getAllBotConfigurations: jest.fn().mockResolvedValue([]),
      getBotMetrics: jest.fn().mockResolvedValue([]),
      getApprovalRequests: jest.fn().mockResolvedValue([]),
    })),
  },
}));

jest.mock('../../src/managers/PersonaManager', () => ({
  PersonaManager: {
    getInstance: jest.fn(() => ({
      getAllPersonas: jest.fn().mockReturnValue([]),
      getPersona: jest.fn().mockReturnValue(undefined),
    })),
  },
}));

// Mock Letta SDK so the router doesn't need a real Letta server
jest.mock('@hivemind/llm-letta', () => ({
  listAgents: jest.fn().mockResolvedValue([]),
  getAgent: jest.fn().mockResolvedValue(null),
}));

// Mock MCP SDK
jest.mock('@modelcontextprotocol/sdk/client/index.js', () => ({
  Client: jest.fn().mockImplementation(() => ({
    connect: jest.fn().mockResolvedValue(undefined),
    close: jest.fn().mockResolvedValue(undefined),
    listTools: jest.fn().mockResolvedValue({ tools: [] }),
  })),
}));

jest.mock('@modelcontextprotocol/sdk/client/stdio.js', () => ({
  StdioClientTransport: jest.fn(),
}));

jest.mock('../../src/server/services/WebSocketService', () => ({
  WebSocketService: {
    getInstance: jest.fn(() => ({
      broadcastConfigChange: jest.fn(),
      broadcast: jest.fn(),
      getAllBotStats: jest.fn().mockReturnValue([]),
    })),
  },
}));

jest.mock('../../src/managers/BotManager', () => ({
  BotManager: {
    getInstance: jest.fn().mockResolvedValue({
      getAllBots: jest.fn().mockResolvedValue([]),
      getBot: jest.fn().mockReturnValue(undefined),
      getBotsStatus: jest.fn().mockResolvedValue([]),
      createBot: jest.fn().mockResolvedValue({ id: 'test' }),
      updateBot: jest.fn().mockResolvedValue(true),
      deleteBot: jest.fn().mockResolvedValue(true),
      startBot: jest.fn().mockResolvedValue(true),
      stopBot: jest.fn().mockResolvedValue(true),
      restartBot: jest.fn().mockResolvedValue(true),
      getBotStatus: jest.fn().mockReturnValue('stopped'),
      reorderBots: jest.fn().mockResolvedValue(true),
    }),
  },
}));

jest.mock('../../src/server/services/ActivityLogger', () => ({
  ActivityLogger: {
    getInstance: jest.fn(() => ({
      log: jest.fn(),
      logActivity: jest.fn(),
    })),
    log: jest.fn(),
  },
}));

jest.mock('../../src/server/services/BotConfigService', () => ({
  BotConfigService: {
    getInstance: jest.fn(() => ({
      getAllBotConfigs: jest.fn().mockResolvedValue([]),
    })),
  },
}));

// ---------------------------------------------------------------------------
// Import routers AFTER mocks
// ---------------------------------------------------------------------------
import healthRouter from '../../src/server/routes/health';
import botsRouter from '../../src/server/routes/bots';
import personasRouter from '../../src/server/routes/personas';
import configRouter from '../../src/server/routes/config';
import mcpRouter from '../../src/server/routes/mcp';
import activityRouter from '../../src/server/routes/activity';
import consolidatedRouter from '../../src/server/routes/consolidated';

// These may fail to import if optional packages are missing; handle gracefully
let validationRouter: any;
let lettaRouter: any;
try {
  validationRouter = require('../../src/server/routes/validation').default;
} catch {
  validationRouter = null;
}
try {
  lettaRouter = require('../../src/server/routes/letta').default;
} catch {
  lettaRouter = null;
}

// ---------------------------------------------------------------------------
// App factory
// ---------------------------------------------------------------------------
function createApp(): Express {
  const app = express();
  app.use(express.json());

  // Mount health at both locations (matching server.ts)
  app.use('/health', healthRouter);
  app.use('/api/health', healthRouter);

  // Protected routes (auth is mocked above)
  app.use('/api/bots', botsRouter);
  app.use('/api/personas', personasRouter);
  app.use('/api/config', configRouter);
  app.use('/api/mcp', mcpRouter);
  app.use('/api/activity', activityRouter);
  app.use('/api/webui', consolidatedRouter);

  if (validationRouter) {
    app.use('/api/validation', validationRouter);
  }
  if (lettaRouter) {
    app.use('/api/letta', lettaRouter);
  }

  return app;
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------
describe('Sitemap Endpoint Regression Tests', () => {
  let app: Express;

  beforeAll(() => {
    process.env.NODE_ENV = 'test';
    app = createApp();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /** Helper: assert response status is in the 2xx range */
  function expect2xx(status: number): void {
    expect(status).toBeGreaterThanOrEqual(200);
    expect(status).toBeLessThan(300);
  }

  // --- Health endpoints (no auth required) ---

  it('GET /health returns 2xx', async () => {
    const res = await request(app).get('/health');
    expect2xx(res.status);
  });

  it('GET /api/health returns 2xx', async () => {
    const res = await request(app).get('/api/health');
    expect2xx(res.status);
  });

  // --- Bots ---

  it('GET /api/bots returns 2xx', async () => {
    const res = await request(app).get('/api/bots');
    expect2xx(res.status);
  });

  // --- Personas ---

  it('GET /api/personas returns 2xx', async () => {
    const res = await request(app).get('/api/personas');
    expect2xx(res.status);
  });

  // --- Config endpoints ---

  it('GET /api/config/ping returns 2xx', async () => {
    const res = await request(app).get('/api/config/ping');
    expect2xx(res.status);
  });

  it('GET /api/config/system-status returns 2xx', async () => {
    const res = await request(app).get('/api/config/system-status');
    expect2xx(res.status);
  });

  it('GET /api/config/env-status returns 2xx', async () => {
    const res = await request(app).get('/api/config/env-status');
    expect2xx(res.status);
  });

  it('GET /api/config/validate-config returns 2xx', async () => {
    const res = await request(app).get('/api/config/validate-config');
    expect2xx(res.status);
  });

  // --- Validation endpoints ---

  const describeValidation = validationRouter ? describe : describe.skip;

  describeValidation('Validation routes', () => {
    it('GET /api/validation returns 2xx', async () => {
      const res = await request(app).get('/api/validation');
      expect2xx(res.status);
    });

    it('GET /api/validation/rules returns 2xx', async () => {
      const res = await request(app).get('/api/validation/rules');
      expect2xx(res.status);
    });

    it('GET /api/validation/statistics returns 2xx', async () => {
      const res = await request(app).get('/api/validation/statistics');
      expect2xx(res.status);
    });
  });

  // --- MCP provider endpoints ---

  it('GET /api/mcp/providers/templates returns 2xx', async () => {
    const res = await request(app).get('/api/mcp/providers/templates');
    expect2xx(res.status);
  });

  it('GET /api/mcp/providers/stats returns 2xx', async () => {
    const res = await request(app).get('/api/mcp/providers/stats');
    expect2xx(res.status);
  });

  // --- Activity ---

  it('GET /api/activity/messages returns 2xx', async () => {
    const res = await request(app).get('/api/activity/messages');
    expect2xx(res.status);
  });

  // --- Letta ---

  const describeLetta = lettaRouter ? describe : describe.skip;

  describeLetta('Letta routes', () => {
    it('GET /api/letta/agents returns 2xx', async () => {
      const res = await request(app).get('/api/letta/agents');
      expect2xx(res.status);
    });
  });

  // --- WebUI ---

  it('GET /api/webui/health returns 2xx', async () => {
    const res = await request(app).get('/api/webui/health');
    expect2xx(res.status);
  });
});
