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

export const DEFAULT_BEHAVIOR_PATTERNS: BehaviorPattern[] = [
  {
    id: 'pattern-high-frequency',
    name: 'Standard User',
    description: 'Typical usage pattern with regular intervals',
    frequency: 0.5,
    confidence: 0.8,
    trend: 'stable',
    segments: ['regular'],
    recommendedWidgets: ['activity-feed', 'quick-actions'],
    priority: 3,
  },
  {
    id: 'pattern-multi-provider',
    name: 'Multi-platform User',
    description: 'Uses multiple messaging platforms frequently',
    frequency: 0.3,
    confidence: 0.7,
    trend: 'increasing',
    segments: ['integrator'],
    recommendedWidgets: ['integrations-status', 'provider-health'],
    priority: 2,
  },
];

export const DEFAULT_USER_SEGMENTS: UserSegment[] = [
  {
    id: 'segment-power-users',
    name: 'Power Users',
    description: 'High engagement users who utilize most features',
    criteria: {
      behaviorPatterns: ['high-frequency', 'multi-tool'],
      usageFrequency: 'daily',
      featureUsage: ['mcp', 'personas', 'advanced-guards'],
      engagementLevel: 'high',
    },
    characteristics: {
      preferredWidgets: ['performance-metrics', 'advanced-mcp-status', 'system-health'],
      optimalLayout: 'grid-dense',
      themePreference: 'dark',
      notificationFrequency: 0.9,
    },
    size: 12,
    confidence: 0.85,
  },
  {
    id: 'segment-casual-users',
    name: 'Casual Users',
    description: 'Occasional users focused on simple bot interactions',
    criteria: {
      behaviorPatterns: ['low-frequency'],
      usageFrequency: 'weekly',
      featureUsage: ['basic-chat'],
      engagementLevel: 'low',
    },
    characteristics: {
      preferredWidgets: ['simple-chat', 'basic-bot-status'],
      optimalLayout: 'list-clean',
      themePreference: 'light',
      notificationFrequency: 0.2,
    },
    size: 45,
    confidence: 0.7,
  },
];

export const DEFAULT_RECOMMENDATIONS: DashboardRecommendation[] = [
  {
    id: 'rec-dense-layout',
    type: 'layout',
    title: 'Switch to Dense Layout',
    description: 'Based on your multi-bot usage, a dense layout would show more data at once.',
    confidence: 0.9,
    impact: 'medium',
    reasoning: 'You have more than 5 active bots across different platforms.',
  },
  {
    id: 'rec-error-widget',
    type: 'widget',
    title: 'Add Error Tracking Widget',
    description: 'Monitor provider connection failures more closely.',
    confidence: 0.75,
    impact: 'high',
    reasoning: 'We detected a 5% increase in Discord connection timeouts today.',
  },
];
