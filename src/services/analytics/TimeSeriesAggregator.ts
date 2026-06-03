import type { MessageFlowEvent } from '../../server/services/WebSocketService';
import { type TimeSeriesBucket } from './AnalyticsConstants';

/**
 * Aggregates message flow events into time-series buckets.
 */
export class TimeSeriesAggregator {
  public aggregate(events: MessageFlowEvent[]): TimeSeriesBucket[] {
    if (events.length === 0) {
      return [];
    }

    const buckets = new Map<
      string,
      { count: number; errors: number; totalLatency: number; latencyCount: number }
    >();

    events.forEach((e) => {
      // Round to nearest minute
      const date = new Date(e.timestamp);
      date.setSeconds(0, 0);
      const key = date.toISOString();

      const bucket = buckets.get(key) || { count: 0, errors: 0, totalLatency: 0, latencyCount: 0 };
      bucket.count++;
      if (e.status === 'error') bucket.errors++;
      if (e.processingTime) {
        bucket.totalLatency += e.processingTime;
        bucket.latencyCount++;
      }
      buckets.set(key, bucket);
    });

    return Array.from(buckets.entries())
      .map(([timestamp, data]) => ({
        timestamp,
        count: data.count,
        errors: data.errors,
        avgProcessingTime: data.latencyCount > 0 ? data.totalLatency / data.latencyCount : 0,
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }
}
