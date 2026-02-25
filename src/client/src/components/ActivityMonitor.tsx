/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Badge, Button, Alert, Table } from './DaisyUI';
import {
  Activity,
  Server,
  Users,
  BarChart2,
  Play,
  Pause,
  Bot,
  User,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
} from 'lucide-react';
import { apiService } from '../services/api';
import type { ActivityEvent } from '../services/api';

const ActivityMonitor: React.FC = () => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchActivity = useCallback(async () => {
    try {
      const response = await apiService.getActivity();
      // Sort by timestamp descending
      const sortedEvents = (response.events || []).sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setEvents(sortedEvents);
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    }
  }, []);

  useEffect(() => {
    fetchActivity();

    if (isMonitoring) {
      const interval = setInterval(fetchActivity, 5000);
      return () => clearInterval(interval);
    }
  }, [isMonitoring, fetchActivity]);

  const filteredEvents = events.filter(event => {
    if (filter === 'all') {return true;}
    if (filter === 'bot') {return event.messageType === 'outgoing';}
    if (filter === 'user') {return event.messageType === 'incoming';}
    if (filter === 'error') {return event.status === 'error' || event.status === 'timeout';}
    return true;
  });

  const getStatusIcon = (status: string) => {
    const className = 'w-4 h-4';
    switch (status) {
    case 'success': return <CheckCircle className={`${className} text-success`} />;
    case 'error': return <XCircle className={`${className} text-error`} />;
    case 'timeout': return <Clock className={`${className} text-warning`} />;
    default: return <Activity className={`${className} text-info`} />;
    }
  };

  const getTypeIcon = (type: string) => {
    const className = 'w-4 h-4';
    switch (type) {
    case 'outgoing': return <Bot className={className} />;
    case 'incoming': return <User className={className} />;
    default: return <Activity className={className} />;
    }
  };

  const getSeverityVariant = (status: string): 'info' | 'warning' | 'error' | 'success' => {
    switch (status) {
    case 'error': return 'error';
    case 'timeout': return 'warning';
    case 'success': return 'success';
    default: return 'info';
    }
  };

  const recentEventsCount = events.filter(e =>
    new Date(e.timestamp).getTime() > Date.now() - 5 * 60 * 1000
  ).length;

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg border-l-4 border-info">
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
                className={`btn-${isMonitoring ? 'error' : 'success'} btn-sm gap-2`}
              >
                {isMonitoring ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isMonitoring ? 'Pause' : 'Resume'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow">
          <div className="card-body text-center p-4">
            <Activity className="w-8 h-8 mx-auto text-primary mb-2" />
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-sm opacity-70">Total Events</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center p-4">
            <Bot className="w-8 h-8 mx-auto text-info mb-2" />
            <div className="text-2xl font-bold">{events.filter(e => e.messageType === 'outgoing').length}</div>
            <p className="text-sm opacity-70">Bot Responses</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center p-4">
            <Users className="w-8 h-8 mx-auto text-warning mb-2" />
            <div className="text-2xl font-bold">{events.filter(e => e.messageType === 'incoming').length}</div>
            <p className="text-sm opacity-70">User Messages</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center p-4">
            <BarChart2 className="w-8 h-8 mx-auto text-success mb-2" />
            <div className="text-2xl font-bold">{recentEventsCount}</div>
            <p className="text-sm opacity-70">Last 5 min</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow">
        <div className="card-body p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <span className="font-semibold">Filter:</span>
            <div className="join">
              <Button
                size="sm"
                className={`join-item btn-${filter === 'all' ? 'active' : 'ghost'}`}
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                size="sm"
                className={`join-item btn-${filter === 'bot' ? 'active' : 'ghost'}`}
                onClick={() => setFilter('bot')}
              >
                Bot
              </Button>
              <Button
                size="sm"
                className={`join-item btn-${filter === 'user' ? 'active' : 'ghost'}`}
                onClick={() => setFilter('user')}
              >
                User
              </Button>
              <Button
                size="sm"
                className={`join-item btn-${filter === 'error' ? 'active' : 'ghost'}`}
                onClick={() => setFilter('error')}
              >
                Errors
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Activity Table */}
      <Card className="shadow-lg">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <Table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-base-content/50">
                      No events found
                    </td>
                  </tr>
                ) : (
                  filteredEvents.slice(0, 20).map((event) => (
                    <tr key={event.id}>
                      <td className="text-sm font-mono whitespace-nowrap">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {getTypeIcon(event.messageType)}
                          <span className="capitalize text-sm">{event.messageType === 'incoming' ? 'User' : 'Bot'}</span>
                        </div>
                      </td>
                      <td className="max-w-md">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm">{event.botName}</span>
                          <span className="text-xs opacity-70 truncate">
                            {event.errorMessage || `Message length: ${event.contentLength} chars`}
                          </span>
                        </div>
                      </td>
                      <td>
                        <Badge variant={getSeverityVariant(event.status)} size="sm" className="gap-1">
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
        <div className="flex items-center gap-2 text-sm text-info animate-pulse">
          <Activity className="w-4 h-4" />
          <span>Live monitoring active</span>
        </div>
      )}
    </div>
  );
};

export default ActivityMonitor;
