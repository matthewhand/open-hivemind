/**
 * Tests for GET /api/activity/summary.
 *
 * Regression: the handler previously hardcoded averageResponseTime (250) and
 * errorRate (0.02) and returned empty messagesByAgent / llmUsageByProvider.
 * These metrics are now derived from real recorded activity events via
 * ActivityLogger, alongside the DB-backed totals from DatabaseManager.getStats().
 */
import express from 'express';
import request from 'supertest';
// Import after mocks are registered.
import activityRouter from '../../../../src/server/routes/activity';

const mockGetStats = jest.fn();
const mockGetEvents = jest.fn();

jest.mock('../../../../src/database/DatabaseManager', () => ({
  DatabaseManager: {
    getInstance: () => ({
      isConnected: () => true,
      getStats: mockGetStats,
    }),
  },
}));

jest.mock('../../../../src/server/services/ActivityLogger', () => ({
  ActivityLogger: {
    getInstance: () => ({
      getEvents: mockGetEvents,
    }),
  },
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/activity', activityRouter);
  return app;
}

describe('GET /api/activity/summary', () => {
  const app = buildApp();

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetStats.mockResolvedValue({
      totalMessages: 10,
      totalChannels: 3,
      totalAuthors: 5,
      providers: { discord: 7, slack: 3 },
    });
  });

  it('derives response time, error rate, per-agent and per-LLM-provider metrics from recorded events', async () => {
    mockGetEvents.mockResolvedValue([
      {
        id: '1',
        timestamp: new Date().toISOString(),
        botName: 'Bot A',
        provider: 'discord',
        llmProvider: 'openai',
        channelId: 'c1',
        userId: 'u1',
        messageType: 'incoming',
        contentLength: 10,
        processingTime: 100,
        status: 'success',
      },
      {
        id: '2',
        timestamp: new Date().toISOString(),
        botName: 'Bot A',
        provider: 'discord',
        llmProvider: 'openai',
        channelId: 'c1',
        userId: 'u2',
        messageType: 'outgoing',
        contentLength: 20,
        processingTime: 300,
        status: 'error',
      },
      {
        id: '3',
        timestamp: new Date().toISOString(),
        botName: 'Bot B',
        provider: 'slack',
        llmProvider: 'anthropic',
        channelId: 'c2',
        userId: 'u3',
        messageType: 'incoming',
        contentLength: 5,
        processingTime: 500,
        status: 'success',
      },
    ]);

    const res = await request(app).get('/api/activity/summary').expect(200);

    expect(res.body.success).toBe(true);
    const { summary } = res.body.data;

    // DB-backed totals are passed through unchanged.
    expect(summary.totalMessages).toBe(10);
    expect(summary.totalAgents).toBe(3);
    expect(summary.messagesByProvider).toEqual({ discord: 7, slack: 3 });

    // Average of 100, 300, 500 = 300.
    expect(summary.averageResponseTime).toBe(300);
    // 1 error out of 3 events.
    expect(summary.errorRate).toBeCloseTo(1 / 3);
    // Per-agent counts.
    expect(summary.messagesByAgent).toEqual({ 'Bot A': 2, 'Bot B': 1 });
    // Per-LLM-provider counts.
    expect(summary.llmUsageByProvider).toEqual({ openai: 2, anthropic: 1 });
  });

  it('returns zeroed derived metrics when there are no recorded events', async () => {
    mockGetEvents.mockResolvedValue([]);

    const res = await request(app).get('/api/activity/summary').expect(200);

    const { summary } = res.body.data;
    expect(summary.averageResponseTime).toBe(0);
    expect(summary.errorRate).toBe(0);
    expect(summary.messagesByAgent).toEqual({});
    expect(summary.llmUsageByProvider).toEqual({});
  });

  it('passes the requested time range to the activity logger', async () => {
    mockGetEvents.mockResolvedValue([]);
    const startDate = '2026-01-01T00:00:00.000Z';
    const endDate = '2026-01-02T00:00:00.000Z';

    const res = await request(app)
      .get('/api/activity/summary')
      .query({ startDate, endDate })
      .expect(200);

    expect(res.body.data.summary.timeRangeStart).toBe(startDate);
    expect(res.body.data.summary.timeRangeEnd).toBe(endDate);

    expect(mockGetEvents).toHaveBeenCalledTimes(1);
    const passedFilter = mockGetEvents.mock.calls[0][0];
    expect(passedFilter.startTime.toISOString()).toBe(startDate);
    expect(passedFilter.endTime.toISOString()).toBe(endDate);
  });
});
