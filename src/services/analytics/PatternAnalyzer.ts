import { FAST_PROCESSING_THRESHOLD_MS, SLOW_PROCESSING_THRESHOLD_MS } from '@common/constants/time';
import type { MessageFlowEvent } from '../../server/services/WebSocketService';
import { DEFAULT_BEHAVIOR_PATTERNS, type BehaviorPattern } from './AnalyticsConstants';

/**
 * Analyzes message flow events to identify behavioral patterns.
 */
export class PatternAnalyzer {
  public analyze(events: MessageFlowEvent[]): BehaviorPattern[] {
    if (events.length === 0) {
      return DEFAULT_BEHAVIOR_PATTERNS;
    }

    const patterns: BehaviorPattern[] = [];

    // Pattern 1: High-frequency messaging
    const messageFrequency = this.calculateMessageFrequency(events);
    if (messageFrequency > 0) {
      patterns.push({
        id: 'pattern-high-frequency',
        name: 'High Activity User',
        description: 'User sends messages frequently with short intervals',
        frequency: Math.min(messageFrequency, 1),
        confidence: this.calculateConfidence(events.length, 100),
        trend: this.calculateTrend(events, 'count'),
        segments: ['power-user'],
        recommendedWidgets: ['real-time-monitor', 'activity-feed', 'quick-actions'],
        priority: 1,
      });
    }

    // Pattern 2: Error-prone interactions
    const errorRate = this.calculateErrorRate(events);
    if (errorRate > 0) {
      patterns.push({
        id: 'pattern-error-analysis',
        name: 'Error Pattern Detection',
        description: 'Analyzes error patterns and failure modes',
        frequency: 1 - errorRate,
        confidence: this.calculateConfidence(events.length, 50),
        trend: this.calculateTrend(events, 'errors'),
        segments: ['admin', 'developer'],
        recommendedWidgets: ['error-tracker', 'system-health', 'alert-config'],
        priority: errorRate > 0.1 ? 1 : 2,
      });
    }

    // Pattern 3: Provider usage patterns
    const providerPatterns = this.analyzeProviderPatterns(events);
    patterns.push(...providerPatterns);

    // Pattern 4: Time-based usage patterns
    const timePatterns = this.analyzeTimePatterns(events);
    patterns.push(...timePatterns);

    // Pattern 5: Response time patterns
    const responsePattern = this.analyzeResponseTimePattern(events);
    if (responsePattern) {
      patterns.push(responsePattern);
    }

    return patterns.length > 0 ? patterns : DEFAULT_BEHAVIOR_PATTERNS;
  }

  private calculateMessageFrequency(events: MessageFlowEvent[]): number {
    if (events.length < 2) return 0;
    const sorted = [...events].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );
    const duration =
      new Date(sorted[sorted.length - 1].timestamp).getTime() -
      new Date(sorted[0].timestamp).getTime();
    if (duration === 0) return 0;
    return (events.length / duration) * 60000; // messages per minute
  }

  private calculateErrorRate(events: MessageFlowEvent[]): number {
    if (events.length === 0) return 0;
    const errors = events.filter((e) => e.status === 'error').length;
    return errors / events.length;
  }

  private calculateConfidence(sampleSize: number, threshold: number): number {
    return Math.min(sampleSize / threshold, 1);
  }

  private calculateTrend(
    events: MessageFlowEvent[],
    metric: 'count' | 'errors' | 'latency'
  ): 'increasing' | 'decreasing' | 'stable' {
    if (events.length < 10) return 'stable';
    const mid = Math.floor(events.length / 2);
    const firstHalf = events.slice(0, mid);
    const secondHalf = events.slice(mid);

    const getVal = (evts: MessageFlowEvent[]) => {
      if (metric === 'count') return evts.length;
      if (metric === 'errors') return evts.filter((e) => e.status === 'error').length;
      const latencies = evts.filter((e) => e.processingTime).map((e) => e.processingTime!);
      return latencies.length > 0 ? latencies.reduce((a, b) => a + b, 0) / latencies.length : 0;
    };

    const v1 = getVal(firstHalf);
    const v2 = getVal(secondHalf);

    if (v2 > v1 * 1.1) return 'increasing';
    if (v2 < v1 * 0.9) return 'decreasing';
    return 'stable';
  }

  private analyzeProviderPatterns(events: MessageFlowEvent[]): BehaviorPattern[] {
    const providers = new Set(events.map((e) => e.provider));
    if (providers.size > 1) {
      return [
        {
          id: 'pattern-multi-platform',
          name: 'Multi-platform Orchestration',
          description: 'User manages bots across multiple messaging platforms',
          frequency: providers.size / 4,
          confidence: 0.9,
          trend: 'stable',
          segments: ['orchestrator'],
          recommendedWidgets: ['integrations-status', 'provider-health'],
          priority: 2,
        },
      ];
    }
    return [];
  }

  private analyzeTimePatterns(events: MessageFlowEvent[]): BehaviorPattern[] {
    const hours = events.map((e) => new Date(e.timestamp).getHours());
    const isNight = hours.every((h) => h < 6 || h > 22);
    if (isNight && events.length > 5) {
      return [
        {
          id: 'pattern-nocturnal',
          name: 'Nocturnal Activity',
          description: 'High volume of messages during night hours',
          frequency: 0.8,
          confidence: 0.7,
          trend: 'stable',
          segments: ['automated-process'],
          recommendedWidgets: ['scheduled-tasks', 'nightly-reports'],
          priority: 3,
        },
      ];
    }
    return [];
  }

  private analyzeResponseTimePattern(events: MessageFlowEvent[]): BehaviorPattern | null {
    const latencies = events.filter((e) => e.processingTime).map((e) => e.processingTime!);
    if (latencies.length < 5) return null;

    const avg = latencies.reduce((a, b) => a + b, 0) / latencies.length;
    if (avg > SLOW_PROCESSING_THRESHOLD_MS) {
      return {
        id: 'pattern-latency-bottleneck',
        name: 'Performance Bottleneck',
        description: 'Detected consistently high processing times',
        frequency: avg / 5000,
        confidence: 0.85,
        trend: this.calculateTrend(events, 'latency'),
        segments: ['optimization-needed'],
        recommendedWidgets: ['performance-metrics', 'llm-latency-chart'],
        priority: 1,
      };
    }

    if (avg < FAST_PROCESSING_THRESHOLD_MS) {
      return {
        id: 'pattern-high-efficiency',
        name: 'Optimal Performance',
        description: 'Bots are responding with very low latency',
        frequency: 1,
        confidence: 0.8,
        trend: 'stable',
        segments: ['efficient'],
        recommendedWidgets: ['performance-metrics', 'uptime-stat'],
        priority: 4,
      };
    }

    return null;
  }
}
