/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Badge, Button, Alert, Table, Loading } from './DaisyUI';
import {
  Zap,
  Server,
  Users,
  BarChart2,
  Bot,
  MessageSquare,
  AlertTriangle,
  RotateCw,
  Pause,
  Play,
  ArrowRight,
  ArrowLeft,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';
import { apiService, ActivityEvent as ApiActivityEvent } from '../services/api';

interface ActivityMonitorProps {
  refreshInterval?: number;
}

const ActivityMonitor: React.FC<ActivityMonitorProps> = ({ refreshInterval = 5000 }) => {
  const [events, setEvents] = useState<ApiActivityEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<'all' | 'incoming' | 'outgoing' | 'error'>('all');

  const fetchActivity = useCallback(async () => {
    try {
      const response = await apiService.getActivity();
      // Sort by timestamp desc just in case
      const sorted = (response.events || []).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setEvents(sorted);
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    }
  }, []);

  useEffect(() => {
    fetchActivity();
  }, [fetchActivity]);

  useEffect(() => {
    if (!isMonitoring) { return; }
    const interval = setInterval(fetchActivity, refreshInterval);
    return () => clearInterval(interval);
  }, [isMonitoring, refreshInterval, fetchActivity]);

  const filteredEvents = events.filter(event => {
    if (filter === 'all') { return true; }
    if (filter === 'error') { return event.status === 'error' || event.status === 'timeout'; }
    return event.messageType === filter;
  });

  const getStatusColor = (status: string): 'success' | 'error' | 'warning' | 'info' => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'timeout': return 'warning';
      default: return 'info';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'incoming': return <ArrowRight className="w-4 h-4 text-info" />;
      case 'outgoing': return <ArrowLeft className="w-4 h-4 text-success" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const getStatusIcon = (status: string) => {
      switch (status) {
          case 'success': return <CheckCircle className="w-4 h-4 text-success" />;
          case 'error': return <XCircle className="w-4 h-4 text-error" />;
          case 'timeout': return <Clock className="w-4 h-4 text-warning" />;
          default: return null;
      }
  }

  const recentEventsCount = events.filter(e =>
    new Date(e.timestamp).getTime() > Date.now() - 300000 // 5 mins
  ).length;

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg border-l-4 border-info">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Zap className="w-8 h-8 text-info" />
              <div>
                <h2 className="card-title text-2xl">Activity Monitor</h2>
                <p className="text-sm opacity-70">Real-time message flow tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isMonitoring ? 'success' : 'neutral'} size="lg">
                {isMonitoring ? 'Live' : 'Paused'}
              </Badge>
              <Button
                onClick={() => setIsMonitoring(!isMonitoring)}
                variant={isMonitoring ? 'error' : 'success'}
              >
                {isMonitoring ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
                {isMonitoring ? 'Pause' : 'Resume'}
              </Button>
              <Button onClick={fetchActivity} variant="ghost" size="sm">
                  <RotateCw className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow">
          <div className="card-body text-center p-4">
            <MessageSquare className="w-8 h-8 mx-auto text-primary mb-2" />
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-sm opacity-70">Total Messages</p>
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
          <div className="flex items-center gap-4">
            <span className="font-semibold">Filter:</span>
            <div className="join">
              <button
                className={`btn btn-sm join-item ${filter === 'all' ? 'btn-active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                className={`btn btn-sm join-item ${filter === 'incoming' ? 'btn-active' : ''}`}
                onClick={() => setFilter('incoming')}
              >
                Incoming
              </button>
              <button
                className={`btn btn-sm join-item ${filter === 'outgoing' ? 'btn-active' : ''}`}
                onClick={() => setFilter('outgoing')}
              >
                Outgoing
              </button>
              <button
                className={`btn btn-sm join-item ${filter === 'error' ? 'btn-active' : ''}`}
                onClick={() => setFilter('error')}
              >
                Errors
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Activity Table */}
      <Card className="shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">Recent Activity</h3>
          <div className="overflow-x-auto">
            <Table className="table table-zebra table-compact w-full">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Bot</th>
                  <th>Type</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.slice(0, 20).map((event) => (
                  <tr key={event.id}>
                    <td className="text-xs opacity-70 whitespace-nowrap">
                      {new Date(event.timestamp).toLocaleTimeString()}
                    </td>
                    <td className="font-medium">{event.botName}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        {getTypeIcon(event.messageType)}
                        <span className="capitalize text-xs">{event.messageType}</span>
                      </div>
                    </td>
                    <td className="max-w-xs truncate text-xs">
                        {event.errorMessage ? (
                            <span className="text-error">{event.errorMessage}</span>
                        ) : (
                            <span className="opacity-70">
                                {event.messageType === 'incoming' ? `User ${event.userId.slice(0, 8)}...` : `Via ${event.provider}/${event.llmProvider}`}
                            </span>
                        )}
                    </td>
                    <td>
                      <div className="flex items-center gap-1">
                          {getStatusIcon(event.status)}
                          <Badge variant={getStatusColor(event.status)} size="sm">
                            {event.status}
                          </Badge>
                      </div>
                    </td>
                    <td className="text-xs font-mono">
                      {event.processingTime ? `${event.processingTime}ms` : '-'}
                    </td>
                  </tr>
                ))}
                {filteredEvents.length === 0 && (
                    <tr>
                        <td colSpan={6} className="text-center py-4 opacity-50">
                            No activity found matching filters
                        </td>
                    </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </Card>

      {isMonitoring && (
        <Alert variant="info" className="flex items-center gap-3">
          <Zap className="w-5 h-5 animate-pulse" />
          <div>
            <p className="font-medium">Live monitoring active</p>
            <p className="text-sm opacity-70">Real-time events being captured</p>
          </div>
        </Alert>
      )}
    </div>
  );
};

export default ActivityMonitor;
