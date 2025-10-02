import React, { useState, useEffect } from 'react';
import {
  Refresh as RefreshIcon,
  Timeline as TimelineIcon,
  Message as MessageIcon,
  Error as ErrorIcon,
} from '@mui/icons-material';
import { apiService } from '../services/api';

interface ActivityEvent {
  id: string;
  timestamp: string;
  botName: string;
  provider: string;
  llmProvider: string;
  channelId: string;
  userId: string;
  messageType: 'incoming' | 'outgoing';
  contentLength: number;
  processingTime?: number;
  status: 'success' | 'error' | 'timeout';
  errorMessage?: string;
}

interface ActivityMetrics {
  totalMessages: number;
  successRate: number;
  averageResponseTime: number;
  errorCount: number;
}

const ActivityMonitor: React.FC = () => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [metrics, setMetrics] = useState<ActivityMetrics>({
    totalMessages: 0,
    successRate: 0,
    averageResponseTime: 0,
    errorCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBot, setSelectedBot] = useState<string>('all');
  const [selectedProvider, setSelectedProvider] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<string>('1h');

  const timeRanges = [
    { value: '15m', label: 'Last 15 minutes' },
    { value: '1h', label: 'Last hour' },
    { value: '6h', label: 'Last 6 hours' },
    { value: '24h', label: 'Last 24 hours' },
    { value: '7d', label: 'Last 7 days' },
  ];

  const fetchActivity = async () => {
    try {
      setLoading(true);
      setError(null);

      const params: Record<string, string> = {};
      if (selectedBot !== 'all') params.bot = selectedBot;
      if (selectedProvider !== 'all') params.messageProvider = selectedProvider;

      // Calculate time range
      const now = new Date();
      const from = new Date();
      switch (timeRange) {
        case '15m':
          from.setMinutes(now.getMinutes() - 15);
          break;
        case '1h':
          from.setHours(now.getHours() - 1);
          break;
        case '6h':
          from.setHours(now.getHours() - 6);
          break;
        case '24h':
          from.setHours(now.getHours() - 24);
          break;
        case '7d':
          from.setDate(now.getDate() - 7);
          break;
        default:
          from.setHours(now.getHours() - 1);
      }

      params.from = from.toISOString();
      params.to = now.toISOString();

      const response = await apiService.getActivity(params);

      setEvents(response.events || []);

      // Calculate metrics
      const totalMessages = response.events.length;
      const successCount = response.events.filter(e => e.status === 'success').length;
      const errorCount = response.events.filter(e => e.status === 'error').length;
      const totalProcessingTime = response.events.reduce((sum, e) => sum + (e.processingTime || 0), 0);
      const averageResponseTime = totalMessages > 0 ? totalProcessingTime / totalMessages : 0;

      setMetrics({
        totalMessages,
        successRate: totalMessages > 0 ? (successCount / totalMessages) * 100 : 0,
        averageResponseTime,
        errorCount,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activity data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();

    // Set up polling for real-time updates
    const interval = setInterval(fetchActivity, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [selectedBot, selectedProvider, timeRange]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'badge-success';
      case 'error':
        return 'badge-error';
      case 'timeout':
        return 'badge-warning';
      default:
        return 'badge-ghost';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <MessageIcon />;
      case 'error':
        return <ErrorIcon />;
      case 'timeout':
        return <TimelineIcon />;
      default:
        return <MessageIcon />;
    }
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  if (loading && events.length === 0) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-3xl font-bold flex items-center">
          <TimelineIcon className="mr-2" />
          Activity Monitor
        </h2>
        <div className="flex gap-2">
          <button
            className="btn btn-outline"
            onClick={fetchActivity}
            disabled={loading}
          >
            <RefreshIcon className="mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error mb-4">
          <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          <span>{error}</span>
        </div>
      )}

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-base-content/70">Total Messages</h3>
            <p className="text-3xl font-bold">{metrics.totalMessages}</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-base-content/70">Success Rate</h3>
            <p className="text-3xl font-bold text-success">{metrics.successRate.toFixed(1)}%</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-base-content/70">Avg Response Time</h3>
            <p className="text-3xl font-bold">{formatDuration(metrics.averageResponseTime)}</p>
          </div>
        </div>
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h3 className="card-title text-base-content/70">Errors</h3>
            <p className="text-3xl font-bold text-error">{metrics.errorCount}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card bg-base-100 shadow-xl mb-6">
        <div className="card-body">
          <h3 className="card-title">Filters</h3>
          <div className="flex flex-wrap gap-4">
            <div className="form-control w-full max-w-xs">
              <label className="label">
                <span className="label-text">Bot</span>
              </label>
              <select
                className="select select-bordered"
                value={selectedBot}
                onChange={(e) => setSelectedBot(e.target.value)}
              >
                <option value="all">All Bots</option>
                <option value="Bot1">Bot 1</option>
                <option value="Bot2">Bot 2</option>
                <option value="Bot3">Bot 3</option>
              </select>
            </div>

            <div className="form-control w-full max-w-xs">
              <label className="label">
                <span className="label-text">Provider</span>
              </label>
              <select
                className="select select-bordered"
                value={selectedProvider}
                onChange={(e) => setSelectedProvider(e.target.value)}
              >
                <option value="all">All Providers</option>
                <option value="discord">Discord</option>
                <option value="slack">Slack</option>
                <option value="mattermost">Mattermost</option>
              </select>
            </div>

            <div className="form-control w-full max-w-xs">
              <label className="label">
                <span className="label-text">Time Range</span>
              </label>
              <select
                className="select select-bordered"
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
              >
                {timeRanges.map((range) => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Activity Table */}
      <div className="overflow-x-auto">
        <table className="table w-full">
          <thead>
            <tr>
              <th>Time</th>
              <th>Bot</th>
              <th>Provider</th>
              <th>Type</th>
              <th>Status</th>
              <th>Response Time</th>
              <th>Content Length</th>
            </tr>
          </thead>
          <tbody>
            {events.length > 0 ? (
              events.map((event) => (
                <tr key={event.id} className="hover">
                  <td>
                    <span className="text-sm">{formatTime(event.timestamp)}</span>
                  </td>
                  <td>
                    <span className="font-bold">{event.botName}</span>
                  </td>
                  <td>
                    <div className="badge badge-outline">{event.provider}</div>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      {getStatusIcon(event.messageType)}
                      <span className="text-sm">{event.messageType}</span>
                    </div>
                  </td>
                  <td>
                    <div className={`badge ${getStatusColor(event.status)}`}>
                      {event.status}
                    </div>
                  </td>
                  <td>
                    <span className="text-sm">
                      {event.processingTime ? formatDuration(event.processingTime) : '-'}
                    </span>
                  </td>
                  <td>
                    <span className="text-sm">{event.contentLength} chars</span>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className="text-center py-8">
                  <span className="text-base-content/70">No activity data available</span>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ActivityMonitor;