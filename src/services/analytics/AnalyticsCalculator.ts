import { 
  ONE_HOUR_MS, 
  ONE_MINUTE_MS 
} from '../../common/constants/time';
import { type MessageFlowEvent } from '../../server/services/websocket/types';
import { 
  BehaviorPattern, 
  TimeSeriesBucket 
} from './types';

/**
 * Utility for performing analytics calculations on message events
 */
export class AnalyticsCalculator {
  /**
   * Calculate message frequency (messages per minute)
   */
  static calculateMessageFrequency(events: MessageFlowEvent[]): number {
    if (events.length < 2) return 0;

    const sortedEvents = [...events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    const first = new Date(sortedEvents[0].timestamp).getTime();
    const last = new Date(sortedEvents[sortedEvents.length - 1].timestamp).getTime();
    const durationMin = (last - first) / ONE_MINUTE_MS;

    return durationMin > 0 ? sortedEvents.length / durationMin : 0;
  }

  /**
   * Calculate error rate (0-1)
   */
  static calculateErrorRate(events: MessageFlowEvent[]): number {
    if (events.length === 0) return 0;
    const errors = events.filter((e) => e.status === 'error').length;
    return errors / events.length;
  }

  /**
   * Calculate confidence score (0-1) based on sample size
   */
  static calculateConfidence(count: number, threshold: number): number {
    return Math.min(count / threshold, 0.95);
  }

  /**
   * Calculate trend (increasing, decreasing, or stable)
   */
  static calculateTrend(
    events: MessageFlowEvent[],
    metric: 'count' | 'errors' | 'latency'
  ): 'increasing' | 'decreasing' | 'stable' {
    if (events.length < 10) return 'stable';

    // Split into two halves and compare
    const mid = Math.floor(events.length / 2);
    const firstHalf = events.slice(0, mid);
    const secondHalf = events.slice(mid);

    let v1 = 0;
    let v2 = 0;

    if (metric === 'count') {
      v1 = firstHalf.length;
      v2 = secondHalf.length;
    } else if (metric === 'errors') {
      v1 = firstHalf.filter((e) => e.status === 'error').length;
      v2 = secondHalf.filter((e) => e.status === 'error').length;
    } else {
      v1 = this.calculateAvgLatency(firstHalf);
      v2 = this.calculateAvgLatency(secondHalf);
    }

    const diff = (v2 - v1) / (v1 || 1);
    if (diff > 0.1) return 'increasing';
    if (diff < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Calculate average latency
   */
  static calculateAvgLatency(events: MessageFlowEvent[]): number {
    const validLatencies = events
      .filter((e) => e.processingTime !== undefined)
      .map((e) => e.processingTime as number);

    if (validLatencies.length === 0) return 0;
    return validLatencies.reduce((sum, val) => sum + val, 0) / validLatencies.length;
  }

  /**
   * Aggregate events into time-series buckets
   */
  static aggregateTimeSeries(
    events: MessageFlowEvent[],
    bucketSizeMs = ONE_HOUR_MS
  ): TimeSeriesBucket[] {
    if (events.length === 0) return [];

    const buckets = new Map<string, TimeSeriesBucket>();

    events.forEach((event) => {
      const time = new Date(event.timestamp).getTime();
      const bucketTime = new Date(Math.floor(time / bucketSizeMs) * bucketSizeMs).toISOString();

      const current = buckets.get(bucketTime) || {
        timestamp: bucketTime,
        count: 0,
        errors: 0,
        avgProcessingTime: 0,
      };

      current.count++;
      if (event.status === 'error') current.errors++;
      if (event.processingTime) {
        // Simple running average update
        current.avgProcessingTime =
          (current.avgProcessingTime * (current.count - 1) + event.processingTime) / current.count;
      }

      buckets.set(bucketTime, current);
    });

    return Array.from(buckets.values()).sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
  }

  /**
   * Analyze provider usage patterns
   */
  static analyzeProviderPatterns(events: MessageFlowEvent[]): BehaviorPattern[] {
    const providers = new Map<string, number>();
    events.forEach((e) => {
      if (e.provider) providers.set(e.provider, (providers.get(e.provider) || 0) + 1);
    });

    const patterns: BehaviorPattern[] = [];
    providers.forEach((count, name) => {
      if (count > events.length * 0.5) {
        patterns.push({
          id: `pattern-provider-${name}`,
          name: `${name.charAt(0).toUpperCase() + name.slice(1)} Preference`,
          description: `User primarily uses the ${name} platform for communication`,
          frequency: count / events.length,
          confidence: this.calculateConfidence(count, 20),
          trend: 'stable',
          segments: [`${name}-user`],
          recommendedWidgets: [`${name}-stats`, 'activity-feed'],
          priority: 2,
        });
      }
    });

    return patterns;
  }

  /**
   * Analyze time-based usage patterns
   */
  static analyzeTimePatterns(events: MessageFlowEvent[]): BehaviorPattern[] {
    const hourCounts = new Array(24).fill(0);
    events.forEach((e) => {
      const hour = new Date(e.timestamp).getHours();
      hourCounts[hour]++;
    });

    const patterns: BehaviorPattern[] = [];

    // Night owl pattern (12 AM - 5 AM)
    const nightCount = hourCounts.slice(0, 5).reduce((a, b) => a + b, 0);
    if (nightCount > events.length * 0.3) {
      patterns.push({
        id: 'pattern-night-owl',
        name: 'Night Owl',
        description: 'User is most active during late night hours',
        frequency: nightCount / events.length,
        confidence: this.calculateConfidence(nightCount, 15),
        trend: 'stable',
        segments: ['late-night-user'],
        recommendedWidgets: ['system-health', 'audit-log'],
        priority: 3,
      });
    }

    return patterns;
  }

  /**
   * Aggregate activity by user
   */
  static aggregateUserActivity(events: MessageFlowEvent[]): Map<string, number> {
    const userMap = new Map<string, number>();
    events.forEach((e) => {
      const userId = e.userId || 'anonymous';
      userMap.set(userId, (userMap.get(userId) || 0) + 1);
    });
    return userMap;
  }
}
