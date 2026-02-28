/**
 * @wip ROADMAP ITEM — NOT ACTIVE
 *
 * This component is part of the AI Dashboard & Intelligence Features planned for future implementation.
 * It has been removed from the active UI navigation and routing.
 *
 * See docs/reference/IMPROVEMENT_ROADMAP.md — "🤖 AI Dashboard & Intelligence Features (Future Roadmap)"
 * for implementation prerequisites and planned scope.
 *
 * DO NOT import or route to this component until the backend AI APIs are implemented.
 */
import React, { useState, useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectPerformance } from '../store/slices/performanceSlice';
import { selectDashboard } from '../store/slices/dashboardSlice';
import { AnimatedBox } from '../animations/AnimationComponents';
import {
  SparklesIcon,
  InformationCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  BoltIcon,
  ChartBarIcon,
  ExclamationCircleIcon,
} from '@heroicons/react/24/outline';

interface AIInsight {
  id: string;
  type: 'performance' | 'error' | 'optimization' | 'prediction';
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  description: string;
  recommendation: string;
  confidence: number;
  timestamp: Date;
  metrics?: {
    current: number;
    predicted?: number;
    threshold?: number;
    unit: string;
  };
  relatedBots?: string[];
  tags: string[];
}

interface AIInsightsPanelProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
  maxInsights?: number;
  showConfidence?: boolean;
}

export const AIInsightsPanel: React.FC<AIInsightsPanelProps> = ({
  autoRefresh = true,
  refreshInterval = 30000,
  maxInsights = 10,
  showConfidence = true,
}) => {
  const { metrics } = useAppSelector(selectPerformance);
  const { bots } = useAppSelector(selectDashboard);
  const [insights, setInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedInsights, setExpandedInsights] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');

  // Simulate AI analysis
  const generateAIInsights = (): AIInsight[] => {
    const insights: AIInsight[] = [];

    // Performance insights
    if (metrics.responseTime > 500) {
      insights.push({
        id: 'perf-001',
        type: 'performance',
        severity: 'high',
        title: 'Response Time Degradation Detected',
        description: `Average response time has increased to ${metrics.responseTime.toFixed(0)}ms, exceeding the optimal threshold of 500ms.`,
        recommendation: 'Consider scaling up bot instances or optimizing database queries. Check for memory leaks or CPU-intensive operations.',
        confidence: 0.89,
        timestamp: new Date(),
        metrics: {
          current: metrics.responseTime,
          threshold: 500,
          unit: 'ms',
        },
        relatedBots: bots.filter(b => b.status === 'active').map(b => b.name),
        tags: ['performance', 'response-time', 'scaling'],
      });
    }

    // Memory usage insights
    if (metrics.memoryUsage > 80) {
      insights.push({
        id: 'mem-001',
        type: 'optimization',
        severity: 'medium',
        title: 'High Memory Usage Alert',
        description: `System memory usage is at ${metrics.memoryUsage.toFixed(1)}%, approaching critical levels.`,
        recommendation: 'Implement memory cleanup routines, restart idle bots, or increase memory allocation for bot instances.',
        confidence: 0.92,
        timestamp: new Date(),
        metrics: {
          current: metrics.memoryUsage,
          threshold: 80,
          unit: '%',
        },
        relatedBots: bots.filter(b => b.status === 'active').slice(0, 3).map(b => b.name),
        tags: ['memory', 'optimization', 'cleanup'],
      });
    }

    // Error rate insights
    if (metrics.errorRate > 5) {
      insights.push({
        id: 'err-001',
        type: 'error',
        severity: 'critical',
        title: 'Elevated Error Rate Detected',
        description: `Error rate has reached ${metrics.errorRate.toFixed(2)}%, significantly above normal levels.`,
        recommendation: 'Investigate recent bot failures, check API rate limits, and review error logs for patterns. Consider implementing circuit breakers.',
        confidence: 0.95,
        timestamp: new Date(),
        metrics: {
          current: metrics.errorRate,
          threshold: 5,
          unit: '%',
        },
        relatedBots: bots.filter(b => b.status === 'error').map(b => b.name),
        tags: ['error', 'failure', 'debugging'],
      });
    }

    // Bot health predictions
    const activeBots = bots.filter(b => b.status === 'active').length;
    const totalBots = bots.length;
    const healthPercentage = totalBots > 0 ? (activeBots / totalBots) * 100 : 0;

    if (healthPercentage < 70 && totalBots > 0) {
      insights.push({
        id: 'health-001',
        type: 'prediction',
        severity: 'medium',
        title: 'Bot Health Predicted to Decline',
        description: `Only ${healthPercentage.toFixed(1)}% of bots are currently active. Historical patterns suggest potential cascading failures.`,
        recommendation: 'Proactively restart bots showing signs of instability. Implement health checks and automatic recovery mechanisms.',
        confidence: 0.78,
        timestamp: new Date(),
        metrics: {
          current: healthPercentage,
          predicted: Math.max(0, healthPercentage - 20),
          unit: '%',
        },
        relatedBots: bots.filter(b => b.status === 'connecting').map(b => b.name),
        tags: ['health', 'prediction', 'recovery'],
      });
    }

    // Performance optimization suggestions
    if (metrics.cpuUsage > 75) {
      insights.push({
        id: 'opt-001',
        type: 'optimization',
        severity: 'medium',
        title: 'CPU Optimization Opportunity',
        description: `CPU usage is consistently high at ${metrics.cpuUsage.toFixed(1)}%. This may impact response times.`,
        recommendation: 'Optimize bot algorithms, implement request queuing, or distribute load across more instances. Consider upgrading hardware.',
        confidence: 0.85,
        timestamp: new Date(),
        metrics: {
          current: metrics.cpuUsage,
          threshold: 75,
          unit: '%',
        },
        relatedBots: bots.slice(0, 2).map(b => b.name),
        tags: ['optimization', 'cpu', 'performance'],
      });
    }

    // Scaling recommendations
    if (activeBots > 0 && metrics.responseTime < 200 && metrics.memoryUsage < 60) {
      insights.push({
        id: 'scale-001',
        type: 'optimization',
        severity: 'low',
        title: 'Scaling Efficiency Detected',
        description: 'System is operating efficiently with room for increased load. Current resources are underutilized.',
        recommendation: 'Consider reducing bot instances to optimize costs, or prepare for increased traffic by maintaining current capacity.',
        confidence: 0.82,
        timestamp: new Date(),
        metrics: {
          current: activeBots,
          unit: 'bots',
        },
        relatedBots: bots.filter(b => b.status === 'active').map(b => b.name),
        tags: ['scaling', 'efficiency', 'cost-optimization'],
      });
    }

    // Network topology insights
    if (bots.length > 3) {
      insights.push({
        id: 'network-001',
        type: 'optimization',
        severity: 'low',
        title: 'Network Topology Optimization',
        description: 'Bot network could benefit from better load distribution and connection optimization.',
        recommendation: 'Implement intelligent routing, add redundancy for critical bots, and optimize connection patterns.',
        confidence: 0.73,
        timestamp: new Date(),
        relatedBots: bots.slice(0, 3).map(b => b.name),
        tags: ['network', 'topology', 'routing'],
      });
    }

    return insights;
  };

  // Load insights
  useEffect(() => {
    const loadInsights = () => {
      setLoading(true);

      // Simulate AI processing delay
      setTimeout(() => {
        const newInsights = generateAIInsights();
        setInsights(newInsights.slice(0, maxInsights));
        setLoading(false);
      }, 1500);
    };

    loadInsights();

    if (autoRefresh) {
      const interval = setInterval(loadInsights, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, maxInsights, metrics, bots]);

  const toggleInsightExpansion = (insightId: string) => {
    setExpandedInsights(prev => {
      const newSet = new Set(prev);
      if (newSet.has(insightId)) {
        newSet.delete(insightId);
      } else {
        newSet.add(insightId);
      }
      return newSet;
    });
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'warning';
      case 'medium': return 'info';
      case 'low': return 'success';
      default: return 'neutral';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'performance': return <BoltIcon className="w-5 h-5" />;
      case 'error': return <ExclamationCircleIcon className="w-5 h-5" />;
      case 'optimization': return <ChartBarIcon className="w-5 h-5" />;
      case 'prediction': return <SparklesIcon className="w-5 h-5" />;
      default: return <InformationCircleIcon className="w-5 h-5" />;
    }
  };

  const filteredInsights = insights.filter(insight => {
    if (filterType !== 'all' && insight.type !== filterType) { return false; }
    if (filterSeverity !== 'all' && insight.severity !== filterSeverity) { return false; }
    return true;
  });

  if (loading) {
    return (
      <AnimatedBox
        animation="fade-in"
        className="p-6 bg-base-100 rounded-lg shadow-lg"
      >
        <div className="flex items-center gap-2 mb-4">
          <SparklesIcon className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">AI Insights Panel</h2>
        </div>

        <div className="flex items-center gap-4">
          <progress className="progress progress-primary w-full" />
          <span className="text-sm text-base-content/70 whitespace-nowrap">
            Analyzing system data...
          </span>
        </div>
      </AnimatedBox>
    );
  }

  return (
    <AnimatedBox
      animation="slide-up"
      className="p-6 bg-base-100 rounded-lg shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <SparklesIcon className="w-6 h-6 text-primary" />
          <h2 className="text-xl font-bold">AI Insights</h2>
          <div className="badge badge-primary badge-outline">
            {filteredInsights.length} insights
          </div>
        </div>

        {showConfidence && (
          <div className="text-sm text-base-content/70">
            AI Confidence: {(insights.reduce((sum, insight) => sum + insight.confidence, 0) / (insights.length || 1) * 100).toFixed(0)}%
          </div>
        )}
      </div>

      {/* Filter Chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          className={`btn btn-sm ${filterType === 'all' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setFilterType('all')}
        >
          All Types
        </button>
        <button
          className={`btn btn-sm gap-2 ${filterType === 'performance' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setFilterType('performance')}
        >
          <BoltIcon className="w-4 h-4" />
          Performance
        </button>
        <button
          className={`btn btn-sm gap-2 ${filterType === 'error' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setFilterType('error')}
        >
          <ExclamationCircleIcon className="w-4 h-4" />
          Errors
        </button>
        <button
          className={`btn btn-sm gap-2 ${filterType === 'optimization' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setFilterType('optimization')}
        >
          <ChartBarIcon className="w-4 h-4" />
          Optimization
        </button>
        <button
          className={`btn btn-sm gap-2 ${filterType === 'prediction' ? 'btn-primary' : 'btn-ghost'}`}
          onClick={() => setFilterType('prediction')}
        >
          <SparklesIcon className="w-4 h-4" />
          Predictions
        </button>

        <div className="flex-grow" />

        {['all', 'critical', 'high', 'medium', 'low'].map((severity) => (
          <button
            key={severity}
            className={`btn btn-sm ${filterSeverity === severity ? `btn-${getSeverityColor(severity)}` : 'btn-ghost'}`}
            onClick={() => setFilterSeverity(severity)}
          >
            {severity.charAt(0).toUpperCase() + severity.slice(1)}
          </button>
        ))}
      </div>

      {/* Insights List */}
      <div className="space-y-4">
        {filteredInsights.map((insight) => (
          <div
            key={insight.id}
            className={`card bg-base-200 border-l-4 border-${getSeverityColor(insight.severity)}`}
          >
            <div className="card-body p-4">
              {/* Insight Header */}
              <div className="flex items-start gap-4">
                <div className="text-primary mt-1">
                  {getTypeIcon(insight.type)}
                </div>

                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2 flex-wrap">
                    <h3 className="font-bold text-lg">
                      {insight.title}
                    </h3>
                    <div className={`badge badge-${getSeverityColor(insight.severity)}`}>
                      {insight.severity}
                    </div>
                    {showConfidence && (
                      <div className="badge badge-outline ml-auto">
                        {(insight.confidence * 100).toFixed(0)}% confidence
                      </div>
                    )}
                  </div>

                  <p className="text-base-content/80 mb-4">
                    {insight.description}
                  </p>

                  {/* Metrics Display */}
                  {insight.metrics && (
                    <div className="flex gap-6 mb-4 p-3 bg-base-100 rounded-lg">
                      <div>
                        <div className="text-xs text-base-content/60 uppercase font-bold">
                          Current
                        </div>
                        <div className="text-xl font-bold text-primary">
                          {insight.metrics.current.toFixed(1)}{insight.metrics.unit}
                        </div>
                      </div>
                      {insight.metrics.predicted && (
                        <div>
                          <div className="text-xs text-base-content/60 uppercase font-bold">
                            Predicted
                          </div>
                          <div className="text-xl font-bold text-warning">
                            {insight.metrics.predicted.toFixed(1)}{insight.metrics.unit}
                          </div>
                        </div>
                      )}
                      {insight.metrics.threshold && (
                        <div>
                          <div className="text-xs text-base-content/60 uppercase font-bold">
                            Threshold
                          </div>
                          <div className="text-xl font-bold text-error">
                            {insight.metrics.threshold}{insight.metrics.unit}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Tags */}
                  <div className="flex flex-wrap gap-2 mb-2">
                    {insight.tags.map((tag) => (
                      <div key={tag} className="badge badge-ghost badge-sm">
                        {tag}
                      </div>
                    ))}
                  </div>

                  {/* Related Bots */}
                  {insight.relatedBots && insight.relatedBots.length > 0 && (
                    <div className="mb-4">
                      <div className="text-xs text-base-content/60 mb-1">
                        Related Bots:
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {insight.relatedBots.slice(0, 5).map((bot) => (
                          <div key={bot} className="badge badge-info badge-outline badge-sm">
                            {bot}
                          </div>
                        ))}
                        {insight.relatedBots.length > 5 && (
                          <div className="badge badge-ghost badge-outline badge-sm">
                            +{insight.relatedBots.length - 5} more
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Recommendation */}
                  <div className="bg-base-100 p-3 rounded-lg mt-2 border border-base-300">
                    <div className="text-sm font-bold mb-1 flex items-center gap-2">
                      <SparklesIcon className="w-4 h-4 text-secondary" />
                      AI Recommendation:
                    </div>
                    <div className="text-sm">
                      {insight.recommendation}
                    </div>
                  </div>

                  {/* Timestamp */}
                  <div className="text-xs text-base-content/50 mt-2">
                    {insight.timestamp.toLocaleString()}
                  </div>
                </div>

                <button
                  className="btn btn-ghost btn-sm btn-circle"
                  onClick={() => toggleInsightExpansion(insight.id)}
                >
                  {expandedInsights.has(insight.id) ? (
                    <ChevronUpIcon className="w-5 h-5" />
                  ) : (
                    <ChevronDownIcon className="w-5 h-5" />
                  )}
                </button>
              </div>

              {/* Expanded Content */}
              {expandedInsights.has(insight.id) && (
                <div className="mt-4 pt-4 border-t border-base-300 animate-fade-in">
                  <h4 className="font-bold text-sm mb-2">Technical Details</h4>
                  <p className="text-sm text-base-content/70 mb-4">
                    This insight was generated using machine learning analysis of historical performance data,
                    current system metrics, and bot behavior patterns. The confidence level indicates the
                    reliability of this prediction based on similar patterns observed in the past.
                  </p>

                  <div className="flex justify-end">
                    <button className="btn btn-outline btn-sm gap-2">
                      <ChartBarIcon className="w-4 h-4" />
                      View Detailed Analysis
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Empty State */}
      {filteredInsights.length === 0 && (
        <div className="text-center py-12">
          <SparklesIcon className="w-16 h-16 text-base-content/20 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-base-content/50 mb-2">
            No Insights Available
          </h3>
          <p className="text-base-content/50">
            {insights.length === 0
              ? 'AI analysis is in progress. Insights will appear here once analysis is complete.'
              : 'No insights match your current filters. Try adjusting the filter criteria.'
            }
          </p>
        </div>
      )}
    </AnimatedBox>
  );
};

export default AIInsightsPanel;