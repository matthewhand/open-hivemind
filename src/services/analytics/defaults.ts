import { type BehaviorPattern, type DashboardRecommendation, type UserSegment } from './types';

/**
 * Provides default data for analytics when no actual data is available
 */
export class AnalyticsDefaults {
  static getDefaultBehaviorPatterns(): BehaviorPattern[] {
    return [
      {
        id: 'pattern-generic',
        name: 'Standard Usage',
        description: 'Typical interaction pattern with regular intervals',
        frequency: 0.5,
        confidence: 0.1,
        trend: 'stable',
        segments: ['new-user'],
        recommendedWidgets: ['overview', 'activity-feed'],
        priority: 3,
      },
    ];
  }

  static getDefaultUserSegments(): UserSegment[] {
    return [
      {
        id: 'segment-all',
        name: 'All Users',
        description: 'General user base',
        criteria: {
          behaviorPatterns: [],
          usageFrequency: 'daily',
          featureUsage: [],
          engagementLevel: 'medium',
        },
        characteristics: {
          preferredWidgets: ['overview'],
          optimalLayout: 'default',
          themePreference: 'system',
          notificationFrequency: 1,
        },
        size: 0,
        confidence: 0.5,
      },
    ];
  }

  static getDefaultRecommendations(): DashboardRecommendation[] {
    return [
      {
        id: 'rec-getting-started',
        type: 'layout',
        title: 'Complete Your Setup',
        description: 'Configure your first bot to start seeing real-time analytics.',
        confidence: 0.9,
        impact: 'high',
        reasoning: 'Platform value is maximized after bot configuration.',
      },
      {
        id: 'rec-explore-mcp',
        type: 'widget',
        title: 'Explore MCP Tools',
        description: 'Add Model Context Protocol servers to give your bots more capabilities.',
        confidence: 0.8,
        impact: 'medium',
        reasoning: 'MCP tools significantly enhance bot utility.',
      },
    ];
  }
}
