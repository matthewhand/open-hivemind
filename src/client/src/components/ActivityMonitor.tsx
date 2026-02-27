/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Badge, Button, Alert, DataTable } from './DaisyUI';
import {
  Activity,
  Server,
  Play,
  Pause,
  RefreshCw,
  Clock,
  MessageCircle,
  AlertCircle,
} from 'lucide-react';
import { apiService, ActivityEvent } from '../services/api';

const getStatusColor = (status: string): 'info' | 'warning' | 'error' | 'success' => {
  switch (status) {
    case 'success': return 'success';
    case 'error': return 'error';
    case 'timeout': return 'warning';
    default: return 'info';
  }
};

interface ActivityMonitorProps {
  showPopoutButton?: boolean;
  autoRefresh?: boolean;
}

const ActivityMonitor: React.FC<ActivityMonitorProps> = ({ showPopoutButton = false, autoRefresh = true }) => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(autoRefresh);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchActivity = useCallback(async (signal?: AbortSignal) => {
    try {
      const response = await apiService.getActivity({ signal });

      setEvents((prevEvents) => {
        // Optimization: prevent unnecessary re-renders if data hasn't changed.
        // Deep comparison is expensive, but checking length and key fields (ID + Status) is efficient.
        const hasChanged =
          prevEvents.length !== response.events.length ||
          response.events.some((event, index) => {
            const prev = prevEvents[index];
            return !prev || prev.id !== event.id || prev.status !== event.status;
          });

        return hasChanged ? response.events : prevEvents;
      });

      setLastUpdated(new Date());
    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('Failed to fetch activity:', error);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetchActivity(controller.signal);

    if (isMonitoring) {
      const interval = setInterval(() => {
        fetchActivity(controller.signal);
      }, 5000);
      return () => {
        clearInterval(interval);
        controller.abort();
      };
    }

    return () => {
      controller.abort();
    };
  }, [isMonitoring, fetchActivity]);

  const columns = useMemo(() => [
    {
      key: 'timestamp',
      title: 'Time',
      render: (value: string) => <span className="font-mono text-xs">{new Date(value).toLocaleTimeString()}</span>,
    },
    {
      key: 'botName',
      title: 'Bot',
      render: (value: string) => <span className="font-semibold">{value}</span>,
    },
    {
      key: 'provider',
      title: 'Provider',
      render: (value: string) => <Badge size="sm" variant="ghost">{value}</Badge>,
    },
    {
      key: 'messageType',
      title: 'Type',
      render: (value: string) => (
        <div className="flex items-center gap-1">
          <MessageCircle className="w-3 h-3" />
          <span className="text-xs uppercase">{value}</span>
        </div>
      ),
    },
    {
      key: 'status',
      title: 'Status',
      render: (value: string) => <Badge size="sm" variant={getStatusColor(value)}>{value}</Badge>,
    },
    {
      key: 'processingTime',
      title: 'Duration',
      render: (value: number) => value ? <span className="font-mono text-xs">{value}ms</span> : '-',
    },
  ], []);

  // Calculated Stats
  const { totalEvents, errorEvents, uniqueBots, recentEventsCount } = useMemo(() => {
    const total = events.length;
    const errors = events.filter(e => e.status === 'error' || e.status === 'timeout').length;
    const unique = new Set(events.map(e => e.botName)).size;
    // Events in last 5 minutes (assuming events are recent)
    const recent = events.filter(e => new Date(e.timestamp).getTime() > Date.now() - 5 * 60 * 1000).length;

    return {
      totalEvents: total,
      errorEvents: errors,
      uniqueBots: unique,
      recentEventsCount: recent
    };
  }, [events]);

  const paginationConfig = useMemo(() => ({ pageSize: 10 }), []);

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg border-l-4 border-info">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Activity className="w-8 h-8 text-info" />
              <div>
                <h2 className="card-title text-2xl">Activity Monitor</h2>
                <p className="text-sm opacity-70">
                  Real-time system activity tracking • Last updated: {lastUpdated.toLocaleTimeString()}
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
                {isMonitoring ? 'Pause Live' : 'Resume Live'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => { setLoading(true); fetchActivity(); }}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow bg-base-100">
          <div className="card-body p-4 flex flex-row items-center justify-between">
            <div>
              <p className="text-sm opacity-70">Total Events</p>
              <div className="text-2xl font-bold">{totalEvents}</div>
            </div>
            <div className="bg-primary/10 p-3 rounded-full text-primary">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </Card>
        <Card className="shadow bg-base-100">
          <div className="card-body p-4 flex flex-row items-center justify-between">
            <div>
               <p className="text-sm opacity-70">Active Bots</p>
               <div className="text-2xl font-bold">{uniqueBots}</div>
            </div>
            <div className="bg-info/10 p-3 rounded-full text-info">
              <Server className="w-6 h-6" />
            </div>
          </div>
        </Card>
        <Card className="shadow bg-base-100">
          <div className="card-body p-4 flex flex-row items-center justify-between">
            <div>
               <p className="text-sm opacity-70">Errors</p>
               <div className="text-2xl font-bold text-error">{errorEvents}</div>
            </div>
            <div className="bg-error/10 p-3 rounded-full text-error">
              <AlertCircle className="w-6 h-6" />
            </div>
          </div>
        </Card>
        <Card className="shadow bg-base-100">
          <div className="card-body p-4 flex flex-row items-center justify-between">
             <div>
               <p className="text-sm opacity-70">Last 5 min</p>
               <div className="text-2xl font-bold text-success">{recentEventsCount}</div>
            </div>
            <div className="bg-success/10 p-3 rounded-full text-success">
              <Clock className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* Activity Table */}
      <Card className="shadow-lg">
        <div className="card-body p-0">
          <DataTable
            data={events}
            columns={columns}
            loading={loading}
            pagination={paginationConfig}
            searchable={true}
          />
        </div>
      </Card>

      {isMonitoring && (
        <Alert variant="info" className="flex items-center gap-3">
          <Activity className="w-5 h-5 animate-pulse" />
          <div>
            <p className="font-medium">Live monitoring active</p>
            <p className="text-sm opacity-70">Fetching new events every 5 seconds</p>
          </div>
        </Alert>
      )}
    </div>
  );
};

export default ActivityMonitor;
