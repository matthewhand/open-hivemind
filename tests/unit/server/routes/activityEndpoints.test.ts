/**
 * Tests for the /api/activity data endpoints.
 *
 * Regression: /messages and /llm-usage previously returned hardcoded empty
 * arrays, /chart-data fabricated random series, and /agents + /mcp-tools
 * returned invented fixtures. They now serve real recorded data:
 *   - /messages and /agents  -> ActivityLogger message-flow events
 *   - /llm-usage             -> persisted inference_logs rows
 *   - /chart-data            -> both of the above, bucketed by interval
 *   - /mcp-tools             -> honest empty result (nothing is recorded yet)
 */
import express from 'express';
import request from 'supertest';
// Import after mocks are registered.
import activityRouter from '../../../../src/server/routes/activity';

const mockGetStats = jest.fn();
const mockGetInferenceLogs = jest.fn();
const mockGetEvents = jest.fn();
const mockGetEventsCount = jest.fn();

jest.mock('../../../../src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: () => ({
      isConnected: () => true,
      getStats: mockGetStats,
      getInferenceLogs: mockGetInferenceLogs,
    }),
  },
}));

jest.mock('../../../../src/server/services/ActivityLogger', () => ({
  ActivityLogger: {
    getInstance: () => ({
      getEvents: mockGetEvents,
      getEventsCount: mockGetEventsCount,
    }),
  },
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/activity', activityRouter);
  return app;
}

const baseEvent = {
  id: 'evt-1',
  timestamp: '2026-06-10T01:00:00.000Z',
  botName: 'Bot A',
  provider: 'discord',
  llmProvider: 'openai',
  channelId: 'channel-1234',
  userId: 'user-5678',
  messageType: 'incoming' as const,
  contentLength: 42,
  processingTime: 120,
  status: 'success' as const,
};

describe('GET /api/activity/messages', () => {
  const app = buildApp();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEvents.mockResolvedValue([]);
    mockGetEventsCount.mockResolvedValue(0);
    mockGetInferenceLogs.mockResolvedValue([]);
  });

  it('serves recorded message-flow events with redacted ids', async () => {
    mockGetEvents.mockResolvedValue([baseEvent]);
    mockGetEventsCount.mockResolvedValue(1);

    const res = await request(app).get('/api/activity/messages').expect(200);

    expect(res.body.success).toBe(true);
    const { messages, total, meta } = res.body.data;
    expect(total).toBe(1);
    expect(messages).toHaveLength(1);
    expect(messages[0]).toMatchObject({
      id: 'evt-1',
      agentId: 'Bot A',
      agentName: 'Bot A',
      messageProvider: 'discord',
      llmProvider: 'openai',
      messageType: 'incoming',
      contentLength: 42,
      processingTime: 120,
      status: 'success',
    });
    // channelId / userId are redacted down to the last 4 characters.
    expect(messages[0].channelId).toBe('********1234');
    expect(messages[0].userId).toBe('*****5678');
    expect(meta.source).toBe('activity-log');
    expect(meta.note).toBeUndefined();
  });

  it('passes filters through to the activity logger', async () => {
    const startDate = '2026-06-01T00:00:00.000Z';
    const endDate = '2026-06-10T00:00:00.000Z';

    await request(app)
      .get('/api/activity/messages')
      .query({
        agentId: 'Bot A',
        messageProvider: 'discord',
        llmProvider: 'openai',
        startDate,
        endDate,
        limit: '5',
        offset: '10',
      })
      .expect(200);

    expect(mockGetEvents).toHaveBeenCalledTimes(1);
    const filter = mockGetEvents.mock.calls[0][0];
    expect(filter.botName).toBe('Bot A');
    expect(filter.provider).toBe('discord');
    expect(filter.llmProvider).toBe('openai');
    expect(filter.startTime.toISOString()).toBe(startDate);
    expect(filter.endTime.toISOString()).toBe(endDate);
    expect(filter.limit).toBe(5);
    expect(filter.offset).toBe(10);
  });

  it('returns an honest empty result with an explanatory note when nothing is recorded', async () => {
    const res = await request(app).get('/api/activity/messages').expect(200);

    expect(res.body.data.messages).toEqual([]);
    expect(res.body.data.total).toBe(0);
    expect(res.body.data.meta.note).toMatch(/No message activity recorded/i);
  });
});

describe('GET /api/activity/llm-usage', () => {
  const app = buildApp();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetInferenceLogs.mockResolvedValue([]);
  });

  it('serves persisted inference logs as usage metrics', async () => {
    mockGetInferenceLogs.mockResolvedValue([
      {
        id: 1,
        botName: 'Bot A',
        tokensUsed: 321,
        latencyMs: 850,
        provider: 'openai',
        status: 'success',
        errorMessage: null,
        timestamp: '2026-06-10T01:00:00.000Z',
      },
      {
        id: 2,
        botName: 'Bot B',
        tokensUsed: null,
        latencyMs: null,
        provider: null,
        status: 'error',
        errorMessage: 'boom',
        timestamp: '2026-06-10T01:05:00.000Z',
      },
    ]);

    const res = await request(app).get('/api/activity/llm-usage').expect(200);

    const { usage, meta } = res.body.data;
    expect(usage).toEqual([
      {
        timestamp: '2026-06-10T01:00:00.000Z',
        agentId: 'Bot A',
        llmProvider: 'openai',
        tokensUsed: 321,
        responseTime: 850,
      },
      {
        timestamp: '2026-06-10T01:05:00.000Z',
        agentId: 'Bot B',
        llmProvider: 'unknown',
        tokensUsed: 0,
        responseTime: 0,
      },
    ]);
    expect(meta.source).toBe('inference-logs');
    expect(meta.note).toBeUndefined();
  });

  it('passes filters through to the inference-log store', async () => {
    const startDate = '2026-06-01T00:00:00.000Z';

    await request(app)
      .get('/api/activity/llm-usage')
      .query({ agentId: 'Bot A', llmProvider: 'openai', startDate, limit: '7' })
      .expect(200);

    expect(mockGetInferenceLogs).toHaveBeenCalledTimes(1);
    const filter = mockGetInferenceLogs.mock.calls[0][0];
    expect(filter.botName).toBe('Bot A');
    expect(filter.provider).toBe('openai');
    expect(filter.startTime.toISOString()).toBe(startDate);
    expect(filter.limit).toBe(7);
  });

  it('returns an honest empty result with an explanatory note when nothing is recorded', async () => {
    const res = await request(app).get('/api/activity/llm-usage').expect(200);

    expect(res.body.data.usage).toEqual([]);
    expect(res.body.data.meta.note).toMatch(/No inference logs recorded/i);
  });
});

describe('GET /api/activity/chart-data', () => {
  const app = buildApp();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEvents.mockResolvedValue([]);
    mockGetInferenceLogs.mockResolvedValue([]);
  });

  it('buckets recorded events and inference logs into real time series', async () => {
    const startDate = '2026-06-10T00:00:00.000Z';
    const endDate = '2026-06-10T03:00:00.000Z';

    mockGetEvents.mockResolvedValue([
      { ...baseEvent, id: 'e1', timestamp: '2026-06-10T00:10:00.000Z' },
      { ...baseEvent, id: 'e2', timestamp: '2026-06-10T00:40:00.000Z' },
      { ...baseEvent, id: 'e3', timestamp: '2026-06-10T02:15:00.000Z' },
    ]);
    mockGetInferenceLogs.mockResolvedValue([
      {
        id: 1,
        botName: 'Bot A',
        tokensUsed: 100,
        latencyMs: 400,
        provider: 'openai',
        status: 'success',
        errorMessage: null,
        timestamp: '2026-06-10T00:30:00.000Z',
      },
      {
        id: 2,
        botName: 'Bot A',
        tokensUsed: 50,
        latencyMs: 600,
        provider: 'openai',
        status: 'success',
        errorMessage: null,
        timestamp: '2026-06-10T00:45:00.000Z',
      },
    ]);

    const res = await request(app)
      .get('/api/activity/chart-data')
      .query({ startDate, endDate, interval: 'hour' })
      .expect(200);

    const { messageActivity, llmUsage, meta } = res.body.data;

    // 4 hourly buckets across the range, zero-filled where nothing happened.
    expect(messageActivity).toHaveLength(4);
    expect(messageActivity.map((b: any) => b.count)).toEqual([2, 0, 1, 0]);
    expect(messageActivity[0].timestamp).toBe(startDate);

    expect(llmUsage).toHaveLength(4);
    expect(llmUsage[0]).toMatchObject({
      usage: 2,
      tokens: 150,
      responseTime: 500, // average of 400 and 600
    });
    expect(llmUsage.slice(1).map((b: any) => b.usage)).toEqual([0, 0, 0]);

    expect(meta.source).toEqual({
      messageActivity: 'activity-log',
      llmUsage: 'inference-logs',
    });
  });

  it('returns deterministic zeroed series when nothing is recorded', async () => {
    const startDate = '2026-06-10T00:00:00.000Z';
    const endDate = '2026-06-10T02:00:00.000Z';

    const first = await request(app)
      .get('/api/activity/chart-data')
      .query({ startDate, endDate, interval: 'hour' })
      .expect(200);
    const second = await request(app)
      .get('/api/activity/chart-data')
      .query({ startDate, endDate, interval: 'hour' })
      .expect(200);

    // No random fabrication: identical inputs produce identical outputs.
    expect(first.body.data.messageActivity).toEqual(second.body.data.messageActivity);
    expect(first.body.data.llmUsage).toEqual(second.body.data.llmUsage);
    expect(first.body.data.messageActivity.every((b: any) => b.count === 0)).toBe(true);
    expect(first.body.data.llmUsage.every((b: any) => b.usage === 0 && b.tokens === 0)).toBe(true);
  });
});

describe('GET /api/activity/agents', () => {
  const app = buildApp();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetEvents.mockResolvedValue([]);
  });

  it('aggregates per-agent statistics from recorded events', async () => {
    const now = new Date().toISOString();
    mockGetEvents.mockResolvedValue([
      { ...baseEvent, id: 'e1', timestamp: now, processingTime: 100, status: 'success' },
      { ...baseEvent, id: 'e2', timestamp: now, processingTime: 300, status: 'error' },
      {
        ...baseEvent,
        id: 'e3',
        botName: 'Bot B',
        provider: 'slack',
        llmProvider: 'anthropic',
        timestamp: '2026-01-01T00:00:00.000Z',
        processingTime: undefined,
        status: 'success',
      },
    ]);

    const res = await request(app).get('/api/activity/agents').expect(200);

    const { agents, meta } = res.body.data;
    expect(agents).toHaveLength(2);

    const botA = agents.find((a: any) => a.agentId === 'Bot A');
    expect(botA).toMatchObject({
      agentName: 'Bot A',
      messageProvider: 'discord',
      llmProvider: 'openai',
      totalMessages: 2,
      averageResponseTime: 200,
      errorRate: 0.5,
      status: 'active',
    });
    expect(botA.lastActive).toBe(now);

    const botB = agents.find((a: any) => a.agentId === 'Bot B');
    expect(botB).toMatchObject({
      totalMessages: 1,
      averageResponseTime: 0,
      errorRate: 0,
      status: 'idle',
      lastActive: '2026-01-01T00:00:00.000Z',
    });

    expect(meta.source).toBe('activity-log');
  });

  it('returns an honest empty list with a note when no activity is recorded', async () => {
    const res = await request(app).get('/api/activity/agents').expect(200);

    expect(res.body.data.agents).toEqual([]);
    expect(res.body.data.meta.note).toMatch(/No agent activity recorded/i);
  });
});

describe('GET /api/activity/mcp-tools', () => {
  const app = buildApp();

  it('reports that MCP tool usage is not instrumented instead of fabricating stats', async () => {
    const res = await request(app).get('/api/activity/mcp-tools').expect(200);

    expect(res.body.data.mcpTools).toEqual([]);
    expect(res.body.data.meta.note).toMatch(/not instrumented/i);
  });
});
