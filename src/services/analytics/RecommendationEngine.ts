import type { MessageFlowEvent } from '../../server/services/WebSocketService';
import {
  DEFAULT_RECOMMENDATIONS,
  type BehaviorPattern,
  type DashboardRecommendation,
  type UserSegment,
} from './AnalyticsConstants';

/**
 * Generates dashboard recommendations based on behavior patterns and user segments.
 */
export class RecommendationEngine {
  public generate(
    events: MessageFlowEvent[],
    patterns: BehaviorPattern[],
    segments: UserSegment[]
  ): DashboardRecommendation[] {
    if (events.length === 0) {
      return DEFAULT_RECOMMENDATIONS;
    }

    const recommendations: DashboardRecommendation[] = [];

    // Recommendation 1: Layout optimization
    const hasManyBots = new Set(events.map((e) => e.botName)).size > 5;
    const isPowerUser = segments.some((s) => s.id === 'segment-power-users');

    if (hasManyBots && isPowerUser) {
      recommendations.push({
        id: 'rec-layout-dense',
        type: 'layout',
        title: 'Switch to Power User Layout',
        description: 'Optimize your dashboard for high-volume multi-bot management.',
        confidence: 0.95,
        impact: 'medium',
        reasoning: 'You are managing more than 5 active bots frequently.',
        preview: { layout: 'grid-dense', widgets: 12 },
      });
    }

    // Recommendation 2: Widget suggestions
    const hasHighLatency = patterns.some((p) => p.id === 'pattern-latency-bottleneck');
    if (hasHighLatency) {
      recommendations.push({
        id: 'rec-widget-latency',
        type: 'widget',
        title: 'Add Latency Heatmap',
        description: 'Identify specific times or providers causing performance slowdowns.',
        confidence: 0.85,
        impact: 'high',
        reasoning: 'We detected inconsistent response times across your LLM providers.',
        preview: { widgetType: 'heatmap', dataSource: 'processingTime' },
      });
    }

    // Recommendation 3: Provider specific optimizations
    const discordEvents = events.filter((e) => e.provider === 'discord');
    const discordErrorRate =
      discordEvents.filter((e) => e.status === 'error').length / (discordEvents.length || 1);

    if (discordErrorRate > 0.1) {
      recommendations.push({
        id: 'rec-settings-discord-timeout',
        type: 'settings',
        title: 'Adjust Discord Timeouts',
        description: 'Increase the connection timeout for Discord to reduce retry overhead.',
        confidence: 0.8,
        impact: 'medium',
        reasoning: `Your Discord error rate is ${Math.round(discordErrorRate * 100)}%, mostly due to timeouts.`,
      });
    }

    return recommendations.length > 0 ? recommendations : DEFAULT_RECOMMENDATIONS;
  }
}
