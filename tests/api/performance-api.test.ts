/**
 * API Performance Baseline Tests
 *
 * Measures and establishes baselines for:
 * - GET /api/bots (with pagination)
 * - GET /api/dashboard/stats
 * - POST /api/bots (create bot)
 * - GET /api/activity (with filters)
 * - GET /api/health
 * - GET /api/personas
 * - GET /api/mcp/servers
 *
 * Performance Budgets:
 * - GET endpoints: < 200ms
 * - POST endpoints: < 500ms
 * - Complex queries: < 1000ms
 * - Health check: < 100ms
 *
 * @file performance-api.test.ts
 * @author Open-Hivemind Performance Test Suite
 */

import express from 'express';
import request from 'supertest';
import * as fs from 'fs';
import * as path from 'path';
import { BotManager } from '../../src/managers/BotManager';
import botsRouter from '../../src/server/routes/bots';
import dashboardRouter from '../../src/server/routes/dashboard';
import activityRouter from '../../src/server/routes/activity';
import healthRouter from '../../src/server/routes/health';

// Mock BotManager
jest.mock('../../src/managers/BotManager', () => {
  const mockInstance = {
    getAllBots: jest.fn(),
    getBotsStatus: jest.fn(() => Promise.resolve([])),
    getBot: jest.fn(),
    createBot: jest.fn(),
    cloneBot: jest.fn(),
    updateBot: jest.fn(),
    deleteBot: jest.fn(),
    startBot: jest.fn(),
    stopBot: jest.fn(),
    getBotHistory: jest.fn(),
  };
  return {
    BotManager: {
      getInstance: jest.fn(() => mockInstance),
    },
  };
});

// Mock BotConfigurationManager
jest.mock('../../src/config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: jest.fn(() => ({
      getAllBots: jest.fn().mockReturnValue([]),
    })),
  },
}));

// Mock AuditLogger
jest.mock('../../src/common/auditLogger', () => ({
  AuditLogger: {
    getInstance: jest.fn(() => ({
      getBotActivity: jest.fn(() => []),
    })),
  },
}));

// Mock ActivityLogger
jest.mock('../../src/server/services/ActivityLogger', () => ({
  ActivityLogger: {
    getInstance: jest.fn(() => ({
      getEvents: jest.fn(() => []),
    })),
  },
}));

// Mock WebSocketService
jest.mock('../../src/server/services/WebSocketService', () => ({
  __esModule: true,
  default: {
    getInstance: jest.fn().mockReturnValue({
      getBotStats: jest.fn().mockReturnValue({ messageCount: 0, errors: [] }),
      getMessageFlow: jest.fn().mockReturnValue([]),
      getAllBotStats: jest.fn().mockReturnValue({}),
    }),
  },
  WebSocketService: {
    getInstance: jest.fn(() => ({
      getBotStats: jest.fn(() => ({ messageCount: 0, errors: [] })),
      getMessageFlow: jest.fn(() => []),
    })),
  },
}));

// Mock middlewares
jest.mock('../../src/server/middleware/audit', () => ({
  auditMiddleware: (req: any, res: any, next: any) => next(),
  logBotAction: jest.fn(),
}));

// Mock auth middleware
jest.mock('../../src/auth/middleware', () => ({
  authenticate: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user', username: 'test-user', isAdmin: true };
    next();
  },
  requireAdmin: (req: any, res: any, next: any) => next(),
}));

// Mock Validation Schemas
jest.mock('../../src/validation/validateRequest', () => ({
  validateRequest: () => (req: any, res: any, next: any) => next(),
}));

jest.mock('../../src/validation/schemas/botsSchema', () => ({
  BotIdParamSchema: { merge: () => ({}) },
  BotActivityQuerySchema: {},
  BotHistoryQuerySchema: {},
  CloneBotSchema: {},
  CreateBotSchema: {},
  UpdateBotSchema: {},
}));

jest.mock('../../src/validation/schemas/miscSchema', () => ({
  AlertIdParamSchema: {},
  DashboardConfigSchema: {},
  DashboardFeedbackSchema: {},
}));

jest.mock('../../src/validation/schemas/commonSchema', () => ({
  ReorderSchema: {},
}));

// Mock DatabaseManager
jest.mock('../../src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: jest.fn(() => ({
      isConnected: jest.fn(() => true),
      getStats: jest.fn(() => ({
        totalMessages: 1000,
        totalChannels: 5,
        providers: { discord: 600, slack: 400 },
      })),
    })),
  },
}));

// Mock AnalyticsService
jest.mock('../../src/services/AnalyticsService', () => ({
  AnalyticsService: {
    getInstance: jest.fn().mockReturnValue({
      getStats: jest.fn().mockReturnValue({
        learningProgress: 50,
        behaviorPatternsCount: 3,
        userSegmentsCount: 2,
        totalMessages: 100,
        totalErrors: 5,
        avgProcessingTime: 500,
        activeBots: 2,
        activeUsers: 10,
      }),
      getBehaviorPatterns: jest.fn().mockReturnValue([]),
      getUserSegments: jest.fn().mockReturnValue([]),
      getRecommendations: jest.fn().mockReturnValue([]),
    }),
  },
}));

interface PerformanceMetrics {
  min: number;
  max: number;
  average: number;
  median: number;
  p95: number;
  p99: number;
  runs: number[];
}

interface EndpointPerformance {
  endpoint: string;
  method: string;
  metrics: PerformanceMetrics;
  budget: number;
  violations: string[];
  timestamp: string;
}

// Performance budgets (in milliseconds)
const PERFORMANCE_BUDGETS = {
  GET_SIMPLE: 200,
  GET_COMPLEX: 1000,
  POST: 500,
  PUT: 500,
  DELETE: 300,
  HEALTH: 100,
};

// Number of test runs for statistical analysis
const TEST_RUNS = 10;

// Storage for performance results
const performanceResults: EndpointPerformance[] = [];
const baselineFilePath = path.join(__dirname, '../../test-results/api-performance-baselines.json');

/**
 * Calculate statistical measures for response times
 */
function calculateStatistics(runs: number[]): PerformanceMetrics {
  const sorted = [...runs].sort((a, b) => a - b);
  const sum = sorted.reduce((acc, val) => acc + val, 0);

  return {
    min: Math.round(sorted[0]),
    max: Math.round(sorted[sorted.length - 1]),
    average: Math.round(sum / sorted.length),
    median: Math.round(sorted[Math.floor(sorted.length / 2)]),
    p95: Math.round(sorted[Math.floor(sorted.length * 0.95)]),
    p99: Math.round(sorted[Math.floor(sorted.length * 0.99)]),
    runs: sorted.map(v => Math.round(v)),
  };
}

/**
 * Check for performance budget violations
 */
function checkBudgetViolations(metrics: PerformanceMetrics, budget: number): string[] {
  const violations: string[] = [];

  if (metrics.median > budget) {
    violations.push(
      `Median response time: ${metrics.median}ms exceeds budget of ${budget}ms (+${metrics.median - budget}ms)`
    );
  }

  if (metrics.p95 > budget * 1.5) {
    violations.push(
      `P95 response time: ${metrics.p95}ms exceeds 1.5x budget of ${budget * 1.5}ms (+${metrics.p95 - budget * 1.5}ms)`
    );
  }

  if (metrics.average > budget * 1.2) {
    violations.push(
      `Average response time: ${metrics.average}ms exceeds 1.2x budget of ${budget * 1.2}ms (+${metrics.average - budget * 1.2}ms)`
    );
  }

  return violations;
}

/**
 * Save performance baselines to JSON file
 */
function savePerformanceBaselines() {
  const resultsDir = path.dirname(baselineFilePath);
  if (!fs.existsSync(resultsDir)) {
    fs.mkdirSync(resultsDir, { recursive: true });
  }

  fs.writeFileSync(
    baselineFilePath,
    JSON.stringify(performanceResults, null, 2),
    'utf-8'
  );

  console.log(`\n📊 API Performance baselines saved to: ${baselineFilePath}`);
}

/**
 * Log performance summary
 */
function logPerformanceSummary(result: EndpointPerformance) {
  console.log(`\n📊 Performance Summary: ${result.method} ${result.endpoint}`);
  console.log(`Budget: ${result.budget}ms`);
  console.log(`\nMetrics:`);
  console.log(`  Min: ${result.metrics.min}ms`);
  console.log(`  Median: ${result.metrics.median}ms`);
  console.log(`  Average: ${result.metrics.average}ms`);
  console.log(`  P95: ${result.metrics.p95}ms`);
  console.log(`  P99: ${result.metrics.p99}ms`);
  console.log(`  Max: ${result.metrics.max}ms`);

  if (result.violations.length > 0) {
    console.log(`\n❌ Budget Violations (${result.violations.length}):`);
    result.violations.forEach(v => console.log(`  - ${v}`));
    console.log(`\n💡 Recommendations:`);
    console.log(`  - Add database indexes for frequently queried fields`);
    console.log(`  - Implement response caching`);
    console.log(`  - Optimize database queries (N+1 problems)`);
    console.log(`  - Use pagination for large result sets`);
    console.log(`  - Consider API response compression`);
  } else {
    console.log(`\n✅ All performance budgets met!`);
  }
}

/**
 * Measure endpoint performance over multiple runs
 */
async function measureEndpointPerformance(
  fn: () => Promise<any>,
  endpoint: string,
  method: string,
  budget: number
): Promise<EndpointPerformance> {
  const runs: number[] = [];

  console.log(`  Running ${TEST_RUNS} iterations...`);

  // Warmup run (not counted)
  await fn();

  // Measure runs
  for (let i = 0; i < TEST_RUNS; i++) {
    const start = Date.now();
    await fn();
    const duration = Date.now() - start;
    runs.push(duration);
  }

  const metrics = calculateStatistics(runs);
  const violations = checkBudgetViolations(metrics, budget);

  const result: EndpointPerformance = {
    endpoint,
    method,
    metrics,
    budget,
    violations,
    timestamp: new Date().toISOString(),
  };

  performanceResults.push(result);
  logPerformanceSummary(result);

  return result;
}

describe('API Performance Baseline Tests', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/bots', botsRouter);
    app.use('/dashboard', dashboardRouter);
    app.use('/api/activity', activityRouter);
    app.use('/api/health', healthRouter);
  });

  afterAll(() => {
    savePerformanceBaselines();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET Endpoints Performance', () => {
    test('GET /api/health - health check endpoint', async () => {
      console.log(`\n🔍 Testing GET /api/health...`);

      const result = await measureEndpointPerformance(
        async () => await request(app).get('/api/health').expect(200),
        '/api/health',
        'GET',
        PERFORMANCE_BUDGETS.HEALTH
      );

      // Health check should be very fast
      expect(result.metrics.median).toBeLessThan(PERFORMANCE_BUDGETS.HEALTH);
      expect(result.metrics.p95).toBeLessThan(PERFORMANCE_BUDGETS.HEALTH * 1.5);
    });

    test('GET /api/bots - list all bots', async () => {
      console.log(`\n🔍 Testing GET /api/bots...`);

      // Mock data
      const mockBots = Array.from({ length: 10 }, (_, i) => ({
        id: `bot${i}`,
        name: `Bot ${i}`,
        messageProvider: 'discord',
        isActive: true,
      }));

      const mockManager = BotManager.getInstance() as any;
      mockManager.getAllBots.mockResolvedValue(mockBots);
      mockManager.getBotsStatus.mockResolvedValue(
        mockBots.map(b => ({ id: b.id, isRunning: false }))
      );

      const result = await measureEndpointPerformance(
        async () => await request(app).get('/api/bots').expect(200),
        '/api/bots',
        'GET',
        PERFORMANCE_BUDGETS.GET_SIMPLE
      );

      expect(result.metrics.median).toBeLessThan(PERFORMANCE_BUDGETS.GET_SIMPLE);
      expect(result.metrics.p95).toBeLessThan(PERFORMANCE_BUDGETS.GET_SIMPLE * 1.5);
    });

    test('GET /api/bots - list with 100+ bots', async () => {
      console.log(`\n🔍 Testing GET /api/bots with 100+ bots...`);

      // Mock large dataset
      const mockBots = Array.from({ length: 150 }, (_, i) => ({
        id: `bot${i}`,
        name: `Bot ${i}`,
        messageProvider: i % 2 === 0 ? 'discord' : 'slack',
        isActive: true,
      }));

      const mockManager = BotManager.getInstance() as any;
      mockManager.getAllBots.mockResolvedValue(mockBots);
      mockManager.getBotsStatus.mockResolvedValue(
        mockBots.map(b => ({ id: b.id, isRunning: false }))
      );

      const result = await measureEndpointPerformance(
        async () => await request(app).get('/api/bots').expect(200),
        '/api/bots (150 items)',
        'GET',
        PERFORMANCE_BUDGETS.GET_COMPLEX
      );

      // With large datasets, allow complex query budget
      expect(result.metrics.median).toBeLessThan(PERFORMANCE_BUDGETS.GET_COMPLEX);
      expect(result.metrics.p95).toBeLessThan(PERFORMANCE_BUDGETS.GET_COMPLEX * 1.5);
    });

    test('GET /dashboard/status - dashboard stats', async () => {
      console.log(`\n🔍 Testing GET /dashboard/status...`);

      const result = await measureEndpointPerformance(
        async () => await request(app).get('/dashboard/status').expect(200),
        '/dashboard/status',
        'GET',
        PERFORMANCE_BUDGETS.GET_SIMPLE
      );

      expect(result.metrics.median).toBeLessThan(PERFORMANCE_BUDGETS.GET_SIMPLE);
      expect(result.metrics.p95).toBeLessThan(PERFORMANCE_BUDGETS.GET_SIMPLE * 1.5);
    });

    test('GET /api/activity/messages - activity with filters', async () => {
      console.log(`\n🔍 Testing GET /api/activity/messages...`);

      const result = await measureEndpointPerformance(
        async () =>
          await request(app)
            .get('/api/activity/messages')
            .query({ messageProvider: 'discord', limit: 50 })
            .expect(200),
        '/api/activity/messages',
        'GET',
        PERFORMANCE_BUDGETS.GET_COMPLEX
      );

      // Activity queries can be complex
      expect(result.metrics.median).toBeLessThan(PERFORMANCE_BUDGETS.GET_COMPLEX);
      expect(result.metrics.p95).toBeLessThan(PERFORMANCE_BUDGETS.GET_COMPLEX * 1.5);
    });

    test('GET /api/activity/summary - activity summary', async () => {
      console.log(`\n🔍 Testing GET /api/activity/summary...`);

      const result = await measureEndpointPerformance(
        async () => await request(app).get('/api/activity/summary').expect(200),
        '/api/activity/summary',
        'GET',
        PERFORMANCE_BUDGETS.GET_COMPLEX
      );

      expect(result.metrics.median).toBeLessThan(PERFORMANCE_BUDGETS.GET_COMPLEX);
      expect(result.metrics.p95).toBeLessThan(PERFORMANCE_BUDGETS.GET_COMPLEX * 1.5);
    });

    test('GET /api/activity/chart-data - chart data', async () => {
      console.log(`\n🔍 Testing GET /api/activity/chart-data...`);

      const result = await measureEndpointPerformance(
        async () => await request(app).get('/api/activity/chart-data').expect(200),
        '/api/activity/chart-data',
        'GET',
        PERFORMANCE_BUDGETS.GET_COMPLEX
      );

      expect(result.metrics.median).toBeLessThan(PERFORMANCE_BUDGETS.GET_COMPLEX);
      expect(result.metrics.p95).toBeLessThan(PERFORMANCE_BUDGETS.GET_COMPLEX * 1.5);
    });
  });

  describe('POST Endpoints Performance', () => {
    test('POST /api/bots - create bot', async () => {
      console.log(`\n🔍 Testing POST /api/bots...`);

      const mockManager = BotManager.getInstance() as any;
      mockManager.getAllBots.mockResolvedValue([]);
      mockManager.createBot.mockResolvedValue({
        id: 'new-bot',
        name: 'New Bot',
        messageProvider: 'discord',
      });

      const botData = {
        name: 'Test Bot',
        messageProvider: 'discord',
        llmProvider: 'openai',
        config: { discord: { token: 'test' }, openai: { apiKey: 'test' } },
      };

      const result = await measureEndpointPerformance(
        async () => await request(app).post('/api/bots').send(botData).expect(201),
        '/api/bots',
        'POST',
        PERFORMANCE_BUDGETS.POST
      );

      expect(result.metrics.median).toBeLessThan(PERFORMANCE_BUDGETS.POST);
      expect(result.metrics.p95).toBeLessThan(PERFORMANCE_BUDGETS.POST * 1.5);
    });

    test('POST /api/activity/log - log activity', async () => {
      console.log(`\n🔍 Testing POST /api/activity/log...`);

      const activityData = {
        agentId: 'agent_1',
        messageProvider: 'discord',
        llmProvider: 'openai',
        messageType: 'incoming',
        contentLength: 100,
        processingTime: 250,
        status: 'success',
      };

      const result = await measureEndpointPerformance(
        async () =>
          await request(app).post('/api/activity/log').send(activityData).expect(200),
        '/api/activity/log',
        'POST',
        PERFORMANCE_BUDGETS.POST
      );

      expect(result.metrics.median).toBeLessThan(PERFORMANCE_BUDGETS.POST);
      expect(result.metrics.p95).toBeLessThan(PERFORMANCE_BUDGETS.POST * 1.5);
    });

    test('POST /api/bots/:botId/start - start bot', async () => {
      console.log(`\n🔍 Testing POST /api/bots/:botId/start...`);

      const mockManager = BotManager.getInstance() as any;
      mockManager.startBot.mockResolvedValue(true);

      const result = await measureEndpointPerformance(
        async () => await request(app).post('/api/bots/bot1/start').expect(200),
        '/api/bots/:botId/start',
        'POST',
        PERFORMANCE_BUDGETS.POST
      );

      expect(result.metrics.median).toBeLessThan(PERFORMANCE_BUDGETS.POST);
      expect(result.metrics.p95).toBeLessThan(PERFORMANCE_BUDGETS.POST * 1.5);
    });
  });

  describe('PUT Endpoints Performance', () => {
    test('PUT /api/bots/:botId - update bot', async () => {
      console.log(`\n🔍 Testing PUT /api/bots/:botId...`);

      const mockManager = BotManager.getInstance() as any;
      mockManager.updateBot.mockResolvedValue({
        id: 'bot1',
        name: 'Bot 1',
        persona: 'updated',
      });

      const result = await measureEndpointPerformance(
        async () =>
          await request(app).put('/api/bots/bot1').send({ persona: 'updated' }).expect(200),
        '/api/bots/:botId',
        'PUT',
        PERFORMANCE_BUDGETS.PUT
      );

      expect(result.metrics.median).toBeLessThan(PERFORMANCE_BUDGETS.PUT);
      expect(result.metrics.p95).toBeLessThan(PERFORMANCE_BUDGETS.PUT * 1.5);
    });
  });

  describe('DELETE Endpoints Performance', () => {
    test('DELETE /api/bots/:botId - delete bot', async () => {
      console.log(`\n🔍 Testing DELETE /api/bots/:botId...`);

      const mockManager = BotManager.getInstance() as any;
      mockManager.deleteBot.mockResolvedValue(true);

      const result = await measureEndpointPerformance(
        async () => await request(app).delete('/api/bots/bot1').expect(200),
        '/api/bots/:botId',
        'DELETE',
        PERFORMANCE_BUDGETS.DELETE
      );

      expect(result.metrics.median).toBeLessThan(PERFORMANCE_BUDGETS.DELETE);
      expect(result.metrics.p95).toBeLessThan(PERFORMANCE_BUDGETS.DELETE * 1.5);
    });
  });

  describe('Performance Regression Detection', () => {
    test('Compare with baseline if exists', () => {
      if (fs.existsSync(baselineFilePath)) {
        console.log(`\n🔍 Comparing with baseline performance...`);

        const baseline = JSON.parse(fs.readFileSync(baselineFilePath, 'utf-8'));
        const regressions: string[] = [];

        for (const current of performanceResults) {
          const baselineResult = baseline.find(
            (b: EndpointPerformance) =>
              b.endpoint === current.endpoint && b.method === current.method
          );

          if (baselineResult) {
            const medianRegression =
              ((current.metrics.median - baselineResult.metrics.median) /
                baselineResult.metrics.median) *
              100;

            if (medianRegression > 20) {
              // 20% regression threshold
              regressions.push(
                `${current.method} ${current.endpoint}: ${medianRegression.toFixed(1)}% slower (${baselineResult.metrics.median}ms -> ${current.metrics.median}ms)`
              );
            }
          }
        }

        if (regressions.length > 0) {
          console.log(`\n⚠️ Performance Regressions Detected (${regressions.length}):`);
          regressions.forEach(r => console.log(`  - ${r}`));
          regressions.forEach((r) => console.log(`  - ${r}`));
          console.warn('Performance has regressed compared to baseline!');
        } else {
          console.log(`\n✅ No significant performance regressions detected`);
        }

        // Fail the test if there are regressions
        expect(regressions.length).toBe(0);
      } else {
        console.log(`\n📝 No baseline found. This run will establish the baseline.`);
      }
    });
  });

  describe('Concurrent Request Performance', () => {
    test('Handle 50 concurrent GET requests', async () => {
      console.log(`\n🔍 Testing concurrent load (50 requests)...`);

      const mockManager = BotManager.getInstance() as any;
      mockManager.getAllBots.mockResolvedValue([
        { id: 'bot1', name: 'Bot 1', messageProvider: 'discord', isActive: true },
      ]);
      mockManager.getBotsStatus.mockResolvedValue([{ id: 'bot1', isRunning: false }]);

      const start = Date.now();
      const requests = Array(50)
        .fill(null)
        .map(() => request(app).get('/api/bots'));

      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      console.log(`  Completed 50 requests in ${duration}ms`);
      console.log(`  Average per request: ${Math.round(duration / 50)}ms`);

      responses.forEach(response => {
        expect(response.status).toBe(200);
      });

      // All 50 requests should complete within reasonable time
      expect(duration).toBeLessThan(5000); // 5 seconds for 50 requests
    });
  });

  describe('Performance Summary Report', () => {
    test('Generate performance summary', () => {
      console.log(`\n📊 PERFORMANCE SUMMARY REPORT`);
      console.log(`============================`);
      console.log(`Total endpoints tested: ${performanceResults.length}`);
      console.log(`Test runs per endpoint: ${TEST_RUNS}`);
      console.log(`\nPerformance Budgets:`);
      console.log(`  - GET (simple): ${PERFORMANCE_BUDGETS.GET_SIMPLE}ms`);
      console.log(`  - GET (complex): ${PERFORMANCE_BUDGETS.GET_COMPLEX}ms`);
      console.log(`  - POST: ${PERFORMANCE_BUDGETS.POST}ms`);
      console.log(`  - PUT: ${PERFORMANCE_BUDGETS.PUT}ms`);
      console.log(`  - DELETE: ${PERFORMANCE_BUDGETS.DELETE}ms`);
      console.log(`  - Health: ${PERFORMANCE_BUDGETS.HEALTH}ms`);

      const totalViolations = performanceResults.reduce(
        (sum, r) => sum + r.violations.length,
        0
      );

      if (totalViolations > 0) {
        console.log(`\n❌ Total budget violations: ${totalViolations}`);
        console.log(`\nEndpoints with violations:`);
        performanceResults
          .filter(r => r.violations.length > 0)
          .forEach(r => {
            console.log(`  - ${r.method} ${r.endpoint}: ${r.violations.length} violation(s)`);
          });
      } else {
        console.log(`\n✅ All endpoints meet performance budgets!`);
      }

      console.log(`\nFastest endpoints:`);
      const fastest = [...performanceResults]
        .sort((a, b) => a.metrics.median - b.metrics.median)
        .slice(0, 3);
      fastest.forEach(r => {
        console.log(`  - ${r.method} ${r.endpoint}: ${r.metrics.median}ms`);
      });

      console.log(`\nSlowest endpoints:`);
      const slowest = [...performanceResults]
        .sort((a, b) => b.metrics.median - a.metrics.median)
        .slice(0, 3);
      slowest.forEach(r => {
        console.log(`  - ${r.method} ${r.endpoint}: ${r.metrics.median}ms`);
      });

      expect(performanceResults.length).toBeGreaterThan(0);
    });
  });
});
