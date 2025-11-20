import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Badge,
  Alert,
  Select,
  Loading,
  Accordion
} from './DaisyUI';
import {
  ArrowPathIcon as RefreshIcon,
  RectangleGroupIcon as TimelineIcon,
  XMarkIcon as ClearIcon,
  ChevronDownIcon as ExpandMoreIcon,
} from '@heroicons/react/24/outline';
import type { ActivityTimelineBucket } from '../services/api';

interface ActivityTimelineProps {
  refreshInterval?: number;
}

const ActivityTimeline: React.FC<ActivityTimelineProps> = ({
  refreshInterval = 60000 // 1 minute default
}) => {
  const [timelineData, setTimelineData] = useState<ActivityTimelineBucket[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  // Filter states
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('1h');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Mock data for demonstration
  useEffect(() => {
    const generateTimelineData = () => {
      const now = new Date();
      const data: ActivityTimelineBucket[] = [];
      const providers = ['discord', 'slack', 'mattermost'];
      const llmProviders = ['openai', 'flowise', 'openwebui'];

      for (let i = 23; i >= 0; i--) {
        const timestamp = new Date(now.getTime() - i * 5 * 60 * 1000);
        const messageProviders: Record<string, number> = {};
        const llmProvidersData: Record<string, number> = {};

        providers.forEach(provider => {
          messageProviders[provider] = Math.floor(Math.random() * 20) + (i % 3 === 0 ? 50 : 0);
        });

        llmProviders.forEach(provider => {
          llmProvidersData[provider] = Math.floor(Math.random() * 15) + (i % 4 === 0 ? 30 : 0);
        });

        data.push({
          timestamp: timestamp.toISOString(),
          messageProviders,
          llmProviders: llmProvidersData,
        });
      }

      setTimelineData(data);
      setLastRefresh(new Date());
      setLoading(false);
    };

    generateTimelineData();

    if (refreshInterval > 0) {
      const interval = setInterval(generateTimelineData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [refreshInterval]);

  const handleClearFilters = () => {
    setSelectedTimeframe('1h');
    setSelectedProvider('all');
  };

  const getProviderIcon = (provider: string) => {
    switch (provider.toLowerCase()) {
      case 'discord': return '🤖';
      case 'slack': return '💬';
      case 'mattermost': return '📱';
      default: return '🔧';
    }
  };

  const getProviderColor = (provider: string): 'primary' | 'secondary' | 'success' | 'neutral' => {
    switch (provider.toLowerCase()) {
      case 'discord': return 'primary';
      case 'slack': return 'secondary';
      case 'mattermost': return 'success';
      default: return 'neutral';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getTotalActivity = (bucket: ActivityTimelineBucket) => {
    const messageTotal = Object.values(bucket.messageProviders).reduce((sum, count) => sum + count, 0);
    const llmTotal = Object.values(bucket.llmProviders).reduce((sum, count) => sum + count, 0);
    return messageTotal + llmTotal;
  };

  const getMaxActivity = () => {
    return Math.max(...timelineData.map(bucket => getTotalActivity(bucket)));
  };

  const getActivityLevel = (activity: number, maxActivity: number): { level: string; color: 'error' | 'warning' | 'success' } => {
    const percentage = (activity / maxActivity) * 100;
    if (percentage > 80) return { level: 'high', color: 'error' };
    if (percentage > 50) return { level: 'medium', color: 'warning' };
    return { level: 'low', color: 'success' };
  };

  const maxActivity = getMaxActivity();

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex justify-center items-center py-8">
          <Loading.Spinner size="lg" />
          <span className="ml-4">Loading activity timeline...</span>
        </div>
      </Card>
    );
  }

  const totalActivity = timelineData.reduce((sum, bucket) => sum + getTotalActivity(bucket), 0);
  const avgActivity = (totalActivity / timelineData.length).toFixed(1);

  return (
    <div className="space-y-4">
      <Card className="shadow-xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <TimelineIcon className="w-6 h-6" />
              <h2 className="text-xl font-bold">Activity Timeline</h2>
            </div>
            <div className="flex items-center gap-3">
              {lastRefresh && (
                <span className="text-sm opacity-70">
                  Last updated: {lastRefresh.toLocaleTimeString()}
                </span>
              )}
              <Button
                size="sm"
                variant="ghost"
                onClick={() => window.location.reload()}
                disabled={loading}
              >
                <RefreshIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>

          <p className="text-sm opacity-70 mb-4">
            Real-time activity visualization showing message and LLM provider usage over time.
          </p>

          {/* Filters */}
          <div className="flex flex-wrap gap-3 p-4 bg-base-200 rounded-lg mb-4">
            <div className="form-control">
              <label className="label"><span className="label-text">Timeframe</span></label>
              <Select
                value={selectedTimeframe}
                onChange={(e) => setSelectedTimeframe(e.target.value)}
                className="select-sm"
                options={[
                  { value: '15m', label: 'Last 15 minutes' },
                  { value: '1h', label: 'Last hour' },
                  { value: '6h', label: 'Last 6 hours' },
                  { value: '24h', label: 'Last 24 hours' }
                ]}
              />
            </div>

            <div className="form-control">
              <label className="label"><span className="label-text">Provider Filter</span></label>
              <Select
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
                className="select-sm"
                options={[
                  { value: 'all', label: 'All Providers' },
                  { value: 'discord', label: 'Discord Only' },
                  { value: 'slack', label: 'Slack Only' },
                  { value: 'mattermost', label: 'Mattermost Only' }
                ]}
              />
            </div>

            <Button
              size="sm"
              variant="outline"
              onClick={handleClearFilters}
              className="self-end"
            >
              <ClearIcon className="w-4 h-4 mr-1" />
              Clear Filters
            </Button>
          </div>

          {/* Timeline Visualization */}
          <div className="mb-4">
            <h3 className="text-sm font-bold mb-2">Activity Over Time</h3>

            <div className="max-h-96 overflow-y-auto space-y-2">
              {timelineData.map((bucket, index) => {
                const totalActivity = getTotalActivity(bucket);
                const activityLevel = getActivityLevel(totalActivity, maxActivity);

                const shouldShow = selectedProvider === 'all' ||
                  (selectedProvider === 'discord' && bucket.messageProviders.discord > 0) ||
                  (selectedProvider === 'slack' && bucket.messageProviders.slack > 0) ||
                  (selectedProvider === 'mattermost' && bucket.messageProviders.mattermost > 0);

                if (!shouldShow) return null;

                return (
                  <div
                    key={index}
                    className="p-3 border border-base-300 rounded-lg hover:bg-base-200 transition-colors"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">{formatTimestamp(bucket.timestamp)}</span>
                      <Badge variant={activityLevel.color} size="sm">
                        {totalActivity} activities
                      </Badge>
                    </div>

                    <div className="flex flex-wrap gap-1 mb-1">
                      {Object.entries(bucket.messageProviders).map(([provider, count]) => (
                        count > 0 && (
                          <Badge key={provider} variant={getProviderColor(provider)} size="sm">
                            {getProviderIcon(provider)} {provider}: {count}
                          </Badge>
                        )
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {Object.entries(bucket.llmProviders).map(([provider, count]) => (
                        count > 0 && (
                          <Badge key={provider} variant="neutral" size="sm">
                            {provider}: {count}
                          </Badge>
                        )
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Summary Statistics */}
          <Accordion>
            <Accordion.Item>
              <Accordion.Trigger>
                <span className="font-bold">Summary Statistics</span>
              </Accordion.Trigger>
              <Accordion.Content>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <h4 className="text-sm font-bold mb-1">Total Activity</h4>
                    <div className="text-3xl font-bold text-primary">{totalActivity}</div>
                    <p className="text-xs opacity-70">Total activities in selected timeframe</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold mb-1">Peak Activity</h4>
                    <div className="text-3xl font-bold text-warning">{maxActivity}</div>
                    <p className="text-xs opacity-70">Highest activity in a single time slot</p>
                  </div>

                  <div>
                    <h4 className="text-sm font-bold mb-1">Average Activity</h4>
                    <div className="text-3xl font-bold text-success">{avgActivity}</div>
                    <p className="text-xs opacity-70">Average activities per time slot</p>
                  </div>
                </div>

                <div>
                  <h4 className="text-sm font-bold mb-2">Provider Breakdown</h4>
                  <div className="flex flex-wrap gap-2">
                    {['discord', 'slack', 'mattermost'].map(provider => {
                      const total = timelineData.reduce((sum, bucket) => sum + (bucket.messageProviders[provider] || 0), 0);
                      return total > 0 && (
                        <Badge key={provider} variant={getProviderColor(provider)}>
                          {getProviderIcon(provider)} {provider}: {total}
                        </Badge>
                      );
                    })}
                  </div>
                </div>
              </Accordion.Content>
            </Accordion.Item>
          </Accordion>
        </div>
      </Card>

      {/* Toast for notifications */}
      {toast && (
        <div className="toast toast-end">
          <Alert status={toast.type} message={toast.message} />
        </div>
      )}
    </div>
  );
};

export default ActivityTimeline;