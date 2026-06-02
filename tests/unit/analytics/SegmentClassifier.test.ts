import type { MessageFlowEvent } from '../../../src/server/services/WebSocketService';
import type { UserSegment } from '../../../src/services/analytics/AnalyticsConstants';
import { SegmentClassifier } from '../../../src/services/analytics/SegmentClassifier';

function makeEvent(overrides: Partial<MessageFlowEvent> = {}): MessageFlowEvent {
  return {
    id: `evt-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date().toISOString(),
    botName: 'TestBot',
    provider: 'discord',
    channelId: 'ch-1',
    userId: overrides.userId || 'user-1',
    messageType: 'outgoing',
    contentLength: 50,
    processingTime: 200,
    status: 'success',
    ...overrides,
  };
}

function generateEventsForUser(userId: string, count: number): MessageFlowEvent[] {
  return Array.from({ length: count }, () => makeEvent({ userId }));
}

describe('SegmentClassifier', () => {
  let classifier: SegmentClassifier;

  beforeEach(() => {
    classifier = new SegmentClassifier();
  });

  describe('classify', () => {
    it('should return default segments when events array is empty', () => {
      const segments = classifier.classify([]);
      expect(segments.length).toBeGreaterThan(0);
    });

    it('should classify a power user (>50 events)', () => {
      const events = generateEventsForUser('power-user-1', 60);

      const segments = classifier.classify(events);
      const powerSegment = segments.find((s) => s.id === 'segment-power-users');

      expect(powerSegment).toBeDefined();
      if (powerSegment) {
        expect(powerSegment.name).toBe('Power Users');
        expect(powerSegment.criteria.usageFrequency).toBe('daily');
        expect(powerSegment.size).toBe(1);
      }
    });

    it('should classify a regular user (11-50 events)', () => {
      const events = generateEventsForUser('regular-user-1', 20);

      const segments = classifier.classify(events);
      const regularSegment = segments.find((s) => s.id === 'segment-regular-users');

      expect(regularSegment).toBeDefined();
      if (regularSegment) {
        expect(regularSegment.name).toBe('Regular Users');
        expect(regularSegment.criteria.usageFrequency).toBe('weekly');
        expect(regularSegment.size).toBe(1);
      }
    });

    it('should classify a casual user (<=10 events)', () => {
      const events = generateEventsForUser('casual-user-1', 5);

      const segments = classifier.classify(events);
      const casualSegment = segments.find((s) => s.id === 'segment-casual-users');

      expect(casualSegment).toBeDefined();
      if (casualSegment) {
        expect(casualSegment.name).toBe('Casual Users');
        expect(casualSegment.criteria.usageFrequency).toBe('monthly');
        expect(casualSegment.size).toBe(1);
      }
    });

    it('should classify multiple users into different segments', () => {
      const events = [
        ...generateEventsForUser('power-user', 60),
        ...generateEventsForUser('regular-user', 20),
        ...generateEventsForUser('casual-user', 5),
      ];

      const segments = classifier.classify(events);
      expect(segments.length).toBe(3);

      const ids = segments.map((s) => s.id);
      expect(ids).toContain('segment-power-users');
      expect(ids).toContain('segment-regular-users');
      expect(ids).toContain('segment-casual-users');
    });

    it('should detect features based on provider and latency', () => {
      const events = Array.from({ length: 60 }, (_, i) =>
        makeEvent({
          userId: 'power-user',
          provider: 'slack',
          processingTime: i % 2 === 0 ? 3000 : 200,
        })
      );

      const segments = classifier.classify(events);
      const powerSegment = segments.find((s) => s.id === 'segment-power-users');

      expect(powerSegment).toBeDefined();
      if (powerSegment) {
        expect(powerSegment.criteria.featureUsage).toContain('slack-integration');
        expect(powerSegment.criteria.featureUsage).toContain('complex-llm-tasks');
      }
    });

    it('should detect discord integration in feature usage', () => {
      const events = generateEventsForUser('discord-heavy', 60);
      // Override provider to discord
      events.forEach((e) => {
        e.provider = 'discord';
      });

      const segments = classifier.classify(events);
      const powerSegment = segments.find((s) => s.id === 'segment-power-users');

      expect(powerSegment).toBeDefined();
      if (powerSegment) {
        expect(powerSegment.criteria.featureUsage).toContain('discord-integration');
      }
    });

    it('should return default segments when no segments are generated', () => {
      // The logic always returns defaults for empty events. Let's test an edge where
      // all users are casual (<=10 each) — this should still generate a segment.
      const events = generateEventsForUser('casual', 3);

      const segments = classifier.classify(events);
      // Should have the casual users segment
      const casualSegment = segments.find((s) => s.id === 'segment-casual-users');
      expect(casualSegment).toBeDefined();
    });
  });

  // These tests pin down the behaviour of the optimized `getTopFeatures` pass
  // (Set-based membership + early exit) via the public `classify` API. They
  // guard against regressions in the feature-detection edge cases.
  describe('feature usage detection (getTopFeatures)', () => {
    function powerFeatures(events: MessageFlowEvent[]): string[] {
      const segment = classifier.classify(events).find((s) => s.id === 'segment-power-users');
      expect(segment).toBeDefined();
      return segment ? segment.criteria.featureUsage : [];
    }

    it('returns no feature tags when the only target events use an unknown provider and are fast', () => {
      const events = generateEventsForUser('p', 60).map((e) => ({
        ...e,
        provider: 'mattermost',
        processingTime: 100,
      }));

      expect(powerFeatures(events)).toEqual([]);
    });

    it('excludes events that belong to users outside the target group', () => {
      // The power user only ever uses discord with fast responses. A *different*
      // casual user has slack + slow events. Those must NOT leak into the
      // power-user feature set.
      const events = [
        ...generateEventsForUser('power', 60).map((e) => ({
          ...e,
          provider: 'discord',
          processingTime: 100,
        })),
        ...generateEventsForUser('casual-noise', 5).map((e) => ({
          ...e,
          provider: 'slack',
          processingTime: 9000,
        })),
      ];

      const features = powerFeatures(events);
      expect(features).toContain('discord-integration');
      expect(features).not.toContain('slack-integration');
      expect(features).not.toContain('complex-llm-tasks');
    });

    it("detects all three feature tags when present across a user's events", () => {
      const events = generateEventsForUser('power', 60).map((e, i) => {
        if (i === 0) return { ...e, provider: 'discord', processingTime: 100 };
        if (i === 1) return { ...e, provider: 'slack', processingTime: 100 };
        return { ...e, provider: 'discord', processingTime: 5000 };
      });

      const features = powerFeatures(events);
      expect(features).toEqual(
        expect.arrayContaining(['discord-integration', 'slack-integration', 'complex-llm-tasks'])
      );
      expect(features).toHaveLength(3);
    });

    it('does not flag complex-llm-tasks at the 2000ms boundary (strict >)', () => {
      const events = generateEventsForUser('power', 60).map((e) => ({
        ...e,
        provider: 'discord',
        processingTime: 2000,
      }));

      expect(powerFeatures(events)).not.toContain('complex-llm-tasks');
    });

    it('treats events with undefined processingTime as non-complex', () => {
      const events = generateEventsForUser('power', 60).map((e) => {
        const { processingTime: _omit, ...rest } = e;
        return rest as MessageFlowEvent;
      });

      expect(powerFeatures(events)).not.toContain('complex-llm-tasks');
    });

    it('returns the same feature set regardless of event ordering (early-exit safe)', () => {
      const base = generateEventsForUser('power', 60).map((e, i) => {
        if (i === 0) return { ...e, provider: 'slack', processingTime: 5000 };
        if (i === 1) return { ...e, provider: 'discord', processingTime: 100 };
        return { ...e, provider: 'discord', processingTime: 100 };
      });
      const reversed = [...base].reverse();

      expect([...powerFeatures(base)].sort()).toEqual([...powerFeatures(reversed)].sort());
    });
  });
});
