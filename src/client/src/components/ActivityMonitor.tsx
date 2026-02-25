/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Alert, Table } from './DaisyUI';
import {
  Activity,
  Server,
  Users,
  BarChart2,
  Play,
  Pause,
  Filter,
  Bot as BotIcon,
  MessageSquare,
  AlertTriangle,
  Settings,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { apiService, ActivityEvent } from '../services/api';

const ActivityMonitor: React.FC = () => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [isMonitoring, setIsMonitoring] = useState(true);

  const fetchActivity = async () => {
      try {
          const data = await apiService.getActivity();
          // Assuming the API returns events sorted by date, if not we might sort them
          setEvents(data.events);
      } catch (err) {
          console.error("Failed to fetch activity", err);
      }
  };

  useEffect(() => {
    fetchActivity();

    if (!isMonitoring) { return; }

    const interval = setInterval(() => {
        fetchActivity();
    }, 5000);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  const filteredEvents = events.filter(event => {
    if (filter === 'all') {return true;}
    if (filter === 'incoming') {return event.messageType === 'incoming';}
    if (filter === 'outgoing') {return event.messageType === 'outgoing';}
    if (filter === 'error') {return event.status === 'error' || event.status === 'timeout';}
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

  const getMessageTypeIcon = (type: string) => {
    switch (type) {
      case 'outgoing': return <BotIcon className="w-4 h-4" />;
      case 'incoming': return <Users className="w-4 h-4" />;
      default: return <MessageSquare className="w-4 h-4" />;
    }
  };

  const recentEventsCount = events.filter(e => {
      const time = new Date(e.timestamp).getTime();
      return time > Date.now() - 300000;
  }).length;

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
              <Badge variant={isMonitoring ? 'success' : 'neutral'} size="lg" className="gap-2">
                {isMonitoring ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                {isMonitoring ? 'Live' : 'Paused'}
              </Badge>
              <Button
                size="sm"
                onClick={() => setIsMonitoring(!isMonitoring)}
                className={`btn-${isMonitoring ? 'error' : 'success'}`}
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
            <BotIcon className="w-8 h-8 mx-auto text-info mb-2" />
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
            <Clock className="w-8 h-8 mx-auto text-success mb-2" />
            <div className="text-2xl font-bold">{recentEventsCount}</div>
            <p className="text-sm opacity-70">Last 5 min</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow">
        <div className="card-body p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2 font-semibold">
                <Filter className="w-4 h-4" />
                Filter:
            </div>
            <div className="join">
              <Button
                size="sm"
                className={`join-item ${filter === 'all' ? 'btn-active' : ''}`}
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                size="sm"
                className={`join-item ${filter === 'incoming' ? 'btn-active' : ''}`}
                onClick={() => setFilter('incoming')}
              >
                Incoming
              </Button>
              <Button
                size="sm"
                className={`join-item ${filter === 'outgoing' ? 'btn-active' : ''}`}
                onClick={() => setFilter('outgoing')}
              >
                Outgoing
              </Button>
              <Button
                size="sm"
                className={`join-item ${filter === 'error' ? 'btn-active' : ''}`}
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
          <div className="overflow-x-auto rounded-box">
            <Table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Bot</th>
                  <th>Message/Status</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="text-center py-8 text-base-content/50">
                            No events found matching current filter.
                        </td>
                    </tr>
                ) : (
                    filteredEvents.slice(0, 20).map((event) => (
                    <tr key={event.id}>
                        <td className="text-sm opacity-70 font-mono">
                        {new Date(event.timestamp).toLocaleTimeString()}
                        </td>
                        <td>
                        <div className="flex items-center gap-2" title={event.messageType}>
                            {getMessageTypeIcon(event.messageType)}
                            <span className="capitalize text-xs">{event.messageType}</span>
                        </div>
                        </td>
                        <td>
                            <div className="font-medium">{event.botName}</div>
                            <div className="text-xs opacity-70">{event.provider}</div>
                        </td>
                        <td className="max-w-xs truncate">
                            {event.status === 'error' ? (
                                <span className="text-error">{event.errorMessage || 'Unknown Error'}</span>
                            ) : (
                                <span className="opacity-70">Message processed</span>
                            )}
                        </td>
                        <td>
                        <Badge variant={getStatusColor(event.status)} size="sm">
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
        <div className="flex items-center gap-2 text-sm text-base-content/50 animate-pulse">
          <Activity className="w-4 h-4" />
          Live monitoring active. updating every 5s...
        </div>
      )}
    </div>
  );
};

export default ActivityMonitor;