import { MessageTracker } from '../../../src/server/services/websocket/broadcast/MessageTracker';
import {
  DeliveryStatus,
  type AckPayload,
  type MessageEnvelope,
  type RequestMissedPayload,
} from '../../../src/types/websocket';

function makeEnvelope(
  overrides: Partial<MessageEnvelope> & {
    id?: string;
    channel?: string;
    sequence?: number;
    timestamp?: string;
    deliveryStatus?: DeliveryStatus;
    retryCount?: number;
    acknowledgedAt?: string;
  } = {}
): MessageEnvelope {
  const env: any = {
    messageId:
      overrides.messageId || `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    sequenceNumber: overrides.sequenceNumber || 1,
    event: overrides.event || 'test_event',
    payload: overrides.payload || {},
    sentAt: overrides.sentAt || new Date().toISOString(),
    status: overrides.status || DeliveryStatus.SENT,
    attempts: overrides.attempts || 1,
    // Fields used via 'as any' by MessageTracker
    id:
      overrides.id ||
      overrides.messageId ||
      `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    channel: overrides.channel || 'default',
    sequence: overrides.sequence || overrides.sequenceNumber || 1,
    timestamp: overrides.timestamp || overrides.sentAt || new Date().toISOString(),
    deliveryStatus: overrides.deliveryStatus || overrides.status || DeliveryStatus.SENT,
    retryCount: overrides.retryCount ?? 0,
    acknowledgedAt: overrides.acknowledgedAt,
  };
  return env;
}

function makeAck(messageId: string, timestamp?: string): AckPayload {
  return { messageId, timestamp: timestamp || new Date().toISOString() } as any;
}

function makeRequestMissed(channel: string, lastSequence: number): RequestMissedPayload {
  return { channel, lastSequence } as any;
}

describe('MessageTracker', () => {
  let tracker: MessageTracker;

  beforeEach(() => {
    tracker = new MessageTracker();
    tracker.configureAck({ enabled: true, messageTimeoutMs: 10000 });
  });

  describe('getNextSequence', () => {
    it('should return 1 for first sequence in a channel', () => {
      expect(tracker.getNextSequence('main')).toBe(1);
    });

    it('should increment sequences per channel', () => {
      expect(tracker.getNextSequence('main')).toBe(1);
      expect(tracker.getNextSequence('main')).toBe(2);
      expect(tracker.getNextSequence('main')).toBe(3);
    });

    it('should maintain separate sequences per channel', () => {
      expect(tracker.getNextSequence('main')).toBe(1);
      expect(tracker.getNextSequence('side')).toBe(1);
      expect(tracker.getNextSequence('main')).toBe(2);
      expect(tracker.getNextSequence('side')).toBe(2);
    });
  });

  describe('trackMessage', () => {
    it('should increment sent count', () => {
      tracker.trackMessage(makeEnvelope({ id: 'msg-1' }) as any);
      const stats = tracker.getStats();
      expect(stats.totalSent).toBe(1);
      expect(stats.pendingCount).toBe(1);
    });

    it('should not track messages when acks are disabled', () => {
      tracker.configureAck({ enabled: false });
      tracker.trackMessage(makeEnvelope({ id: 'msg-1' }) as any);
      const stats = tracker.getStats();
      expect(stats.totalSent).toBe(0);
      expect(stats.pendingCount).toBe(0);
    });

    it('should store message in channel history', () => {
      const env = makeEnvelope({ id: 'msg-1', channel: 'main', sequence: 5 }) as any;
      tracker.trackMessage(env);

      const history = tracker.getHistory('main');
      expect(history).toHaveLength(1);
      expect((history[0] as any).id).toBe('msg-1');
    });

    it('should cap channel history at 100', () => {
      for (let i = 0; i < 150; i++) {
        tracker.trackMessage(
          makeEnvelope({ id: `msg-${i}`, channel: 'main', sequence: i + 1 }) as any
        );
      }
      const history = tracker.getHistory('main');
      expect(history).toHaveLength(100);
      expect((history[0] as any).id).toBe('msg-50');
    });
  });

  describe('handleAck', () => {
    it('should acknowledge a tracked message', () => {
      const env = makeEnvelope({ id: 'msg-1', timestamp: '2024-01-01T00:00:00.000Z' }) as any;
      tracker.trackMessage(env);

      const result = tracker.handleAck(makeAck('msg-1', '2024-01-01T00:00:01.000Z'));
      expect(result).toBe(true);

      const stats = tracker.getStats();
      expect(stats.totalAcknowledged).toBe(1);
      expect(stats.pendingCount).toBe(0);
      expect(stats.averageAckLatencyMs).toBe(1000);
    });

    it('should return false for unknown message id', () => {
      expect(tracker.handleAck(makeAck('nonexistent'))).toBe(false);
    });

    it('should update delivery status to ACKNOWLEDGED', () => {
      const env = makeEnvelope({ id: 'msg-1' }) as any;
      tracker.trackMessage(env);

      tracker.handleAck(makeAck('msg-1'));
      const stats = tracker.getStats();
      expect(stats.totalAcknowledged).toBe(1);
    });
  });

  describe('timeout behavior', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it('should mark message as timed out after messageTimeoutMs', () => {
      tracker.configureAck({ enabled: true, messageTimeoutMs: 5000 });
      const env = makeEnvelope({ id: 'msg-1' }) as any;
      tracker.trackMessage(env);

      jest.advanceTimersByTime(5000);

      const stats = tracker.getStats();
      expect(stats.totalTimedOut).toBe(1);
      expect(stats.totalSent).toBe(1);
      expect(stats.pendingCount).toBe(0);
    });

    it('should clear timeout when ack arrives before timeout', () => {
      tracker.configureAck({ enabled: true, messageTimeoutMs: 5000 });
      const env = makeEnvelope({ id: 'msg-1' }) as any;
      tracker.trackMessage(env);

      jest.advanceTimersByTime(2000);
      tracker.handleAck(makeAck('msg-1'));
      jest.advanceTimersByTime(4000);

      const stats = tracker.getStats();
      expect(stats.totalTimedOut).toBe(0);
      expect(stats.totalAcknowledged).toBe(1);
    });
  });

  describe('handleRequestMissed', () => {
    it('should return messages with sequence > lastSequence for the channel', () => {
      tracker.trackMessage(makeEnvelope({ id: 'm1', channel: 'main', sequence: 1 }) as any);
      tracker.trackMessage(makeEnvelope({ id: 'm2', channel: 'main', sequence: 2 }) as any);
      tracker.trackMessage(makeEnvelope({ id: 'm3', channel: 'main', sequence: 3 }) as any);
      tracker.trackMessage(makeEnvelope({ id: 'm4', channel: 'main', sequence: 4 }) as any);

      const missed = tracker.handleRequestMissed(makeRequestMissed('main', 2));
      expect(missed).toHaveLength(2);
      expect((missed[0] as any).id).toBe('m3');
      expect((missed[1] as any).id).toBe('m4');
    });

    it('should return empty array when no messages are missed', () => {
      tracker.trackMessage(makeEnvelope({ id: 'm1', channel: 'main', sequence: 1 }) as any);
      const missed = tracker.handleRequestMissed(makeRequestMissed('main', 5));
      expect(missed).toEqual([]);
    });

    it('should return empty array for unknown channel', () => {
      const missed = tracker.handleRequestMissed(makeRequestMissed('unknown', 0));
      expect(missed).toEqual([]);
    });
  });

  describe('getStats', () => {
    it('should calculate delivery success rate correctly', () => {
      tracker.trackMessage(makeEnvelope({ id: 'a1' }) as any);
      tracker.trackMessage(makeEnvelope({ id: 'a2' }) as any);
      tracker.trackMessage(makeEnvelope({ id: 'a3' }) as any);

      tracker.handleAck(makeAck('a1'));
      tracker.handleAck(makeAck('a2'));

      const stats = tracker.getStats() as any;
      expect(stats.totalSent).toBe(3);
      expect(stats.totalAcknowledged).toBe(2);
      expect(stats.successRate).toBeGreaterThan(0);
    });

    it('should return 0 for delivery success rate when nothing completed', () => {
      const stats = tracker.getStats() as any;
      expect(stats.totalSent).toBe(0);
      expect(stats.totalAcknowledged).toBe(0);
      expect(stats.successRate).toBe(0);
    });
  });

  describe('clear', () => {
    it('should reset all state and clear timers', () => {
      jest.useFakeTimers();

      tracker.trackMessage(makeEnvelope({ id: 'a1', channel: 'main', sequence: 1 }) as any);
      tracker.handleAck(makeAck('a1'));
      tracker.trackMessage(makeEnvelope({ id: 'a2' }) as any);

      tracker.clear();

      const stats = tracker.getStats();
      expect(stats.totalSent).toBe(0);
      expect(stats.totalAcknowledged).toBe(0);
      expect(stats.pendingCount).toBe(0);

      jest.useRealTimers();
    });
  });
});
