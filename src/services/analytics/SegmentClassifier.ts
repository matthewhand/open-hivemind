import type { MessageFlowEvent } from '../../server/services/WebSocketService';
import { DEFAULT_USER_SEGMENTS, type UserSegment } from './AnalyticsConstants';

/**
 * Classifies users into segments based on their activity and behavior.
 */
export class SegmentClassifier {
  public classify(events: MessageFlowEvent[]): UserSegment[] {
    if (events.length === 0) {
      return DEFAULT_USER_SEGMENTS;
    }

    const userActivity = this.aggregateUserActivity(events);
    const { powerUsers, regularUsers, casualUsers } = this.categorizeUsersByActivity(userActivity);

    const segments: UserSegment[] = [];

    if (powerUsers.length > 0) {
      segments.push({
        id: 'segment-power-users',
        name: 'Power Users',
        description: 'Highly active users with complex multi-bot workflows',
        criteria: {
          behaviorPatterns: ['high-frequency', 'multi-platform'],
          usageFrequency: 'daily',
          featureUsage: this.getTopFeatures(events, powerUsers),
          engagementLevel: 'high',
        },
        characteristics: {
          preferredWidgets: ['real-time-monitor', 'performance-metrics', 'advanced-mcp-status'],
          optimalLayout: 'grid-dense',
          themePreference: 'dark',
          notificationFrequency: 0.9,
        },
        size: powerUsers.length,
        confidence: 0.9,
      });
    }

    if (regularUsers.length > 0) {
      segments.push({
        id: 'segment-regular-users',
        name: 'Regular Users',
        description: 'Frequent users with stable interaction patterns',
        criteria: {
          behaviorPatterns: ['stable-frequency'],
          usageFrequency: 'weekly',
          featureUsage: this.getTopFeatures(events, regularUsers),
          engagementLevel: 'medium',
        },
        characteristics: {
          preferredWidgets: ['activity-feed', 'bot-status-simple', 'quick-actions'],
          optimalLayout: 'dashboard-standard',
          themePreference: 'system',
          notificationFrequency: 0.5,
        },
        size: regularUsers.length,
        confidence: 0.8,
      });
    }

    if (casualUsers.length > 0) {
      segments.push({
        id: 'segment-casual-users',
        name: 'Casual Users',
        description: 'Occasional users focused on basic tasks',
        criteria: {
          behaviorPatterns: ['low-frequency'],
          usageFrequency: 'monthly',
          featureUsage: this.getTopFeatures(events, casualUsers),
          engagementLevel: 'low',
        },
        characteristics: {
          preferredWidgets: ['simple-chat', 'welcome-guide', 'usage-summary'],
          optimalLayout: 'list-clean',
          themePreference: 'light',
          notificationFrequency: 0.1,
        },
        size: casualUsers.length,
        confidence: 0.75,
      });
    }

    return segments.length > 0 ? segments : DEFAULT_USER_SEGMENTS;
  }

  private aggregateUserActivity(events: MessageFlowEvent[]): Map<string, number> {
    const activity = new Map<string, number>();
    events.forEach((e) => {
      const count = activity.get(e.userId) || 0;
      activity.set(e.userId, count + 1);
    });
    return activity;
  }

  private categorizeUsersByActivity(userActivity: Map<string, number>): {
    powerUsers: string[];
    regularUsers: string[];
    casualUsers: string[];
  } {
    const powerUsers: string[] = [];
    const regularUsers: string[] = [];
    const casualUsers: string[] = [];

    userActivity.forEach((count, userId) => {
      if (count > 50) powerUsers.push(userId);
      else if (count > 10) regularUsers.push(userId);
      else casualUsers.push(userId);
    });

    return { powerUsers, regularUsers, casualUsers };
  }

  private getTopFeatures(events: MessageFlowEvent[], userIds: string[]): string[] {
    const userEvents = events.filter((e) => userIds.includes(e.userId));
    const features = new Set<string>();
    if (userEvents.some((e) => e.provider === 'discord')) features.add('discord-integration');
    if (userEvents.some((e) => e.provider === 'slack')) features.add('slack-integration');
    if (userEvents.some((e) => e.processingTime && e.processingTime > 2000))
      features.add('complex-llm-tasks');
    return Array.from(features);
  }
}
