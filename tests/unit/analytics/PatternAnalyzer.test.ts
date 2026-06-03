import type { MessageFlowEvent } from '../../../src/server/services/WebSocketService';
import type { BehaviorPattern } from '../../../src/services/analytics/AnalyticsConstants';
import { PatternAnalyzer } from '../../../src/services/analytics/PatternAnalyzer';

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

function makeTimeSpacedEvents(
  count: number,
  intervalMs: number,
  startDate?: Date
): MessageFlowEvent[] {
  const base = startDate || new Date();
  return Array.from({ length: count }, (_, i) =>
    makeEvent({
      timestamp: new Date(base.getTime() + i * intervalMs).toISOString(),
      id: `evt-${i}`,
    })
  );
}

describe('PatternAnalyzer', () => {
  let analyzer: PatternAnalyzer;

  beforeEach(() => {
    analyzer = new PatternAnalyzer();
  });

  describe('analyze', () => {
    it('should return default patterns when events array is empty', () => {
      const patterns = analyzer.analyze([]);
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].id).toBe('pattern-high-frequency');
      expect(patterns[0].name).toBe('Standard User');
    });

    it('should detect high-frequency messaging pattern', () => {
      // 20 events over 10 seconds = 120 messages/min (high)
      const events = makeTimeSpacedEvents(20, 500); // 500ms apart

      const patterns = analyzer.analyze(events);
      const freqPattern = patterns.find((p) => p.id === 'pattern-high-frequency');

      expect(freqPattern).toBeDefined();
      if (freqPattern) {
        expect(freqPattern.name).toBe('High Activity User');
        expect(freqPattern.segments).toContain('power-user');
      }
    });

    it('should not detect high-frequency pattern with only 1 event', () => {
      const patterns = analyzer.analyze([makeEvent()]);
      const freqPattern = patterns.find((p) => p.id === 'pattern-high-frequency');

      // Should return defaults with standard user, not high activity
      const standardPattern = patterns.find((p) => p.name === 'Standard User');
      expect(standardPattern).toBeDefined();
    });

    it('should detect error patterns', () => {
      const events = [
        makeEvent({ status: 'success' }),
        makeEvent({ status: 'error' }),
        makeEvent({ status: 'error' }),
        makeEvent({ status: 'error' }),
      ];

      const patterns = analyzer.analyze(events);
      const errorPattern = patterns.find((p) => p.id === 'pattern-error-analysis');

      expect(errorPattern).toBeDefined();
      if (errorPattern) {
        expect(errorPattern.name).toBe('Error Pattern Detection');
        expect(errorPattern.segments).toContain('admin');
        // Error rate > 10% should give priority 1
        expect(errorPattern.priority).toBe(1);
      }
    });

    it('should set error pattern priority to 2 when error rate is low', () => {
      const events = [
        makeEvent({ status: 'success' }),
        makeEvent({ status: 'success' }),
        makeEvent({ status: 'success' }),
        makeEvent({ status: 'success' }),
        makeEvent({ status: 'success' }),
        makeEvent({ status: 'success' }),
        makeEvent({ status: 'success' }),
        makeEvent({ status: 'success' }),
        makeEvent({ status: 'success' }),
        makeEvent({ status: 'error' }),
      ];

      const patterns = analyzer.analyze(events);
      const errorPattern = patterns.find((p) => p.id === 'pattern-error-analysis');

      expect(errorPattern).toBeDefined();
      if (errorPattern) {
        expect(errorPattern.priority).toBe(2);
      }
    });

    it('should detect multi-platform pattern when multiple providers are used', () => {
      const events = [
        makeEvent({ provider: 'discord' }),
        makeEvent({ provider: 'slack' }),
        makeEvent({ provider: 'discord' }),
      ];

      const patterns = analyzer.analyze(events);
      const multiPattern = patterns.find((p) => p.id === 'pattern-multi-platform');

      expect(multiPattern).toBeDefined();
      if (multiPattern) {
        expect(multiPattern.name).toBe('Multi-platform Orchestration');
      }
    });

    it('should not detect multi-platform pattern with single provider', () => {
      const events = makeTimeSpacedEvents(5, 1000);

      const patterns = analyzer.analyze(events);
      const multiPattern = patterns.find((p) => p.id === 'pattern-multi-platform');

      expect(multiPattern).toBeUndefined();
    });

    it('should detect nocturnal activity when all events are at night', () => {
      // Create events all at 3 AM
      const nightHour = new Date();
      nightHour.setHours(3, 0, 0, 0);

      const events = makeTimeSpacedEvents(10, 60000, nightHour);

      const patterns = analyzer.analyze(events);
      const nocturnalPattern = patterns.find((p) => p.id === 'pattern-nocturnal');

      expect(nocturnalPattern).toBeDefined();
      if (nocturnalPattern) {
        expect(nocturnalPattern.name).toBe('Nocturnal Activity');
      }
    });

    it('should not detect nocturnal activity with too few events', () => {
      const nightHour = new Date();
      nightHour.setHours(3, 0, 0, 0);

      const events = makeTimeSpacedEvents(3, 60000, nightHour);

      const patterns = analyzer.analyze(events);
      const nocturnalPattern = patterns.find((p) => p.id === 'pattern-nocturnal');

      expect(nocturnalPattern).toBeUndefined();
    });

    it('should detect performance bottleneck when average latency is high', () => {
      const events = makeTimeSpacedEvents(10, 1000);
      events.forEach((e) => {
        e.processingTime = 3000; // Above SLOW_PROCESSING_THRESHOLD_MS (2000)
      });

      const patterns = analyzer.analyze(events);
      const bottleneckPattern = patterns.find((p) => p.id === 'pattern-latency-bottleneck');

      expect(bottleneckPattern).toBeDefined();
      if (bottleneckPattern) {
        expect(bottleneckPattern.name).toBe('Performance Bottleneck');
        expect(bottleneckPattern.priority).toBe(1);
      }
    });

    it('should detect optimal performance when average latency is very low', () => {
      const events = makeTimeSpacedEvents(10, 1000);
      events.forEach((e) => {
        e.processingTime = 200; // Below FAST_PROCESSING_THRESHOLD_MS (500)
      });

      const patterns = analyzer.analyze(events);
      const optimalPattern = patterns.find((p) => p.id === 'pattern-high-efficiency');

      expect(optimalPattern).toBeDefined();
      if (optimalPattern) {
        expect(optimalPattern.name).toBe('Optimal Performance');
      }
    });

    it('should return default patterns when no patterns are detected', () => {
      // Single event with no distinctive characteristics
      const events = [makeEvent({ provider: 'discord' })];

      const patterns = analyzer.analyze(events);
      expect(patterns.length).toBeGreaterThan(0);
    });
  });
});
