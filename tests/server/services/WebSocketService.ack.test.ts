import 'reflect-metadata';
import { DeliveryStatus } from '../../../src/types/websocket';

// Stub out heavy dependencies so we can unit-test the ack logic in isolation.
jest.mock('../../../src/config/BotConfigurationManager', () => ({
  BotConfigurationManager: {
    getInstance: jest.fn().mockReturnValue({ getAllBots: () => [], getWarnings: () => [] }),
  },
}));
jest.mock('../../../src/services/ApiMonitorService', () => {
  const EventEmitter = require('events');
  class MockApiMonitor extends EventEmitter {
    syncLlmEndpoints = jest.fn();
    startAllMonitoring = jest.fn();
    getAllStatuses = jest.fn().mockReturnValue([]);
    getOverallHealth = jest.fn().mockReturnValue({ healthy: true });
    getAllEndpoints = jest.fn().mockReturnValue([]);
  }
  return { __esModule: true, default: MockApiMonitor };
});
jest.mock('../../../src/server/services/ActivityLogger', () => ({
  ActivityLogger: { getInstance: jest.fn().mockReturnValue({ log: jest.fn() }) },
}));
jest.mock('../../../src/server/services/BotMetricsService', () => ({
  BotMetricsService: {
    getInstance: jest.fn().mockReturnValue({
      incrementMessageCount: jest.fn(),
      incrementErrorCount: jest.fn(),
      getMetrics: jest.fn().mockReturnValue({ messageCount: 0, errorCount: 0 }),
      getAllMetrics: jest.fn().mockReturnValue({}),
    }),
  },
}));
jest.mock('tsyringe', () => ({
  container: { resolve: jest.fn().mockImplementation((cls: any) => new cls()) },
  injectable: () => (target: any) => target,
  singleton: () => (target: any) => target,
}));

import { WebSocketService } from '../../../src/server/services/WebSocketService';

describe('WebSocketService – message acknowledgment & delivery tracking', () => {
  let service: WebSocketService;

  beforeEach(() => {
    jest.useFakeTimers();
    // Reset singleton so each test gets a fresh instance
    (WebSocketService as any).instance = undefined;
    service = new WebSocketService();
    // Shorten timeout for tests
    service.configureAck({ messageTimeoutMs: 200, maxRetries: 1 });
  });

  afterEach(() => {
    service.shutdown();
    jest.useRealTimers();
  });

  // -------------------------------------------------------------------------
  // Message ID assignment
  // -------------------------------------------------------------------------
  it('assigns a unique messageId to each tracked message', () => {
    const env1 = service.sendTrackedMessage('test_event', { foo: 1 });
    const env2 = service.sendTrackedMessage('test_event', { foo: 2 });

    expect(env1.messageId).toBeDefined();
    expect(env2.messageId).toBeDefined();
    expect(env1.messageId).not.toBe(env2.messageId);
  });

  it('sets initial status to SENT', () => {
    const env = service.sendTrackedMessage('evt', {});
    expect(env.status).toBe(DeliveryStatus.SENT);
  });

  // -------------------------------------------------------------------------
  // Ack removes from pending
  // -------------------------------------------------------------------------
  it('removes a message from pending on ack', () => {
    const env = service.sendTrackedMessage('evt', {});
    expect(service.getDeliveryStats().pendingCount).toBe(1);

    const result = service.handleAck({ messageId: env.messageId });
    expect(result).toBe(true);
    expect(service.getDeliveryStats().pendingCount).toBe(0);
  });

  it('returns false when acking an unknown messageId', () => {
    expect(service.handleAck({ messageId: 'nonexistent' })).toBe(false);
  });

  // -------------------------------------------------------------------------
  // Timeout triggers retry then marks TIMED_OUT
  // -------------------------------------------------------------------------
  it('retries once then marks message as timed out', () => {
    service.sendTrackedMessage('evt', { data: 1 });

    // After first timeout: retry (attempts becomes 2)
    jest.advanceTimersByTime(250);
    let stats = service.getDeliveryStats();
    // Still pending (retried)
    expect(stats.pendingCount).toBe(1);
    // sent count increases for the retry
    expect(stats.totalSent).toBe(2);

    // After second timeout: timed out (maxRetries=1 means initial + 1 retry = 2 attempts max)
    jest.advanceTimersByTime(250);
    stats = service.getDeliveryStats();
    expect(stats.pendingCount).toBe(0);
    expect(stats.totalTimedOut).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Sequence numbers
  // -------------------------------------------------------------------------
  it('increments sequence numbers per channel', () => {
    service.sendTrackedMessage('evt', {}, 'channel-a');
    service.sendTrackedMessage('evt', {}, 'channel-a');
    service.sendTrackedMessage('evt', {}, 'channel-b');

    expect(service.getSequenceNumber('channel-a')).toBe(2);
    expect(service.getSequenceNumber('channel-b')).toBe(1);
    expect(service.getSequenceNumber('unknown')).toBe(0);
  });

  it('uses default channel when none specified', () => {
    service.sendTrackedMessage('evt', {});
    expect(service.getSequenceNumber('default')).toBe(1);
  });

  // -------------------------------------------------------------------------
  // Gap detection / request missed
  // -------------------------------------------------------------------------
  it('returns missed messages after a given sequence number', () => {
    service.sendTrackedMessage('evt', { n: 1 }, 'ch');
    service.sendTrackedMessage('evt', { n: 2 }, 'ch');
    service.sendTrackedMessage('evt', { n: 3 }, 'ch');

    const missed = service.handleRequestMissed({ channel: 'ch', lastSequence: 1 });
    expect(missed).toHaveLength(2);
    expect(missed[0].sequenceNumber).toBe(2);
    expect(missed[1].sequenceNumber).toBe(3);
  });

  it('returns empty array for unknown channel', () => {
    const missed = service.handleRequestMissed({ channel: 'nope', lastSequence: 0 });
    expect(missed).toHaveLength(0);
  });

  // -------------------------------------------------------------------------
  // Delivery stats tracking
  // -------------------------------------------------------------------------
  it('tracks delivery stats correctly', () => {
    const env1 = service.sendTrackedMessage('evt', {});
    const env2 = service.sendTrackedMessage('evt', {});
    service.sendTrackedMessage('evt', {});

    // Ack two
    service.handleAck({ messageId: env1.messageId });
    service.handleAck({ messageId: env2.messageId });

    // Let the third time out fully
    jest.advanceTimersByTime(500);

    const stats = service.getDeliveryStats();
    expect(stats.totalAcknowledged).toBe(2);
    expect(stats.totalTimedOut).toBe(1);
    expect(stats.pendingCount).toBe(0);
    // Success rate = 2 / (2 acked + 1 timed out) = 2/3
    expect(stats.deliverySuccessRate).toBeCloseTo(2 / 3, 2);
  });

  it('tracks average ack latency', () => {
    const env = service.sendTrackedMessage('evt', {});
    // Advance time before acking so latency > 0
    jest.advanceTimersByTime(50);
    service.handleAck({ messageId: env.messageId });

    const stats = service.getDeliveryStats();
    expect(stats.averageAckLatencyMs).toBeGreaterThanOrEqual(0);
  });

  it('returns zero stats when no messages have been sent', () => {
    const stats = service.getDeliveryStats();
    expect(stats.totalSent).toBe(0);
    expect(stats.totalAcknowledged).toBe(0);
    expect(stats.pendingCount).toBe(0);
    expect(stats.averageAckLatencyMs).toBe(0);
    expect(stats.deliverySuccessRate).toBe(0);
  });

  // -------------------------------------------------------------------------
  // configureAck
  // -------------------------------------------------------------------------
  it('allows reconfiguring ack settings', () => {
    service.configureAck({ messageTimeoutMs: 5000 });
    // Send a message – it should not time out in 200ms now
    service.sendTrackedMessage('evt', {});
    jest.advanceTimersByTime(300);
    expect(service.getDeliveryStats().pendingCount).toBe(1);
  });

  // -------------------------------------------------------------------------
  // shutdown cleans up timers
  // -------------------------------------------------------------------------
  it('clears pending state on shutdown', () => {
    service.sendTrackedMessage('evt', {});
    service.sendTrackedMessage('evt', {});
    expect(service.getDeliveryStats().pendingCount).toBe(2);

    service.shutdown();

    expect(service.getDeliveryStats().pendingCount).toBe(0);
    expect(service.getDeliveryStats().totalSent).toBe(0);
  });
});
