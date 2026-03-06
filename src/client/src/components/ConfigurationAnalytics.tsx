/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Alert, Loading } from './DaisyUI';
import {
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChartBarIcon,
  ChartPieIcon,
  ArrowPathIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

interface ConfigurationMetric {
  name: string;
  value: number;
  change: number;
  trend: 'up' | 'down' | 'stable';
  category: string;
}

interface UsageStatistic {
  feature: string;
  usage: number;
  efficiency: number;
  recommendations: string[];
}

interface OptimizationSuggestion {
  id: string;
  title: string;
  description: string;
  impact: 'high' | 'medium' | 'low';
  effort: 'high' | 'medium' | 'low';
  category: string;
}

const ConfigurationAnalytics: React.FC = () => {
  const [metrics, setMetrics] = useState<ConfigurationMetric[]>([]);
  const [usageStats, setUsageStats] = useState<UsageStatistic[]>([]);
  const [suggestions, setSuggestions] = useState<OptimizationSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      // Mock analytics data
      const mockMetrics: ConfigurationMetric[] = [
        { name: 'Configuration Changes', value: 45, change: 12, trend: 'up', category: 'Activity' },
        { name: 'Active Bots', value: 8, change: 2, trend: 'up', category: 'Performance' },
        { name: 'Error Rate', value: 2.3, change: -0.8, trend: 'down', category: 'Reliability' },
        { name: 'Response Time', value: 245, change: -15, trend: 'down', category: 'Performance' },
      ];

      const mockUsageStats: UsageStatistic[] = [
        { feature: 'Message Processing', usage: 89, efficiency: 94, recommendations: ['Consider increasing batch size', 'Optimize LLM calls'] },
        { feature: 'Configuration Management', usage: 67, efficiency: 87, recommendations: ['Use hot reload more frequently', 'Implement automated backups'] },
        { feature: 'Monitoring & Alerting', usage: 45, efficiency: 92, recommendations: ['Configure more alert thresholds', 'Set up automated responses'] },
      ];

      const mockSuggestions: OptimizationSuggestion[] = [
        { id: '1', title: 'Enable Configuration Caching', description: 'Implement Redis caching for frequently accessed configurations to reduce database load', impact: 'high', effort: 'medium', category: 'Performance' },
        { id: '2', title: 'Implement Configuration Validation', description: 'Add schema validation for all configuration changes to prevent runtime errors', impact: 'high', effort: 'low', category: 'Reliability' },
        { id: '3', title: 'Optimize Bot Restart Logic', description: 'Implement graceful bot restarts with zero-downtime deployment', impact: 'medium', effort: 'high', category: 'Availability' },
      ];

      setMetrics(mockMetrics);
      setUsageStats(mockUsageStats);
      setSuggestions(mockSuggestions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  };

  const getTrendIcon = (trend: string) => {
    const className = 'w-5 h-5';
    switch (trend) {
    case 'up':
      return <ArrowTrendingUpIcon className={`${className} text-success`} />;
    case 'down':
      return <ArrowTrendingDownIcon className={`${className} text-error`} />;
    default:
      return <ChartBarIcon className={`${className} text-base-content/50`} />;
    }
  };

  const getTrendColor = (trend: string) => {
    switch (trend) {
    case 'up': return 'text-success';
    case 'down': return 'text-error';
    default: return 'text-base-content/70';
    }
  };

  const getImpactVariant = (impact: string): 'error' | 'warning' | 'neutral' => {
    switch (impact) {
    case 'high': return 'error';
    case 'medium': return 'warning';
    default: return 'neutral';
    }
  };

  const getEffortVariant = (effort: string): 'error' | 'warning' | 'success' => {
    switch (effort) {
    case 'high': return 'error';
    case 'medium': return 'warning';
    default: return 'success';
    }
  };

  if (loading && metrics.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-96">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Configuration Analytics</h1>
        <Button
          variant="secondary"
          buttonStyle="outline"
          onClick={loadAnalytics}
          disabled={loading}
          className="flex items-center gap-2"
        >
          <ArrowPathIcon className="w-4 h-4" />
          Refresh
        </Button>
      </div>

      {error && <Alert status="error" message={error} className="mb-6" />}

      {/* Metrics Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {metrics.map((metric, index) => (
          <Card key={index}>
            <div className="flex justify-between items-start mb-2">
              <h3 className="font-semibold">{metric.name}</h3>
              {getTrendIcon(metric.trend)}
            </div>
            <p className="text-3xl font-bold mb-1">
              {typeof metric.value === 'number' && metric.value % 1 !== 0
                ? metric.value.toFixed(1)
                : metric.value}
            </p>
            <div className="flex items-center gap-1">
              <span className={`text-sm font-medium ${getTrendColor(metric.trend)}`}>
                {metric.change > 0 ? '+' : ''}{metric.change}
              </span>
              <span className="text-sm text-base-content/70">vs last period</span>
            </div>
          </Card>
        ))}
      </div>

      {/* Usage Statistics & Suggestions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Feature Usage & Efficiency */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Feature Usage & Efficiency</h2>
          <div className="space-y-3">
            {usageStats.map((stat, index) => (
              <div key={index} className="border-b border-base-300 last:border-0 pb-3 last:pb-0">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-medium">{stat.feature}</span>
                  <div className="flex gap-2">
                    <Badge variant="primary" size="sm">{stat.usage}% used</Badge>
                    <Badge
                      variant={stat.efficiency > 90 ? 'success' : stat.efficiency > 80 ? 'warning' : 'error'}
                      size="sm"
                    >
                      {stat.efficiency}% efficient
                    </Badge>
                  </div>
                </div>
                <div className="text-sm text-base-content/70">
                  <p className="mb-1 font-medium">Recommendations:</p>
                  {stat.recommendations.map((rec, recIndex) => (
                    <p key={recIndex} className="text-xs">• {rec}</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Optimization Suggestions */}
        <Card>
          <h2 className="text-lg font-semibold mb-4">Optimization Suggestions</h2>
          <div className="space-y-3">
            {suggestions.map((suggestion) => (
              <div key={suggestion.id} className="border-b border-base-300 last:border-0 pb-3 last:pb-0">
                <h3 className="font-medium mb-2">{suggestion.title}</h3>
                <div className="flex gap-2 mb-2">
                  <Badge variant={getImpactVariant(suggestion.impact)} size="sm">
                    Impact: {suggestion.impact}
                  </Badge>
                  <Badge variant={getEffortVariant(suggestion.effort)} size="sm">
                    Effort: {suggestion.effort}
                  </Badge>
                </div>
                <p className="text-sm text-base-content/70">{suggestion.description}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Performance Insights */}
      <Card>
        <h2 className="text-lg font-semibold mb-4">Performance Insights</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-base-200 rounded-box text-center">
            <CheckCircleIcon className="w-12 h-12 text-success mx-auto mb-2" />
            <h3 className="font-semibold">System Health</h3>
            <p className="text-sm text-base-content/70">All systems operating optimally</p>
          </div>
          <div className="p-4 bg-base-200 rounded-box text-center">
            <ChartBarIcon className="w-12 h-12 text-primary mx-auto mb-2" />
            <h3 className="font-semibold">Resource Usage</h3>
            <p className="text-sm text-base-content/70">Memory: 67% | CPU: 45%</p>
          </div>
          <div className="p-4 bg-base-200 rounded-box text-center">
            <ChartPieIcon className="w-12 h-12 text-secondary mx-auto mb-2" />
            <h3 className="font-semibold">Configuration Coverage</h3>
            <p className="text-sm text-base-content/70">89% of features configured</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ConfigurationAnalytics;