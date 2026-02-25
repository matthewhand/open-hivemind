/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import { Card, Badge, Button, Alert, Table, StatsCards } from './DaisyUI';
import {
  Zap,
  Server,
  Users,
  BarChart,
  Activity,
  Filter,
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
      // Sort by timestamp desc
      const sortedEvents = response.events.sort((a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
      setEvents(sortedEvents);
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    }
  }, []);

  useEffect(() => {
    fetchActivity();

    if (!isMonitoring) return;

    const interval = setInterval(() => {
      fetchActivity();
    }, 5000);

    return () => clearInterval(interval);
  }, [isMonitoring, fetchActivity]);

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'error') return event.status === 'error' || event.status === 'timeout';
    if (filter === 'success') return event.status === 'success';
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

  const recentEvents = events.filter(e =>
    new Date(e.timestamp).getTime() > Date.now() - 300000 // Last 5 mins
  );

  const stats = [
    {
      id: 'total',
      title: 'Total Events',
      value: events.length,
      icon: <Zap className="w-8 h-8" />,
      color: 'primary' as const,
    },
    {
      id: 'bot-activities',
      title: 'Bot Activities',
      value: events.filter(e => e.botName).length,
      description: 'Events with bot name',
      icon: <Server className="w-8 h-8" />,
      color: 'info' as const,
    },
    {
      id: 'users',
      title: 'Active Users',
      value: new Set(events.map(e => e.userId).filter(Boolean)).size,
      description: 'Unique users',
      icon: <Users className="w-8 h-8" />,
      color: 'warning' as const,
    },
    {
      id: 'recent',
      title: 'Last 5 min',
      value: recentEvents.length,
      icon: <BarChart className="w-8 h-8" />,
      color: 'success' as const,
    }
  ];

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
                variant={isMonitoring ? 'error' : 'success'}
              >
                {isMonitoring ? 'Pause' : 'Resume'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <StatsCards stats={stats} />

      {/* Filters */}
      <Card className="shadow">
        <div className="card-body py-4">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 font-semibold">
              <Filter className="w-4 h-4" />
              <span>Filter:</span>
            </div>
            <div className="join">
              <Button
                size="sm"
                className={`join-item ${filter === 'all' ? 'btn-active' : ''}`}
                variant="ghost"
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                size="sm"
                className={`join-item ${filter === 'success' ? 'btn-active' : ''}`}
                variant="ghost"
                onClick={() => setFilter('success')}
              >
                Success
              </Button>
              <Button
                size="sm"
                className={`join-item ${filter === 'error' ? 'btn-active' : ''}`}
                variant="ghost"
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
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">Recent Activity</h3>
          <div className="overflow-x-auto">
            <Table className="table table-zebra table-compact w-full">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Bot</th>
                  <th>Provider</th>
                  <th>Status</th>
                  <th>Duration</th>
                  <th>Message</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length === 0 ? (
                   <tr>
                    <td colSpan={6} className="text-center py-8 opacity-50">
                      No events found
                    </td>
                  </tr>
                ) : (
                  filteredEvents.slice(0, 20).map((event) => (
                    <tr key={event.id}>
                      <td className="text-sm opacity-70 whitespace-nowrap">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </td>
                      <td>
                        <span className="font-medium">{event.botName}</span>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="text-xs badge badge-ghost">{event.provider}</span>
                        </div>
                      </td>
                      <td>
                        <Badge variant={getStatusColor(event.status)} size="sm">
                          {event.status}
                        </Badge>
                      </td>
                      <td className="text-sm font-mono">
                        {event.processingTime ? `${event.processingTime}ms` : '-'}
                      </td>
                      <td className="max-w-xs truncate text-sm opacity-80">
                         {event.errorMessage ? (
                           <span className="text-error">{event.errorMessage}</span>
                         ) : (
                           <span>{event.messageType === 'incoming' ? 'Incoming Message' : 'Response Sent'}</span>
                         )}
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
        <Alert variant="info" className="flex items-center gap-3 shadow-md">
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
