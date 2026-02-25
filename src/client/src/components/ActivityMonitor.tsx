/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Table, Alert, Loading } from './DaisyUI';
import {
  Zap,
  Server,
  Users,
  BarChart2,
  Activity,
  AlertCircle,
  Bot,
  MessageCircle,
  Clock
} from 'lucide-react';
import { apiService, ActivityEvent } from '../services/api';

const ActivityMonitor: React.FC = () => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchActivity = async () => {
    try {
      // In a real scenario, we might want to fetch only new events since last timestamp
      // But API might not support it fully yet, so we fetch latest.
      const data = await apiService.getActivity();
      setEvents(data.events || []);
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();

    if (isMonitoring) {
      const interval = setInterval(fetchActivity, 5000);
      return () => clearInterval(interval);
    }
  }, [isMonitoring]);

  // Determine event type based on available fields or custom logic
  // ActivityEvent has: botName, provider, llmProvider, messageType, status
  const getEventType = (event: ActivityEvent) => {
    if (event.status === 'error' || event.status === 'timeout') return 'error';
    if (event.messageType === 'incoming') return 'user';
    if (event.messageType === 'outgoing') return 'bot';
    return 'system';
  };

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    const type = getEventType(event);
    return type === filter;
  });

  const getSeverityColor = (status: string): 'info' | 'warning' | 'error' | 'success' => {
    switch (status) {
      case 'error': return 'error';
      case 'timeout': return 'warning';
      case 'success': return 'success';
      default: return 'info';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bot': return <Bot className="w-4 h-4" />;
      case 'user': return <Users className="w-4 h-4" />;
      case 'system': return <Server className="w-4 h-4" />;
      case 'error': return <AlertCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const recentEvents = events.filter(e =>
    new Date(e.timestamp).getTime() > Date.now() - 300000
  );

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg border-l-4 border-info">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Zap className="w-8 h-8 text-info" />
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
                className={`btn-${isMonitoring ? 'error' : 'success'} btn-sm`}
              >
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
            <div className="text-2xl font-bold">
              {events.filter(e => e.messageType === 'outgoing').length}
            </div>
            <p className="text-sm opacity-70">Bot Responses</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center p-4">
            <Users className="w-8 h-8 mx-auto text-warning mb-2" />
            <div className="text-2xl font-bold">
              {events.filter(e => e.messageType === 'incoming').length}
            </div>
            <p className="text-sm opacity-70">User Messages</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center p-4">
            <BarChart2 className="w-8 h-8 mx-auto text-success mb-2" />
            <div className="text-2xl font-bold">{recentEvents.length}</div>
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
                className={`btn btn-sm join-item ${filter === 'all' ? 'btn-active' : 'btn-ghost'}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                className={`btn btn-sm join-item ${filter === 'bot' ? 'btn-active' : 'btn-ghost'}`}
                onClick={() => setFilter('bot')}
              >
                Bot
              </button>
              <button
                className={`btn btn-sm join-item ${filter === 'user' ? 'btn-active' : 'btn-ghost'}`}
                onClick={() => setFilter('user')}
              >
                User
              </button>
              <button
                className={`btn btn-sm join-item ${filter === 'error' ? 'btn-active' : 'btn-ghost'}`}
                onClick={() => setFilter('error')}
              >
                Error
              </button>
            </div>
          </div>
        </div>
      </Card>

      {/* Activity Table */}
      <Card className="shadow-lg">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
             <h3 className="card-title text-lg">Recent Activity</h3>
             {loading && <span className="loading loading-spinner loading-sm"></span>}
          </div>

          <div className="overflow-x-auto">
            <Table className="table table-zebra table-compact w-full">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="text-center py-4 text-base-content/50">
                            No activity events found.
                        </td>
                    </tr>
                ) : (
                    filteredEvents.slice(0, 20).map((event) => (
                      <tr key={event.id}>
                        <td className="text-sm opacity-70 whitespace-nowrap">
                          {new Date(event.timestamp).toLocaleTimeString()}
                        </td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span>{getTypeIcon(getEventType(event))}</span>
                            <span className="capitalize">{getEventType(event)}</span>
                          </div>
                        </td>
                        <td className="max-w-xs truncate" title={event.errorMessage || 'Message processed'}>
                            {event.botName}: {event.messageType === 'incoming' ? 'Received message' : 'Sent response'}
                            {event.errorMessage && <span className="text-error ml-1">- {event.errorMessage}</span>}
                        </td>
                        <td>
                          <Badge variant={getSeverityColor(event.status)} size="sm">
                            {event.status}
                          </Badge>
                        </td>
                        <td className="text-sm">
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
        <Alert variant="info" icon={<Zap className="w-5 h-5 animate-pulse" />}>
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