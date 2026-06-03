import type { MessageFlowEvent } from '../../../src/server/services/websocket/types';
import { AnalyticsCalculator } from '../../../src/services/analytics/AnalyticsCalculator';
import type { TimeSeriesBucket } from '../../../src/services/analytics/types';

function makeEvent(overrides: Partial<MessageFlowEvent> = {}): MessageFlowEvent {
  return {
    id: `evt-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date('2024-06-15T10:00:00Z').toISOString(),
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

describe('AnalyticsCalculator', () => {
  describe('calculateMessageFrequency', () => {
    it('should return 0 for less than 2 events', () => {
      expect(AnalyticsCalculator.calculateMessageFrequency([])).toBe(0);
      expect(AnalyticsCalculator.calculateMessageFrequency([makeEvent()])).toBe(0);
    });

    it('should return 0 when all events have the same timestamp', () => {
      const t = '2024-06-15T10:00:00.000Z';
      const events = [makeEvent({ timestamp: t }), makeEvent({ timestamp: t })];
      expect(AnalyticsCalculator.calculateMessageFrequency(events)).toBe(0);
    });

    it('should calculate messages per minute', () => {
      const events = [
        makeEvent({ timestamp: '2024-06-15T10:00:00.000Z' }),
        makeEvent({ timestamp: '2024-06-15T10:01:00.000Z' }), // 1 min apart, 2 msgs in 1 min = 2 msg/min
        makeEvent({ timestamp: '2024-06-15T10:01:30.000Z' }),
      ];

      // 3 events over 1.5 min = 2 msg/min
      const freq = AnalyticsCalculator.calculateMessageFrequency(events);
      expect(freq).toBeGreaterThan(0);
      expect(freq).toBe(2);
    });
  });

  describe('calculateErrorRate', () => {
    it('should return 0 for empty events', () => {
      expect(AnalyticsCalculator.calculateErrorRate([])).toBe(0);
    });

    it('should calculate ratio of error events', () => {
      const events = [
        makeEvent({ status: 'success' }),
        makeEvent({ status: 'error' }),
        makeEvent({ status: 'success' }),
        makeEvent({ status: 'error' }),
      ];

      expect(AnalyticsCalculator.calculateErrorRate(events)).toBe(0.5);
    });

    it('should return 0 when no errors', () => {
      const events = [makeEvent(), makeEvent(), makeEvent()];
      expect(AnalyticsCalculator.calculateErrorRate(events)).toBe(0);
    });

    it('should return 1 when all errors', () => {
      const events = [makeEvent({ status: 'error' }), makeEvent({ status: 'error' })];
      expect(AnalyticsCalculator.calculateErrorRate(events)).toBe(1);
    });
  });

  describe('calculateConfidence', () => {
    it('should cap at 0.95', () => {
      expect(AnalyticsCalculator.calculateConfidence(100, 10)).toBe(0.95);
    });

    it('should return proportional value for small counts', () => {
      expect(AnalyticsCalculator.calculateConfidence(5, 50)).toBe(0.1);
    });

    it('should return 0 when count is 0', () => {
      expect(AnalyticsCalculator.calculateConfidence(0, 100)).toBe(0);
    });
  });

  describe('calculateTrend', () => {
    it('should return stable for fewer than 10 events', () => {
      const events = Array.from({ length: 5 }, () => makeEvent());
      expect(AnalyticsCalculator.calculateTrend(events, 'count')).toBe('stable');
    });

    it('should return increasing when second half has more events', () => {
      // 12 events: split = 6 and 6, second half would be equal => need to use errors for asymmetry
      const events = Array.from({ length: 14 }, (_, i) =>
        makeEvent({ status: i < 7 ? 'success' : 'error' })
      );

      // count metric — both halves have 7 events, should be stable
      expect(AnalyticsCalculator.calculateTrend(events, 'count')).toBe('stable');

      // errors: first half 0 errors, second half 7 errors = huge increase
      expect(AnalyticsCalculator.calculateTrend(events, 'errors')).toBe('increasing');
    });

    it('should return stable when halves differ by less than 10%', () => {
      const events = Array.from({ length: 20 }, () => makeEvent({ status: 'success' }));

      // count is equal between halves
      expect(AnalyticsCalculator.calculateTrend(events, 'count')).toBe('stable');
      expect(AnalyticsCalculator.calculateTrend(events, 'errors')).toBe('stable');
    });

    it('should calculate latency trend', () => {
      const events = Array.from({ length: 20 }, (_, i) =>
        makeEvent({
          processingTime: i < 10 ? 100 : 1000,
        })
      );

      // Latency should be increasing (100 vs 1000 average)
      expect(AnalyticsCalculator.calculateTrend(events, 'latency')).toBe('increasing');
    });
  });

  describe('calculateAvgLatency', () => {
    it('should return 0 for empty events', () => {
      expect(AnalyticsCalculator.calculateAvgLatency([])).toBe(0);
    });

    it('should return 0 when no events have processingTime', () => {
      const events = [
        makeEvent({ processingTime: undefined }),
        makeEvent({ processingTime: undefined }),
      ];
      expect(AnalyticsCalculator.calculateAvgLatency(events)).toBe(0);
    });

    it('should average the processingTimes', () => {
      const events = [makeEvent({ processingTime: 100 }), makeEvent({ processingTime: 300 })];
      expect(AnalyticsCalculator.calculateAvgLatency(events)).toBe(200);
    });
  });

  describe('aggregateTimeSeries', () => {
    it('should return empty array for empty events', () => {
      expect(AnalyticsCalculator.aggregateTimeSeries([])).toEqual([]);
    });

    it('should bucket events by hour (default bucket size)', () => {
      const events = [
        makeEvent({ timestamp: '2024-06-15T09:00:00.000Z', processingTime: 100 }),
        makeEvent({ timestamp: '2024-06-15T09:30:00.000Z', processingTime: 300 }),
        makeEvent({ timestamp: '2024-06-15T10:00:00.000Z', processingTime: 500 }),
      ];

      const buckets = AnalyticsCalculator.aggregateTimeSeries(events);

      expect(buckets).toHaveLength(2);
      expect(buckets[0].count).toBe(2); // 9 AM bucket
      expect(buckets[0].avgProcessingTime).toBeGreaterThan(0);
      expect(buckets[1].count).toBe(1); // 10 AM bucket
    });
  });

  describe('analyzeProviderPatterns', () => {
    it('should return empty array for empty events', () => {
      expect(AnalyticsCalculator.analyzeProviderPatterns([])).toEqual([]);
    });

    it('should detect dominant provider (>50% usage)', () => {
      const events = [
        makeEvent({ provider: 'discord' }),
        makeEvent({ provider: 'discord' }),
        makeEvent({ provider: 'discord' }),
        makeEvent({ provider: 'slack' }),
      ];

      const patterns = AnalyticsCalculator.analyzeProviderPatterns(events);
      expect(patterns.length).toBeGreaterThan(0);

      const discordPattern = patterns.find((p) => p.name === 'Discord Preference');
      expect(discordPattern).toBeDefined();
      if (discordPattern) {
        expect(discordPattern.frequency).toBe(0.75);
        expect(discordPattern.segments).toContain('discord-user');
      }
    });

    it('should not create pattern when no provider dominates', () => {
      const events = [makeEvent({ provider: 'discord' }), makeEvent({ provider: 'slack' })];

      const patterns = AnalyticsCalculator.analyzeProviderPatterns(events);
      // 50% is not > 50%, so no pattern
      expect(patterns).toEqual([]);
    });
  });

  describe('analyzeTimePatterns', () => {
    it('should return empty array for empty events', () => {
      expect(AnalyticsCalculator.analyzeTimePatterns([])).toEqual([]);
    });

    it('should detect night owl pattern (>30% events between midnight and 5 AM)', () => {
      const events = Array.from({ length: 10 }, () => {
        const date = new Date('2024-06-15T03:00:00Z');
        return makeEvent({ timestamp: date.toISOString() });
      });

      const patterns = AnalyticsCalculator.analyzeTimePatterns(events);
      const nightPattern = patterns.find((p) => p.id === 'pattern-night-owl');

      expect(nightPattern).toBeDefined();
      if (nightPattern) {
        expect(nightPattern.name).toBe('Night Owl');
        expect(nightPattern.frequency).toBe(1);
      }
    });

    it('should not detect night owl when events are during daytime', () => {
      const events = Array.from({ length: 10 }, () => {
        const date = new Date('2024-06-15T12:00:00Z');
        return makeEvent({ timestamp: date.toISOString() });
      });

      const patterns = AnalyticsCalculator.analyzeTimePatterns(events);
      const nightPattern = patterns.find((p) => p.id === 'pattern-night-owl');

      expect(nightPattern).toBeUndefined();
    });
  });

  describe('aggregateUserActivity', () => {
    it('should return empty map for empty events', () => {
      const map = AnalyticsCalculator.aggregateUserActivity([]);
      expect(map.size).toBe(0);
    });

    it('should count events per user', () => {
      const events = [
        makeEvent({ userId: 'alice' }),
        makeEvent({ userId: 'bob' }),
        makeEvent({ userId: 'alice' }),
      ];

      const map = AnalyticsCalculator.aggregateUserActivity(events);
      expect(map.get('alice')).toBe(2);
      expect(map.get('bob')).toBe(1);
    });

    it('should use anonymous for events without userId', () => {
      const events = [makeEvent({ userId: '' }), makeEvent({ userId: '' })];

      const map = AnalyticsCalculator.aggregateUserActivity(events);
      expect(map.get('anonymous')).toBe(2);
    });
  });
});
