/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Badge, Button, Table, Alert } from './DaisyUI';
import {
  Zap,
  Server,
  Users,
  BarChart2,
  Bot,
  MessageSquare,
  AlertTriangle,
  Activity,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { apiService } from '../services/api';
import type { ActivityResponse, ActivityEvent } from '../services/api';

const ActivityMonitor: React.FC = () => {
  const [activityData, setActivityData] = useState<ActivityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [filter, setFilter] = useState<string>('all');
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const fetchActivity = useCallback(async () => {
    try {
      // Fetch recent activity
      const data = await apiService.getActivity({
          from: new Date(Date.now() - 3600000).toISOString() // Last hour
      });
      setActivityData(data);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchActivity(); // Initial fetch

    if (!isMonitoring) { return; }

    const interval = setInterval(fetchActivity, 5000);
    return () => clearInterval(interval);
  }, [isMonitoring, fetchActivity]);

  const events = activityData?.events || [];

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'error') return event.status === 'error' || event.status === 'timeout';
    if (filter === 'bot') return event.messageType === 'outgoing';
    if (filter === 'user') return event.messageType === 'incoming';
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'error': return <XCircle className="w-4 h-4" />;
      case 'timeout': return <Clock className="w-4 h-4" />;
      case 'success': return <CheckCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'outgoing': return <Bot className="w-4 h-4" />;
      case 'incoming': return <Users className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  // Stats calculation
  const totalEvents = events.length;
  const botEvents = events.filter(e => e.messageType === 'outgoing').length;
  const userEvents = events.filter(e => e.messageType === 'incoming').length;
  const errorEvents = events.filter(e => e.status === 'error' || e.status === 'timeout').length;
  const recentCount = events.filter(e => new Date(e.timestamp) > new Date(Date.now() - 300000)).length; // Last 5 min

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg border-l-4 border-info bg-base-100">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Activity className="w-8 h-8 text-info" />
              <div>
                <h2 className="card-title text-2xl">Activity Monitor</h2>
                <p className="text-sm opacity-70">Real-time system activity tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isMonitoring ? 'success' : 'neutral'} size="lg">
                {isMonitoring ? 'Live' : 'Paused'}
              </Badge>
              <Button
                onClick={() => setIsMonitoring(!isMonitoring)}
                className={`btn-${isMonitoring ? 'error' : 'success'}`}
                size="sm"
              >
                {isMonitoring ? 'Pause' : 'Resume'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow bg-base-100">
          <div className="card-body text-center p-4">
            <Zap className="w-8 h-8 mx-auto text-primary mb-2" />
            <div className="text-2xl font-bold">{totalEvents}</div>
            <p className="text-sm opacity-70">Total Events (1h)</p>
          </div>
        </Card>
        <Card className="shadow bg-base-100">
          <div className="card-body text-center p-4">
            <Bot className="w-8 h-8 mx-auto text-info mb-2" />
            <div className="text-2xl font-bold">{botEvents}</div>
            <p className="text-sm opacity-70">Bot Responses</p>
          </div>
        </Card>
        <Card className="shadow bg-base-100">
          <div className="card-body text-center p-4">
            <Users className="w-8 h-8 mx-auto text-secondary mb-2" />
            <div className="text-2xl font-bold">{userEvents}</div>
            <p className="text-sm opacity-70">User Messages</p>
          </div>
        </Card>
        <Card className="shadow bg-base-100">
          <div className="card-body text-center p-4">
            <BarChart2 className="w-8 h-8 mx-auto text-accent mb-2" />
            <div className="text-2xl font-bold">{recentCount}</div>
            <p className="text-sm opacity-70">Last 5 min</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow bg-base-100">
        <div className="card-body p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-semibold">Filter:</span>
            <div className="join">
              <Button
                size="sm"
                className={`join-item ${filter === 'all' ? 'btn-active' : 'btn-ghost'}`}
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                 size="sm"
                className={`join-item ${filter === 'bot' ? 'btn-active' : 'btn-ghost'}`}
                onClick={() => setFilter('bot')}
              >
                Bot
              </Button>
              <Button
                 size="sm"
                className={`join-item ${filter === 'user' ? 'btn-active' : 'btn-ghost'}`}
                onClick={() => setFilter('user')}
              >
                User
              </Button>
              <Button
                 size="sm"
                className={`join-item ${filter === 'error' ? 'btn-active' : 'btn-ghost'}`}
                onClick={() => setFilter('error')}
              >
                Errors
              </Button>
            </div>

             <span className="text-xs ml-auto opacity-50">Last updated: {lastUpdated.toLocaleTimeString()}</span>
          </div>
        </div>
      </Card>

      {/* Activity Table */}
      <Card className="shadow-lg bg-base-100">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <Table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Source/Target</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="text-center py-8 text-base-content/60">
                            No events found matching current filter.
                        </td>
                    </tr>
                ) : (
                    filteredEvents.slice(0, 20).map((event) => (
                    <tr key={event.id}>
                        <td className="text-sm opacity-70 whitespace-nowrap">
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
                                <span className="text-[10px] opacity-60">{event.provider}</span>
                            </div>
                        </td>
                        <td className="max-w-xs truncate text-sm">
                            {event.errorMessage ? (
                                <span className="text-error">{event.errorMessage}</span>
                            ) : (
                                <span>
                                    {event.messageType === 'incoming'
                                        ? `Message from User (${event.contentLength} chars)`
                                        : `Response from Bot (${event.contentLength} chars)`}
                                </span>
                            )}
                        </td>
                        <td>
                        <Badge variant={getStatusColor(event.status)} size="sm" className="gap-1">
                            {getStatusIcon(event.status)}
                            {event.status}
                        </Badge>
                        </td>
                        <td className="text-sm font-mono">
                        {event.processingTime ? `${event.processingTime}ms` : '-'}
                        </td>
                    </tr>
                    ))
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </Card>

      {isMonitoring && (
        <Alert variant="info" className="flex items-center gap-3">
          <Activity className="w-5 h-5 animate-pulse" />
          <div>
            <p className="font-medium">Live monitoring active</p>
            <p className="text-sm opacity-70">Real-time events being captured every 5 seconds</p>
          </div>
        </Alert>
      )}
    </div>
  );
};

export default ActivityMonitor;
