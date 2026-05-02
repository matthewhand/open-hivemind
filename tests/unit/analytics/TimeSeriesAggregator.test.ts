import type { MessageFlowEvent } from '../../../src/server/services/WebSocketService';
import type { TimeSeriesBucket } from '../../../src/services/analytics/AnalyticsConstants';
import { TimeSeriesAggregator } from '../../../src/services/analytics/TimeSeriesAggregator';

function makeEvent(overrides: Partial<MessageFlowEvent> = {}): MessageFlowEvent {
  return {
    id: `evt-${Math.random().toString(36).substr(2, 6)}`,
    timestamp: new Date('2024-06-15T10:30:00Z').toISOString(),
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

describe('TimeSeriesAggregator', () => {
  let aggregator: TimeSeriesAggregator;

  beforeEach(() => {
    aggregator = new TimeSeriesAggregator();
  });

  it('should return empty array for empty events', () => {
    expect(aggregator.aggregate([])).toEqual([]);
  });

  it('should aggregate events into per-minute buckets', () => {
    const events: MessageFlowEvent[] = [
      makeEvent({ timestamp: '2024-06-15T10:30:15.000Z', processingTime: 100, status: 'success' }),
      makeEvent({ timestamp: '2024-06-15T10:30:45.000Z', processingTime: 200, status: 'success' }),
      makeEvent({ timestamp: '2024-06-15T10:31:00.000Z', processingTime: 300, status: 'error' }),
      makeEvent({ timestamp: '2024-06-15T10:31:15.000Z', processingTime: 400, status: 'success' }),
    ];

    const buckets = aggregator.aggregate(events);

    expect(buckets).toHaveLength(2);

    // First bucket: 10:30 (rounded to minute)
    expect(buckets[0].count).toBe(2);
    expect(buckets[0].errors).toBe(0);
    expect(buckets[0].avgProcessingTime).toBe(150); // (100 + 200) / 2

    // Second bucket: 10:31
    expect(buckets[1].count).toBe(2);
    expect(buckets[1].errors).toBe(1);
    expect(buckets[1].avgProcessingTime).toBe(350); // (300 + 400) / 2
  });

  it('should sort buckets by timestamp ascending', () => {
    const events: MessageFlowEvent[] = [
      makeEvent({ timestamp: '2024-06-15T12:00:00.000Z' }),
      makeEvent({ timestamp: '2024-06-15T10:00:00.000Z' }),
      makeEvent({ timestamp: '2024-06-15T11:00:00.000Z' }),
    ];

    const buckets = aggregator.aggregate(events);
    const timestamps = buckets.map((b) => b.timestamp);

    // Verify sorted in ascending order
    for (let i = 1; i < timestamps.length; i++) {
      expect(new Date(timestamps[i]).getTime()).toBeGreaterThan(
        new Date(timestamps[i - 1]).getTime()
      );
    }
  });

  it('should handle events with no processingTime', () => {
    const events: MessageFlowEvent[] = [
      makeEvent({ timestamp: '2024-06-15T10:30:00.000Z', processingTime: undefined }),
      makeEvent({ timestamp: '2024-06-15T10:30:15.000Z', processingTime: undefined }),
    ];

    const buckets = aggregator.aggregate(events);

    expect(buckets[0].avgProcessingTime).toBe(0);
  });

  it('should handle mixed processing times', () => {
    const events: MessageFlowEvent[] = [
      makeEvent({ timestamp: '2024-06-15T10:30:00.000Z', processingTime: 100 }),
      makeEvent({ timestamp: '2024-06-15T10:30:10.000Z', processingTime: undefined }),
    ];

    const buckets = aggregator.aggregate(events);

    // Only one event had processingTime, so avg = 100 / 1
    expect(buckets[0].avgProcessingTime).toBe(100);
  });

  it('should round timestamps to the nearest minute', () => {
    const events: MessageFlowEvent[] = [
      makeEvent({ timestamp: '2024-06-15T10:30:59.999Z' }),
      makeEvent({ timestamp: '2024-06-15T10:30:01.000Z' }),
    ];

    const buckets = aggregator.aggregate(events);

    // Both should fall into the same minute bucket (10:30:00)
    expect(buckets).toHaveLength(1);
    expect(buckets[0].count).toBe(2);
  });
});
