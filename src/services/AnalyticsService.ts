import Debug from 'debug';
import { BotConfigurationManager } from '../config/BotConfigurationManager';
import { ActivityLogger, type ActivityFilter } from '../server/services/ActivityLogger';
import { type MessageFlowEvent } from '../server/services/WebSocketService';

const debug = Debug('app:AnalyticsService');

// ----------------------------------------------------------------------------
// Analytics Interfaces
// ----------------------------------------------------------------------------

export interface BehaviorPattern {
  id: string;
  name: string;
  description: string;
  frequency: number;
  confidence: number;
  trend: 'increasing' | 'decreasing' | 'stable';
  segments: string[];
  recommendedWidgets: string[];
  priority: number;
}

export interface UserSegment {
  id: string;
  name: string;
  description: string;
  criteria: {
    behaviorPatterns: string[];
    usageFrequency: 'daily' | 'weekly' | 'monthly';
    featureUsage: string[];
    engagementLevel: 'high' | 'medium' | 'low';
  };
  characteristics: {
    preferredWidgets: string[];
    optimalLayout: string;
    themePreference: string;
    notificationFrequency: number;
  };
  size: number;
  confidence: number;
}

export interface DashboardRecommendation {
  id: string;
  type: 'widget' | 'layout' | 'theme' | 'settings';
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  reasoning: string;
  preview?: Record<string, unknown>;
  userFeedback?: 'liked' | 'disliked' | null;
}

export interface AnalyticsStats {
  learningProgress: number;
  behaviorPatternsCount: number;
  userSegmentsCount: number;
  totalMessages: number;
  totalErrors: number;
  avgProcessingTime: number;
  activeBots: number;
  activeUsers: number;
}

export interface TimeSeriesBucket {
  timestamp: string;
  count: number;
  errors: number;
  avgProcessingTime: number;
}

// ----------------------------------------------------------------------------
// Analytics Service
// ----------------------------------------------------------------------------

export class AnalyticsService {
  private static instance: AnalyticsService;
  private activityLogger: ActivityLogger;
  private botConfigManager: BotConfigurationManager;

  private constructor() {
    this.activityLogger = ActivityLogger.getInstance();
    this.botConfigManager = BotConfigurationManager.getInstance();
  }

  public static getInstance(): AnalyticsService {
    if (!AnalyticsService.instance) {
      AnalyticsService.instance = new AnalyticsService();
    }
    return AnalyticsService.instance;
  }

  /**
   * Get behavior patterns based on actual usage data
   */
  public async getBehaviorPatterns(options: ActivityFilter = {}): Promise<BehaviorPattern[]> {
    const events = await this.activityLogger.getEvents({ ...options, limit: options.limit || 5000 });

    if (events.length === 0) {
      return this.getDefaultBehaviorPatterns();
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

    return patterns.length > 0 ? patterns : this.getDefaultBehaviorPatterns();
  }

  /**
   * Get user segments based on actual activity
   */
  public async getUserSegments(options: ActivityFilter = {}): Promise<UserSegment[]> {
    const events = await this.activityLogger.getEvents({ ...options, limit: options.limit || 5000 });

    if (events.length === 0) {
      return this.getDefaultUserSegments();
    }

    const segments: UserSegment[] = [];

    // Analyze unique users
    const userActivity = this.aggregateUserActivity(events);
    const usersByActivity = this.categorizeUsersByActivity(userActivity);

    // Power Users segment
    if (usersByActivity.high.length > 0) {
      segments.push({
        id: 'segment-power-users',
        name: 'Power Users',
        description: 'Highly engaged users with frequent message activity',
        criteria: {
          behaviorPatterns: ['pattern-high-frequency'],
          usageFrequency: 'daily',
          featureUsage: this.getTopFeatures(events, usersByActivity.high),
          engagementLevel: 'high',
        },
        characteristics: {
          preferredWidgets: ['performance-monitor', 'analytics-dashboard', 'system-health'],
          optimalLayout: 'grid-3x3',
          themePreference: 'dark',
          notificationFrequency: 5,
        },
        size: usersByActivity.high.length,
        confidence: this.calculateConfidence(usersByActivity.high.length, 10),
      });
    }

    // Regular Users segment
    if (usersByActivity.medium.length > 0) {
      segments.push({
        id: 'segment-regular-users',
        name: 'Regular Users',
        description: 'Users with moderate engagement levels',
        criteria: {
          behaviorPatterns: ['pattern-time-based'],
          usageFrequency: 'weekly',
          featureUsage: this.getTopFeatures(events, usersByActivity.medium),
          engagementLevel: 'medium',
        },
        characteristics: {
          preferredWidgets: ['summary-cards', 'activity-feed'],
          optimalLayout: 'grid-2x2',
          themePreference: 'system',
          notificationFrequency: 2,
        },
        size: usersByActivity.medium.length,
        confidence: this.calculateConfidence(usersByActivity.medium.length, 10),
      });
    }

    // Casual Users segment
    if (usersByActivity.low.length > 0) {
      segments.push({
        id: 'segment-casual-users',
        name: 'Casual Users',
        description: 'Users with occasional interaction',
        criteria: {
          behaviorPatterns: ['pattern-low-frequency'],
          usageFrequency: 'monthly',
          featureUsage: this.getTopFeatures(events, usersByActivity.low),
          engagementLevel: 'low',
        },
        characteristics: {
          preferredWidgets: ['quick-stats', 'status-overview'],
          optimalLayout: 'list-2x2',
          themePreference: 'light',
          notificationFrequency: 1,
        },
        size: usersByActivity.low.length,
        confidence: this.calculateConfidence(usersByActivity.low.length, 10),
      });
    }

    return segments.length > 0 ? segments : this.getDefaultUserSegments();
  }

  /**
   * Get recommendations based on actual patterns
   */
  public async getRecommendations(options: ActivityFilter = {}): Promise<DashboardRecommendation[]> {
    const events = await this.activityLogger.getEvents({ ...options, limit: options.limit || 5000 });
    const patterns = await this.getBehaviorPatterns(options);
    const segments = await this.getUserSegments(options);

    const recommendations: DashboardRecommendation[] = [];

    if (events.length === 0) {
      return this.getDefaultRecommendations();
    }

    // Recommendation based on error rate
    const errorRate = this.calculateErrorRate(events);
    if (errorRate > 0.05) {
      recommendations.push({
        id: 'rec-error-monitor',
        type: 'widget',
        title: 'Add Error Monitoring Widget',
        description: 'Error rate is elevated. Add error tracking to your dashboard.',
        confidence: Math.min(0.95, 0.7 + errorRate),
        impact: 'high',
        reasoning: `Current error rate is ${(errorRate * 100).toFixed(1)}%`,
        preview: { widgetId: 'error-tracker', type: 'monitoring' },
      });
    }

    // Recommendation based on message volume
    const messageVolume = events.length;
    if (messageVolume > 100) {
      recommendations.push({
        id: 'rec-analytics-widget',
        type: 'widget',
        title: 'Add Analytics Dashboard',
        description: 'High message volume detected. Analytics can provide insights.',
        confidence: 0.85,
        impact: 'medium',
        reasoning: `${messageVolume} messages recorded in the selected period`,
        preview: { widgetId: 'analytics-dashboard', type: 'analytics' },
      });
    }

    // Recommendation based on provider diversity
    const providers = new Set(events.map((e) => e.provider));
    if (providers.size > 1) {
      recommendations.push({
        id: 'rec-multi-provider',
        type: 'layout',
        title: 'Multi-Provider Layout',
        description: 'Multiple providers detected. Consider a comparative layout.',
        confidence: 0.8,
        impact: 'medium',
        reasoning: `Using ${providers.size} message providers: ${Array.from(providers).join(', ')}`,
        preview: { layoutId: 'multi-provider-grid', providers: Array.from(providers) },
      });
    }

    // Recommendation based on processing time
    const avgProcessingTime = this.calculateAvgProcessingTime(events);
    if (avgProcessingTime > 2000) {
      recommendations.push({
        id: 'rec-performance',
        type: 'settings',
        title: 'Optimize Performance Settings',
        description: 'Average response time is high. Consider performance tuning.',
        confidence: 0.75,
        impact: 'high',
        reasoning: `Average processing time: ${avgProcessingTime.toFixed(0)}ms`,
      });
    }

    // Pattern-based recommendations
    patterns.forEach((pattern, index) => {
      if (pattern.priority === 1 && pattern.confidence > 0.7) {
        recommendations.push({
          id: `rec-pattern-${index}`,
          type: 'widget',
          title: `Add ${pattern.name} Widget`,
          description: pattern.description,
          confidence: pattern.confidence,
          impact: pattern.frequency > 0.7 ? 'high' : 'medium',
          reasoning: `Based on detected pattern: ${pattern.name}`,
          preview: { widgetId: pattern.recommendedWidgets[0], patternId: pattern.id },
        });
      }
    });

    return recommendations.length > 0 ? recommendations : this.getDefaultRecommendations();
  }

  /**
   * Get analytics stats
   */
  public async getStats(options: ActivityFilter = {}): Promise<AnalyticsStats> {
    const events = await this.activityLogger.getEvents({ ...options, limit: options.limit || 10000 });
    const patterns = await this.getBehaviorPatterns(options);
    const segments = await this.getUserSegments(options);

    const totalMessages = events.length;
    const totalErrors = events.filter((e) => e.status === 'error' || e.status === 'timeout').length;
    const avgProcessingTime = this.calculateAvgProcessingTime(events);
    const uniqueUsers = new Set(events.map((e) => e.userId)).size;

    // Get active bots count
    let activeBots = 0;
    try {
      const bots = this.botConfigManager.getAllBots();
      activeBots = bots.length;
    } catch {
      debug('Could not get bot count');
    }

    // Calculate learning progress based on data volume
    const learningProgress = Math.min(
      100,
      Math.round(
        (Math.log10(totalMessages + 1) / 4) * 100 + // Data volume factor
          (patterns.length / 5) * 20 + // Pattern discovery factor
          (segments.length / 3) * 10 // Segment identification factor
      )
    );

    return {
      learningProgress,
      behaviorPatternsCount: patterns.length,
      userSegmentsCount: segments.length,
      totalMessages,
      totalErrors,
      avgProcessingTime,
      activeBots,
      activeUsers: uniqueUsers,
    };
  }

  /**
   * Get time-series data for analytics
   */
  public async getTimeSeries(options: ActivityFilter = {}): Promise<TimeSeriesBucket[]> {
    const events = await this.activityLogger.getEvents({ ...options, limit: options.limit || 10000 });

    if (events.length === 0) {
      return [];
    }

    const bucketMs = 60 * 60 * 1000; // 1 hour buckets
    const buckets = new Map<string, { count: number; errors: number; processingTimes: number[] }>();

    events.forEach((event) => {
      const timestamp = new Date(event.timestamp).getTime();
      if (isNaN(timestamp)) return;

      const bucketStart = Math.floor(timestamp / bucketMs) * bucketMs;
      const bucketKey = new Date(bucketStart).toISOString();

      if (!buckets.has(bucketKey)) {
        buckets.set(bucketKey, { count: 0, errors: 0, processingTimes: [] });
      }

      const bucket = buckets.get(bucketKey)!;
      bucket.count++;
      if (event.status === 'error' || event.status === 'timeout') {
        bucket.errors++;
      }
      if (event.processingTime) {
        bucket.processingTimes.push(event.processingTime);
      }
    });

    return Array.from(buckets.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([timestamp, data]) => ({
        timestamp,
        count: data.count,
        errors: data.errors,
        avgProcessingTime:
          data.processingTimes.length > 0
            ? data.processingTimes.reduce((a, b) => a + b, 0) / data.processingTimes.length
            : 0,
      }));
  }

  // ----------------------------------------------------------------------------
  // Private Helper Methods
  // ----------------------------------------------------------------------------

  private calculateMessageFrequency(events: MessageFlowEvent[]): number {
    if (events.length < 2) return 0;

    const timestamps = events
      .map((e) => new Date(e.timestamp).getTime())
      .filter((t) => !isNaN(t))
      .sort((a, b) => a - b);

    if (timestamps.length < 2) return 0;

    const timeSpanMs = timestamps[timestamps.length - 1] - timestamps[0];
    if (timeSpanMs === 0) return 1;

    const messagesPerMinute = events.length / (timeSpanMs / 60000);
    return Math.min(1, messagesPerMinute / 10); // Normalize to 0-1 range
  }

  private calculateErrorRate(events: MessageFlowEvent[]): number {
    if (events.length === 0) return 0;
    const errors = events.filter((e) => e.status === 'error' || e.status === 'timeout').length;
    return errors / events.length;
  }

  private calculateConfidence(sampleSize: number, threshold: number): number {
    // Higher confidence with more data, capped at 0.95
    return Math.min(0.95, 0.5 + (Math.min(sampleSize, threshold * 10) / (threshold * 10)) * 0.45);
  }

  private calculateTrend(
    events: MessageFlowEvent[],
    type: 'count' | 'errors'
  ): 'increasing' | 'decreasing' | 'stable' {
    if (events.length < 10) return 'stable';

    const midpoint = Math.floor(events.length / 2);
    const firstHalf = events.slice(0, midpoint);
    const secondHalf = events.slice(midpoint);

    let firstValue: number;
    let secondValue: number;

    if (type === 'count') {
      firstValue = firstHalf.length;
      secondValue = secondHalf.length;
    } else {
      firstValue = firstHalf.filter((e) => e.status === 'error' || e.status === 'timeout').length;
      secondValue = secondHalf.filter((e) => e.status === 'error' || e.status === 'timeout').length;
    }

    const change = (secondValue - firstValue) / Math.max(firstValue, 1);

    if (change > 0.1) return 'increasing';
    if (change < -0.1) return 'decreasing';
    return 'stable';
  }

  private analyzeProviderPatterns(events: MessageFlowEvent[]): BehaviorPattern[] {
    const patterns: BehaviorPattern[] = [];
    const providerCounts = new Map<string, number>();

    events.forEach((e) => {
      providerCounts.set(e.provider, (providerCounts.get(e.provider) || 0) + 1);
    });

    providerCounts.forEach((count, provider) => {
      const frequency = count / events.length;
      if (frequency > 0.1) {
        patterns.push({
          id: `pattern-provider-${provider}`,
          name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} User`,
          description: `Frequently uses ${provider} for messaging`,
          frequency,
          confidence: this.calculateConfidence(count, 50),
          trend: 'stable',
          segments: [`${provider}-user`],
          recommendedWidgets: [`${provider}-monitor`, 'provider-stats'],
          priority: 3,
        });
      }
    });

    return patterns;
  }

  private analyzeTimePatterns(events: MessageFlowEvent[]): BehaviorPattern[] {
    const patterns: BehaviorPattern[] = [];
    const hourCounts = new Map<number, number>();

    events.forEach((e) => {
      const hour = new Date(e.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    // Find peak hours
    let peakHour = 0;
    let peakCount = 0;
    hourCounts.forEach((count, hour) => {
      if (count > peakCount) {
        peakCount = count;
        peakHour = hour;
      }
    });

    if (peakCount > events.length * 0.15) {
      const timeOfDay =
        peakHour >= 6 && peakHour < 12
          ? 'morning'
          : peakHour >= 12 && peakHour < 18
            ? 'afternoon'
            : peakHour >= 18 && peakHour < 22
              ? 'evening'
              : 'night';

      patterns.push({
        id: 'pattern-time-based',
        name: `${timeOfDay.charAt(0).toUpperCase() + timeOfDay.slice(1)} User`,
        description: `Most active during ${timeOfDay} hours (peak: ${peakHour}:00)`,
        frequency: peakCount / events.length,
        confidence: this.calculateConfidence(peakCount, 20),
        trend: 'stable',
        segments: [`${timeOfDay}-user`],
        recommendedWidgets: ['activity-heatmap', 'peak-hours'],
        priority: 3,
      });
    }

    return patterns;
  }

  private analyzeResponseTimePattern(events: MessageFlowEvent[]): BehaviorPattern | null {
    const eventsWithTime = events.filter((e) => e.processingTime && e.processingTime > 0);
    if (eventsWithTime.length < 5) return null;

    const avgTime =
      eventsWithTime.reduce((sum, e) => sum + (e.processingTime || 0), 0) / eventsWithTime.length;

    let description: string;
    let recommendedWidgets: string[];

    if (avgTime < 500) {
      description = 'System responses are very fast';
      recommendedWidgets = ['performance-monitor', 'speed-metrics'];
    } else if (avgTime < 2000) {
      description = 'System responses are within normal range';
      recommendedWidgets = ['performance-monitor'];
    } else {
      description = 'System responses are slower than optimal';
      recommendedWidgets = ['performance-monitor', 'optimization-suggestions'];
    }

    return {
      id: 'pattern-response-time',
      name: 'Response Time Pattern',
      description,
      frequency: eventsWithTime.length / events.length,
      confidence: this.calculateConfidence(eventsWithTime.length, 20),
      trend: this.calculateTrend(events, 'count'),
      segments: ['performance-aware'],
      recommendedWidgets,
      priority: avgTime > 2000 ? 1 : 3,
    };
  }

  private aggregateUserActivity(events: MessageFlowEvent[]): Map<string, number> {
    const userActivity = new Map<string, number>();
    events.forEach((e) => {
      userActivity.set(e.userId, (userActivity.get(e.userId) || 0) + 1);
    });
    return userActivity;
  }

  private categorizeUsersByActivity(userActivity: Map<string, number>): {
    high: string[];
    medium: string[];
    low: string[];
  } {
    const activities = Array.from(userActivity.entries());
    const sorted = activities.sort((a, b) => b[1] - a[1]);

    const totalUsers = sorted.length;
    const highThreshold = Math.max(10, sorted[0]?.[1] || 0);
    const lowThreshold = Math.max(2, Math.floor(highThreshold * 0.2));

    return {
      high: sorted.filter(([_, count]) => count >= highThreshold * 0.5).map(([userId]) => userId),
      medium: sorted
        .filter(([_, count]) => count >= lowThreshold && count < highThreshold * 0.5)
        .map(([userId]) => userId),
      low: sorted.filter(([_, count]) => count < lowThreshold).map(([userId]) => userId),
    };
  }

  private getTopFeatures(events: MessageFlowEvent[], userIds: string[]): string[] {
    const userEvents = events.filter((e) => userIds.includes(e.userId));
    const features = new Map<string, number>();

    userEvents.forEach((e) => {
      const feature = `${e.provider}-${e.messageType}`;
      features.set(feature, (features.get(feature) || 0) + 1);
    });

    return Array.from(features.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([feature]) => feature);
  }

  private calculateAvgProcessingTime(events: MessageFlowEvent[]): number {
    const eventsWithTime = events.filter((e) => e.processingTime && e.processingTime > 0);
    if (eventsWithTime.length === 0) return 0;
    return (
      eventsWithTime.reduce((sum, e) => sum + (e.processingTime || 0), 0) / eventsWithTime.length
    );
  }

  // ----------------------------------------------------------------------------
  // Default Fallback Data
  // ----------------------------------------------------------------------------

  private getDefaultBehaviorPatterns(): BehaviorPattern[] {
    return [
      {
        id: 'pattern-default',
        name: 'No Data Yet',
        description: 'Start using the system to generate behavior patterns',
        frequency: 0,
        confidence: 0,
        trend: 'stable',
        segments: [],
        recommendedWidgets: ['getting-started', 'quick-stats'],
        priority: 5,
      },
    ];
  }

  private getDefaultUserSegments(): UserSegment[] {
    return [
      {
        id: 'segment-default',
        name: 'No Users Yet',
        description: 'User segments will appear as activity is recorded',
        criteria: {
          behaviorPatterns: [],
          usageFrequency: 'monthly',
          featureUsage: [],
          engagementLevel: 'low',
        },
        characteristics: {
          preferredWidgets: ['getting-started'],
          optimalLayout: 'grid-2x2',
          themePreference: 'system',
          notificationFrequency: 1,
        },
        size: 0,
        confidence: 0,
      },
    ];
  }

  private getDefaultRecommendations(): DashboardRecommendation[] {
    return [
      {
        id: 'rec-getting-started',
        type: 'widget',
        title: 'Getting Started',
        description: 'Start using the system to receive personalized recommendations',
        confidence: 1,
        impact: 'high',
        reasoning: 'No activity data available yet',
        preview: { widgetId: 'getting-started', type: 'info' },
      },
    ];
  }
}

export default AnalyticsService;
