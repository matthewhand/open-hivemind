import type { MessageFlowEvent } from '../../../src/server/services/WebSocketService';
import { AnalyticsService } from '../../../src/services/AnalyticsService';

function makeEvent(overrides: Partial<MessageFlowEvent> = {}): MessageFlowEvent {
  return {
    id: `evt-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    botName: 'TestBot',
    provider: 'discord',
    channelId: 'ch-1',
    userId: 'user-1',
    messageType: 'outgoing',
    contentLength: 50,
    processingTime: 200,
    status: 'success',
    ...overrides,
  };
}

describe('AnalyticsService', () => {
  let events: MessageFlowEvent[];

  beforeEach(() => {
    // Reset the singleton between tests
    // @ts-ignore - testing internal state
    AnalyticsService.instance = undefined;
  });

  describe('getBehaviorPatterns (with providedEvents)', () => {
    it('should return patterns from the PatternAnalyzer', async () => {
      events = [makeEvent()];
      const patterns = await AnalyticsService.getInstance().getBehaviorPatterns({}, events);
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });

    it('should return default patterns for empty events', async () => {
      const patterns = await AnalyticsService.getInstance().getBehaviorPatterns({}, []);
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
    });
  });

  describe('getUserSegments (with providedEvents)', () => {
    it('should return user segments', async () => {
      events = [makeEvent()];
      const segments = await AnalyticsService.getInstance().getUserSegments({}, events);
      expect(Array.isArray(segments)).toBe(true);
      expect(segments.length).toBeGreaterThan(0);
    });

    it('should classify a power user with many events', async () => {
      events = Array.from({ length: 60 }, () => makeEvent({ userId: 'power-user' }));
      const segments = await AnalyticsService.getInstance().getUserSegments({}, events);
      const powerSegment = segments.find((s) => s.id === 'segment-power-users');
      expect(powerSegment).toBeDefined();
    });
  });

  describe('getRecommendations (with providedEvents)', () => {
    it('should return recommendations based on patterns and segments', async () => {
      events = Array.from({ length: 60 }, () =>
        makeEvent({
          userId: 'power-user',
          botName: `Bot${Math.floor(Math.random() * 6)}`,
        })
      );

      const recs = await AnalyticsService.getInstance().getRecommendations({}, events);
      expect(Array.isArray(recs)).toBe(true);
    });

    it('should return default recommendations for empty events', async () => {
      const recs = await AnalyticsService.getInstance().getRecommendations({}, []);
      expect(Array.isArray(recs)).toBe(true);
      expect(recs.length).toBeGreaterThan(0);
    });
  });

  describe('getStats', () => {
    it('should return correct AnalyticsStats', async () => {
      const events: MessageFlowEvent[] = [
        makeEvent({ botName: 'BotA', processingTime: 100, status: 'success' }),
        makeEvent({ botName: 'BotA', processingTime: 300, status: 'success' }),
        makeEvent({ botName: 'BotB', processingTime: 500, status: 'error' }),
      ];

      const service = AnalyticsService.getInstance();
      // Override activityLogger.getEvents to return our events
      const origLogger = (service as any).activityLogger;
      (service as any).activityLogger = {
        ...origLogger,
        getEvents: jest.fn().mockResolvedValue(events),
      };

      const stats = await service.getStats();

      expect(stats.totalMessages).toBe(3);
      expect(stats.totalErrors).toBe(1);
      expect(stats.avgProcessingTime).toBe(300); // (100 + 300 + 500) / 3
      expect(stats.activeBots).toBe(2);
      expect(stats.activeUsers).toBe(1);
    });
  });

  describe('getTimeSeries', () => {
    it('should return time series buckets', async () => {
      const events: MessageFlowEvent[] = [
        makeEvent({ timestamp: '2024-06-15T10:00:00.000Z' }),
        makeEvent({ timestamp: '2024-06-15T10:01:00.000Z' }),
      ];

      const service = AnalyticsService.getInstance();
      const origLogger = (service as any).activityLogger;
      (service as any).activityLogger = {
        ...origLogger,
        getEvents: jest.fn().mockResolvedValue(events),
      };

      const buckets = await service.getTimeSeries();
      expect(Array.isArray(buckets)).toBe(true);
      expect(buckets).toHaveLength(2);
    });

    it('should return empty array for no events', async () => {
      const service = AnalyticsService.getInstance();
      const origLogger = (service as any).activityLogger;
      (service as any).activityLogger = {
        ...origLogger,
        getEvents: jest.fn().mockResolvedValue([]),
      };

      const buckets = await service.getTimeSeries();
      expect(buckets).toEqual([]);
    });
  });
});
