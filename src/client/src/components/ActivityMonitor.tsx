/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Alert, Table } from './DaisyUI';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  Bot,
  CheckCircle,
  Clock,
  Filter,
  MessageCircle,
  Pause,
  Play,
  RefreshCw,
  Search,
  User,
} from 'lucide-react';
import { apiService } from '../services/api';
import type { ActivityEvent } from '../services/api';

interface ActivityMonitorProps {
  refreshInterval?: number;
}

const ActivityMonitor: React.FC<ActivityMonitorProps> = ({
  refreshInterval = 5000,
}) => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const fetchActivity = async () => {
    try {
      // Fetch real activity data
      // We can pass filters to the API if needed, but for now we fetch all and filter client-side for simplicity in this view
      const response = await apiService.getActivity();
      setEvents(response.events || []);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();

    let interval: NodeJS.Timeout;
    if (isMonitoring && refreshInterval > 0) {
      interval = setInterval(fetchActivity, refreshInterval);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMonitoring, refreshInterval]);

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'error') return event.status === 'error' || event.status === 'timeout';
    if (filter === 'bot') return true; // Most events are bot related, maybe refine?
    // Map API fields to filters
    return true;
  });

  // Client-side filtering logic refinement based on API fields
  const displayEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'error') return event.status === 'error' || event.status === 'timeout';
    if (filter === 'user') return event.messageType === 'incoming';
    if (filter === 'bot') return event.messageType === 'outgoing';
    return true;
  });

  const getStatusColor = (status: string): 'info' | 'warning' | 'error' | 'success' => {
    switch (status) {
      case 'error': return 'error';
      case 'timeout': return 'warning';
      case 'success': return 'success';
      default: return 'info';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'outgoing': return <Bot className="w-4 h-4" />;
      case 'incoming': return <User className="w-4 h-4" />;
      default: return <MessageCircle className="w-4 h-4" />;
    }
  };

  const formatDuration = (ms?: number) => {
    if (!ms) return '-';
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  // Calculate stats from real data
  const stats = {
    total: events.length,
    bots: events.filter(e => e.messageType === 'outgoing').length,
    users: events.filter(e => e.messageType === 'incoming').length,
    errors: events.filter(e => e.status === 'error' || e.status === 'timeout').length,
    recent: events.filter(e => new Date(e.timestamp) > new Date(Date.now() - 5 * 60 * 1000)).length
  };

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-sm border border-base-200">
        <div className="card-body p-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Activity className="w-6 h-6 text-primary" />
              <div>
                <h2 className="card-title text-lg">Live Activity Feed</h2>
                <p className="text-sm opacity-70 flex items-center gap-1">
                  {isMonitoring ? (
                    <>
                      <span className="w-2 h-2 rounded-full bg-success animate-pulse"></span>
                      Monitoring active
                    </>
                  ) : (
                    <>
                      <span className="w-2 h-2 rounded-full bg-neutral"></span>
                      Paused
                    </>
                  )}
                  {lastRefresh && ` • Updated: ${lastRefresh.toLocaleTimeString()}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant={isMonitoring ? 'error' : 'success'}
                onClick={() => setIsMonitoring(!isMonitoring)}
                className="gap-2"
              >
                {isMonitoring ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isMonitoring ? 'Pause' : 'Resume'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={fetchActivity}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="stats shadow border border-base-200">
          <div className="stat place-items-center p-2">
            <div className="stat-title text-xs">Total Events</div>
            <div className="stat-value text-xl">{stats.total}</div>
            <div className="stat-desc text-xs">Loaded</div>
          </div>
        </div>
        <div className="stats shadow border border-base-200">
          <div className="stat place-items-center p-2">
            <div className="stat-title text-xs">Bot Actions</div>
            <div className="stat-value text-primary text-xl">{stats.bots}</div>
            <div className="stat-desc text-xs">Outgoing</div>
          </div>
        </div>
        <div className="stats shadow border border-base-200">
          <div className="stat place-items-center p-2">
            <div className="stat-title text-xs">User Actions</div>
            <div className="stat-value text-secondary text-xl">{stats.users}</div>
            <div className="stat-desc text-xs">Incoming</div>
          </div>
        </div>
        <div className="stats shadow border border-base-200">
          <div className="stat place-items-center p-2">
            <div className="stat-title text-xs">Errors</div>
            <div className="stat-value text-error text-xl">{stats.errors}</div>
            <div className="stat-desc text-xs">Failures</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <Filter className="w-4 h-4 opacity-50" />
        <div className="join">
          <button
            className={`join-item btn btn-sm ${filter === 'all' ? 'btn-active btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter('all')}
          >
            All
          </button>
          <button
            className={`join-item btn btn-sm ${filter === 'bot' ? 'btn-active btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter('bot')}
          >
            Bot
          </button>
          <button
            className={`join-item btn btn-sm ${filter === 'user' ? 'btn-active btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter('user')}
          >
            User
          </button>
          <button
            className={`join-item btn btn-sm ${filter === 'error' ? 'btn-active btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter('error')}
          >
            Errors
          </button>
        </div>
      </div>

      {/* Activity Table */}
      <Card className="border border-base-200 overflow-hidden">
        <div className="overflow-x-auto">
          {displayEvents.length === 0 ? (
            <div className="p-8 text-center opacity-50 flex flex-col items-center gap-2">
              <Search className="w-8 h-8" />
              <p>No activity found matching your filters.</p>
            </div>
          ) : (
            <Table className="table table-zebra table-sm w-full">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Bot / Provider</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {displayEvents.slice(0, 50).map((event) => (
                  <tr key={event.id}>
                    <td className="whitespace-nowrap font-mono text-xs opacity-70">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </td>
                    <td>
                      <div className="flex items-center gap-2" title={event.messageType}>
                        {getTypeIcon(event.messageType)}
                        <span className="capitalize text-xs">{event.messageType}</span>
                      </div>
                    </td>
                    <td>
                      <div className="flex flex-col">
                        <span className="font-medium text-xs">{event.botName}</span>
                        <span className="text-[10px] opacity-70">{event.provider} • {event.llmProvider}</span>
                      </div>
                    </td>
                    <td>
                      <Badge variant={getStatusColor(event.status)} size="sm">
                        {event.status}
                      </Badge>
                      {event.errorMessage && (
                        <div className="tooltip tooltip-left" data-tip={event.errorMessage}>
                          <AlertTriangle className="w-3 h-3 text-error ml-1 inline" />
                        </div>
                      )}
                    </td>
                    <td className="font-mono text-xs">
                      {formatDuration(event.processingTime)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </div>
      </Card>
    </div>
  );
};

export default ActivityMonitor;
