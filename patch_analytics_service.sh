cat << 'PATCH' > src/services/AnalyticsService.ts
import Debug from 'debug';
import { injectable, singleton } from 'tsyringe';
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

@singleton()
@injectable()
export class AnalyticsService {
  constructor(
    private activityLogger: ActivityLogger,
    private botConfigManager: BotConfigurationManager
  ) {}

  /**
   * Get behavior patterns based on actual usage data
   */
  public async getBehaviorPatterns(options: ActivityFilter = {}): Promise<BehaviorPattern[]> {
    const events = await this.activityLogger.getEvents({ ...options, limit: options.limit || 5000 });

    const botsWithUsage = new Set(events.map((e) => e.botName).filter(Boolean));
    const eventsByType = this.groupEventsByType(events);
    const hourlyDistribution = this.calculateHourlyDistribution(events);
    const errorRates = this.calculateErrorRatesByBot(events);

    const patterns: BehaviorPattern[] = [];

    // 1. High Volume Detection
    if (events.length > 1000 && botsWithUsage.size > 0) {
      patterns.push({
        id: 'high-volume',
        name: 'High Message Volume',
        description: 'Consistent high traffic across multiple bots',
        frequency: events.length / 24, // simplified daily rate
        confidence: 0.9,
        trend: 'stable',
        segments: ['power-users'],
        recommendedWidgets: ['Traffic Overview', 'Resource Usage'],
        priority: 1,
      });
    }

    // 2. Off-hours Usage
    const offHoursCount = hourlyDistribution.filter((count, hour) => (hour < 8 || hour > 18) && count > 0).length;
    if (offHoursCount > events.length * 0.2) {
      patterns.push({
        id: 'off-hours',
        name: 'Off-hours Activity',
        description: 'Significant activity outside business hours',
        frequency: offHoursCount,
        confidence: 0.85,
        trend: 'increasing',
        segments: ['global-users', 'automated-systems'],
        recommendedWidgets: ['24h Activity Map', 'Alert Status'],
        priority: 2,
      });
    }

    // 3. High Error Context
    const botsWithHighErrors = Object.entries(errorRates)
      .filter(([_, rate]) => rate > 0.1) // 10% error rate threshold
      .map(([bot]) => bot);

    if (botsWithHighErrors.length > 0) {
      patterns.push({
        id: 'elevated-errors',
        name: 'Elevated Error Rates',
        description: \`Higher than normal errors detected for \${botsWithHighErrors.length} bots\`,
        frequency: botsWithHighErrors.length,
        confidence: 0.95,
        trend: 'stable',
        segments: ['system-monitoring'],
        recommendedWidgets: ['Error Tracking', 'Health Status'],
        priority: 1,
      });
    }

    // 4. Feature specific usage
    if (eventsByType['llm_call'] && eventsByType['llm_call'].length > events.length * 0.4) {
      patterns.push({
        id: 'heavy-llm',
        name: 'Heavy LLM Usage',
        description: 'Primary interaction mode is direct LLM queries',
        frequency: eventsByType['llm_call'].length,
        confidence: 0.88,
        trend: 'increasing',
        segments: ['content-creators', 'researchers'],
        recommendedWidgets: ['Token Usage', 'Model Performance'],
        priority: 2,
      });
    }

    if (eventsByType['tool_call'] && eventsByType['tool_call'].length > events.length * 0.1) {
      patterns.push({
        id: 'heavy-tool',
        name: 'Complex Tool Usage',
        description: 'Frequent use of integrated tools and MCP servers',
        frequency: eventsByType['tool_call'].length,
        confidence: 0.85,
        trend: 'stable',
        segments: ['power-users', 'developers'],
        recommendedWidgets: ['Tool Usage Stats', 'Integration Health'],
        priority: 2,
      });
    }

    return patterns.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Identifies logical user segments based on usage
   */
  public async getUserSegments(options: ActivityFilter = {}): Promise<UserSegment[]> {
    const events = await this.activityLogger.getEvents({ ...options, limit: options.limit || 5000 });
    const segments: UserSegment[] = [];

    // Extract unique active bots as a proxy for 'users' or 'workspaces' in this context
    const activeBots = new Set(events.map((e) => e.botName).filter(Boolean));

    if (activeBots.size > 0) {
      // Analyze general activity levels
      const highlyActiveBots = Array.from(activeBots).filter((bot) => {
        return events.filter((e) => e.botName === bot).length > 50;
      });

      if (highlyActiveBots.length > 0) {
        segments.push({
          id: 'power-users',
          name: 'Power Users',
          description: 'Highly active instances generating significant traffic',
          criteria: {
            behaviorPatterns: ['high-volume', 'heavy-tool'],
            usageFrequency: 'daily',
            featureUsage: ['mcp_tools', 'complex_queries'],
            engagementLevel: 'high',
          },
          characteristics: {
            preferredWidgets: ['Detailed Analytics', 'Real-time Logs', 'Resource Monitor'],
            optimalLayout: 'dense-grid',
            themePreference: 'dark', // Often preferred by power users
            notificationFrequency: 2, // Prefer batched/important only
          },
          size: highlyActiveBots.length,
          confidence: 0.9,
        });
      }

      // Detect casual/infrequent usage
      const casualBots = Array.from(activeBots).filter((bot) => {
        return events.filter((e) => e.botName === bot).length < 10;
      });

      if (casualBots.length > 0) {
        segments.push({
          id: 'casual-users',
          name: 'Casual Users',
          description: 'Infrequent usage, mostly simple queries',
          criteria: {
            behaviorPatterns: ['infrequent-access'],
            usageFrequency: 'weekly',
            featureUsage: ['basic_chat'],
            engagementLevel: 'low',
          },
          characteristics: {
            preferredWidgets: ['Simple Overview', 'Recent Activity'],
            optimalLayout: 'simple-cards',
            themePreference: 'system',
            notificationFrequency: 0,
          },
          size: casualBots.length,
          confidence: 0.85,
        });
      }
    }

    return segments;
  }

  /**
   * Generates tailored dashboard layout and widget recommendations
   */
  public async getDashboardRecommendations(options: ActivityFilter = {}): Promise<DashboardRecommendation[]> {
    const patterns = await this.getBehaviorPatterns(options);
    const recommendations: DashboardRecommendation[] = [];

    if (patterns.length === 0) {
      // Default recommendations for new instances
      recommendations.push({
        id: 'rec-default-overview',
        type: 'layout',
        title: 'Start with the Overview Dashboard',
        description: 'A balanced view of all system activities perfect for getting started.',
        confidence: 1.0,
        impact: 'medium',
        reasoning: 'Not enough data to provide tailored recommendations yet.',
        preview: { layoutId: 'default-overview' },
      });
      return recommendations;
    }

    // Recommendation based on High Volume
    if (patterns.some((p) => p.id === 'high-volume')) {
      recommendations.push({
        id: 'rec-density-high',
        type: 'layout',
        title: 'Switch to Dense Layout',
        description: 'Optimize your screen space to see more metrics at once.',
        confidence: 0.85,
        impact: 'high',
        reasoning: 'High volume usage patterns typically benefit from seeing more data density.',
        preview: { layoutDensity: 'compact' },
      });
    }

    // Recommendation based on Errors
    if (patterns.some((p) => p.id === 'elevated-errors')) {
      recommendations.push({
        id: 'rec-widget-errors',
        type: 'widget',
        title: 'Add Error Tracking Widget',
        description: 'Pin the error tracker to your main dashboard for immediate visibility.',
        confidence: 0.95,
        impact: 'high',
        reasoning: 'Elevated error rates detected in recent activity.',
        preview: { widgetId: 'error-tracker', recommendedPosition: 'top-right' },
      });
    }

    // Recommendation based on Tool Usage
    if (patterns.some((p) => p.id === 'heavy-tool')) {
      recommendations.push({
        id: 'rec-widget-tools',
        type: 'widget',
        title: 'Monitor Tool Usage',
        description: 'Track which MCP tools are being used most frequently.',
        confidence: 0.88,
        impact: 'medium',
        reasoning: 'Significant portion of activity involves external tool calls.',
        preview: { widgetId: 'tool-usage-chart' },
      });
    }

    return recommendations;
  }

  /**
   * Get high-level statistics for the dashboard
   */
  public async getStats(options: ActivityFilter = {}): Promise<AnalyticsStats> {
    const events = await this.activityLogger.getEvents({ ...options, limit: options.limit || 10000 });
    const patterns = await this.getBehaviorPatterns(options);
    const segments = await this.getUserSegments(options);

    const activeBots = new Set(events.map((e) => e.botName).filter(Boolean));
    const activeUsers = new Set(events.map((e) => e.userId).filter(Boolean));
    const errors = events.filter((e) => e.status === 'error');

    // Calculate average processing time from messages that have it recorded
    const messagesWithDuration = events.filter((e) => e.details?.duration && typeof e.details.duration === 'number');
    const totalDuration = messagesWithDuration.reduce((sum, e) => sum + ((e.details?.duration as number) || 0), 0);
    const avgProcessingTime = messagesWithDuration.length > 0 ? totalDuration / messagesWithDuration.length : 0;

    // Simulate "learning progress" based on data volume
    const learningProgress = Math.min(100, Math.round((events.length / 5000) * 100));

    return {
      learningProgress,
      behaviorPatternsCount: patterns.length,
      userSegmentsCount: segments.length,
      totalMessages: events.length,
      totalErrors: errors.length,
      avgProcessingTime,
      activeBots: activeBots.size,
      activeUsers: activeUsers.size,
    };
  }

  /**
   * Get time-series data aggregated by hour or day
   */
  public async getTimeSeriesData(
    interval: 'hour' | 'day' = 'hour',
    options: ActivityFilter = {}
  ): Promise<TimeSeriesBucket[]> {
    const events = await this.activityLogger.getEvents({ ...options, limit: options.limit || 10000 });
    const buckets = new Map<string, TimeSeriesBucket>();

    events.forEach((event) => {
      const date = new Date(event.timestamp);
      let bucketKey = '';

      if (interval === 'hour') {
        bucketKey = \`\${date.getFullYear()}-\${String(date.getMonth() + 1).padStart(2, '0')}-\${String(date.getDate()).padStart(2, '0')}T\${String(date.getHours()).padStart(2, '0')}:00:00.000Z\`;
      } else {
        bucketKey = \`\${date.getFullYear()}-\${String(date.getMonth() + 1).padStart(2, '0')}-\${String(date.getDate()).padStart(2, '0')}T00:00:00.000Z\`;
      }

      const existing = buckets.get(bucketKey) || {
        timestamp: bucketKey,
        count: 0,
        errors: 0,
        avgProcessingTime: 0,
      };

      existing.count += 1;
      if (event.status === 'error') {
        existing.errors += 1;
      }

      // Simple running average for processing time
      const duration = event.details?.duration as number;
      if (duration && !isNaN(duration)) {
        if (existing.avgProcessingTime === 0) {
          existing.avgProcessingTime = duration;
        } else {
          existing.avgProcessingTime = (existing.avgProcessingTime * (existing.count - 1) + duration) / existing.count;
        }
      }

      buckets.set(bucketKey, existing);
    });

    return Array.from(buckets.values()).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  // --- Helper Methods ---

  private groupEventsByType(events: MessageFlowEvent[]): Record<string, MessageFlowEvent[]> {
    return events.reduce(
      (acc, event) => {
        const type = event.type || 'unknown';
        if (!acc[type]) acc[type] = [];
        acc[type].push(event);
        return acc;
      },
      {} as Record<string, MessageFlowEvent[]>
    );
  }

  private calculateHourlyDistribution(events: MessageFlowEvent[]): number[] {
    const distribution = new Array(24).fill(0);
    events.forEach((event) => {
      const hour = new Date(event.timestamp).getHours();
      distribution[hour]++;
    });
    return distribution;
  }

  private calculateErrorRatesByBot(events: MessageFlowEvent[]): Record<string, number> {
    const counts: Record<string, { total: number; errors: number }> = {};

    events.forEach((event) => {
      if (!event.botName) return;

      if (!counts[event.botName]) {
        counts[event.botName] = { total: 0, errors: 0 };
      }

      counts[event.botName].total++;
      if (event.status === 'error') {
        counts[event.botName].errors++;
      }
    });

    const rates: Record<string, number> = {};
    for (const [bot, data] of Object.entries(counts)) {
      rates[bot] = data.total > 0 ? data.errors / data.total : 0;
    }

    return rates;
  }
}

export default AnalyticsService;
PATCH
