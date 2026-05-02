import type { MessageFlowEvent } from '../../../src/server/services/WebSocketService';
import type {
  BehaviorPattern,
  UserSegment,
} from '../../../src/services/analytics/AnalyticsConstants';
import { RecommendationEngine } from '../../../src/services/analytics/RecommendationEngine';

function makeEvent(overrides: Partial<MessageFlowEvent> = {}): MessageFlowEvent {
  return {
    id: `evt-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    botName: overrides.botName || 'BotA',
    provider: overrides.provider || 'discord',
    channelId: 'ch-1',
    userId: 'user-1',
    messageType: 'outgoing',
    contentLength: 50,
    processingTime: 200,
    status: 'success',
    ...overrides,
  };
}

function makePattern(overrides: Partial<BehaviorPattern> = {}): BehaviorPattern {
  return {
    id: 'pattern-test',
    name: 'Test Pattern',
    description: 'A test pattern',
    frequency: 0.5,
    confidence: 0.8,
    trend: 'stable',
    segments: ['regular'],
    recommendedWidgets: ['widget-1'],
    priority: 2,
    ...overrides,
  };
}

function makeSegment(overrides: Partial<UserSegment> = {}): UserSegment {
  return {
    id: 'segment-power-users',
    name: 'Power Users',
    description: 'High engagement users',
    criteria: {
      behaviorPatterns: ['high-frequency', 'multi-tool'],
      usageFrequency: 'daily',
      featureUsage: ['mcp'],
      engagementLevel: 'high',
    },
    characteristics: {
      preferredWidgets: ['performance-metrics'],
      optimalLayout: 'grid-dense',
      themePreference: 'dark',
      notificationFrequency: 0.9,
    },
    size: 10,
    confidence: 0.85,
    ...overrides,
  };
}

describe('RecommendationEngine', () => {
  let engine: RecommendationEngine;

  beforeEach(() => {
    engine = new RecommendationEngine();
  });

  describe('generate', () => {
    it('should return default recommendations when events array is empty', () => {
      const recs = engine.generate([], [], []);
      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].type).toBeDefined();
    });

    it('should suggest dense layout for power users with many bots', () => {
      const events = [
        makeEvent({ botName: 'BotA' }),
        makeEvent({ botName: 'BotB' }),
        makeEvent({ botName: 'BotC' }),
        makeEvent({ botName: 'BotD' }),
        makeEvent({ botName: 'BotE' }),
        makeEvent({ botName: 'BotF' }),
      ];

      const segments = [makeSegment()]; // power user
      const patterns: BehaviorPattern[] = [];

      const recs = engine.generate(events, patterns, segments);
      const layoutRec = recs.find((r) => r.id === 'rec-layout-dense');

      expect(layoutRec).toBeDefined();
      if (layoutRec) {
        expect(layoutRec.type).toBe('layout');
        expect(layoutRec.title).toBe('Switch to Power User Layout');
        expect(layoutRec.confidence).toBe(0.95);
      }
    });

    it('should not suggest dense layout without power user segment', () => {
      const events = [
        makeEvent({ botName: 'BotA' }),
        makeEvent({ botName: 'BotB' }),
        makeEvent({ botName: 'BotC' }),
        makeEvent({ botName: 'BotD' }),
        makeEvent({ botName: 'BotE' }),
        makeEvent({ botName: 'BotF' }),
      ];

      const segments: UserSegment[] = [makeSegment({ id: 'segment-casual-users' })];
      const patterns: BehaviorPattern[] = [];

      const recs = engine.generate(events, patterns, segments);
      const layoutRec = recs.find((r) => r.id === 'rec-layout-dense');

      expect(layoutRec).toBeUndefined();
    });

    it('should suggest latency heatmap when bottleneck pattern is detected', () => {
      const events = [makeEvent()];
      const segments: UserSegment[] = [];
      const patterns = [makePattern({ id: 'pattern-latency-bottleneck' })];

      const recs = engine.generate(events, patterns, segments);
      const latencyRec = recs.find((r) => r.id === 'rec-widget-latency');

      expect(latencyRec).toBeDefined();
      if (latencyRec) {
        expect(latencyRec.type).toBe('widget');
        expect(latencyRec.title).toBe('Add Latency Heatmap');
        expect(latencyRec.impact).toBe('high');
      }
    });

    it('should suggest Discord timeout adjustment when Discord error rate is high', () => {
      const events = [
        makeEvent({ provider: 'discord', status: 'error' }),
        makeEvent({ provider: 'discord', status: 'error' }),
        makeEvent({ provider: 'discord', status: 'success' }),
      ];

      const segments: UserSegment[] = [];
      const patterns: BehaviorPattern[] = [];

      const recs = engine.generate(events, patterns, segments);
      const discordRec = recs.find((r) => r.id === 'rec-settings-discord-timeout');

      expect(discordRec).toBeDefined();
      if (discordRec) {
        expect(discordRec.type).toBe('settings');
        expect(discordRec.impact).toBe('medium');
      }
    });

    it('should not suggest Discord timeout when error rate is low', () => {
      const events = [
        makeEvent({ provider: 'discord', status: 'success' }),
        makeEvent({ provider: 'discord', status: 'success' }),
        makeEvent({ provider: 'discord', status: 'success' }),
        makeEvent({ provider: 'discord', status: 'success' }),
        makeEvent({ provider: 'discord', status: 'success' }),
        makeEvent({ provider: 'discord', status: 'success' }),
        makeEvent({ provider: 'discord', status: 'success' }),
        makeEvent({ provider: 'discord', status: 'success' }),
        makeEvent({ provider: 'discord', status: 'success' }),
        makeEvent({ provider: 'discord', status: 'error' }),
      ];

      const recs = engine.generate(events, [], []);
      const discordRec = recs.find((r) => r.id === 'rec-settings-discord-timeout');

      expect(discordRec).toBeUndefined();
    });

    it('should return default recommendations when no specific recommendations match', () => {
      const events = [makeEvent()];
      const segments: UserSegment[] = [makeSegment({ id: 'segment-casual-users' })];
      const patterns: BehaviorPattern[] = [];

      const recs = engine.generate(events, patterns, segments);
      expect(recs.length).toBeGreaterThan(0);
      // Should be the defaults
      expect(recs.some((r) => r.id === 'rec-dense-layout')).toBe(true);
    });

    it('should combine multiple recommendations when multiple conditions match', () => {
      const events = [
        makeEvent({ botName: 'BotA', provider: 'discord', status: 'error' }),
        makeEvent({ botName: 'BotB', provider: 'discord', status: 'error' }),
        makeEvent({ botName: 'BotC' }),
        makeEvent({ botName: 'BotD' }),
        makeEvent({ botName: 'BotE' }),
        makeEvent({ botName: 'BotF' }),
      ];

      const segments = [makeSegment()]; // power user
      const patterns = [makePattern({ id: 'pattern-latency-bottleneck' })];

      const recs = engine.generate(events, patterns, segments);

      // Should have layout + latency + discord
      expect(recs.find((r) => r.id === 'rec-layout-dense')).toBeDefined();
      expect(recs.find((r) => r.id === 'rec-widget-latency')).toBeDefined();
      expect(recs.find((r) => r.id === 'rec-settings-discord-timeout')).toBeDefined();
    });
  });
});
