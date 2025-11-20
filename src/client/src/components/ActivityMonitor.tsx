import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Alert, Progress, Table } from './DaisyUI';
import {
  ActivityIcon,
  ServerIcon,
  UserGroupIcon,
  ChartBarIcon
} from '@heroicons/react/24/outline';

export interface ActivityEvent {
  id: string;
  timestamp: Date;
  type: 'bot' | 'user' | 'system' | 'error';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  duration?: number;
}

const mockEvents: ActivityEvent[] = [
  {
    id: '1',
    timestamp: new Date(),
    type: 'bot',
    message: 'Bot configuration updated successfully',
    severity: 'low',
    duration: 120
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 60000),
    type: 'user',
    message: 'User login from new device',
    severity: 'medium',
    duration: 300
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 180000),
    type: 'system',
    message: 'Database backup completed',
    severity: 'low',
    duration: 5000
  },
];

const ActivityMonitor: React.FC = () => {
  const [events, setEvents] = useState<ActivityEvent[]>(mockEvents);
  const [filter, setFilter] = useState<string>('all');
  const [isMonitoring, setIsMonitoring] = useState(true);

  useEffect(() => {
    if (!isMonitoring) return;

    const interval = setInterval(() => {
      const newEvent: ActivityEvent = {
        id: Date.now().toString(),
        timestamp: new Date(),
        type: ['bot', 'user', 'system', 'error'][Math.floor(Math.random() * 4)] as any,
        message: `System activity detected at ${new Date().toLocaleTimeString()}`,
        severity: ['low', 'medium', 'high', 'critical'][Math.floor(Math.random() * 4)] as any,
        duration: Math.floor(Math.random() * 1000) + 50
      };
      setEvents(prev => [newEvent, ...prev].slice(0, 50));
    }, 5000);

    return () => clearInterval(interval);
  }, [isMonitoring]);

  const filteredEvents = events.filter(event =>
    filter === 'all' || event.type === filter
  );

  const getSeverityColor = (severity: string): 'info' | 'warning' | 'error' | 'success' => {
    switch (severity) {
      case 'critical': return 'error';
      case 'high': return 'error';
      case 'medium': return 'warning';
      case 'low': return 'info';
      default: return 'info';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'bot': return '🤖';
      case 'user': return '👤';
      case 'system': return '⚙️';
      case 'error': return '❌';
      default: return '📝';
    }
  };

  const recentEvents = events.filter(e =>
    e.timestamp > new Date(Date.now() - 300000)
  );

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg border-l-4 border-info">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ActivityIcon className="w-8 h-8 text-info" />
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
          <div className="card-body text-center">
            <ActivityIcon className="w-8 h-8 mx-auto text-primary mb-2" />
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-sm opacity-70">Total Events</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <ServerIcon className="w-8 h-8 mx-auto text-info mb-2" />
            <div className="text-2xl font-bold">{events.filter(e => e.type === 'bot').length}</div>
            <p className="text-sm opacity-70">Bot Activities</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <UserGroupIcon className="w-8 h-8 mx-auto text-warning mb-2" />
            <div className="text-2xl font-bold">{events.filter(e => e.type === 'user').length}</div>
            <p className="text-sm opacity-70">User Activities</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <ChartBarIcon className="w-8 h-8 mx-auto text-success mb-2" />
            <div className="text-2xl font-bold">{recentEvents.length}</div>
            <p className="text-sm opacity-70">Last 5 min</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow">
        <div className="card-body">
          <div className="flex items-center gap-4">
            <span className="font-semibold">Filter:</span>
            <div className="btn-group">
              <Button
                className={`btn-${filter === 'all' ? 'active' : 'ghost'}`}
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                className={`btn-${filter === 'bot' ? 'active' : 'ghost'}`}
                onClick={() => setFilter('bot')}
              >
                Bot
              </Button>
              <Button
                className={`btn-${filter === 'user' ? 'active' : 'ghost'}`}
                onClick={() => setFilter('user')}
              >
                User
              </Button>
              <Button
                className={`btn-${filter === 'system' ? 'active' : 'ghost'}`}
                onClick={() => setFilter('system')}
              >
                System
              </Button>
              <Button
                className={`btn-${filter === 'error' ? 'active' : 'ghost'}`}
                onClick={() => setFilter('error')}
              >
                Error
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
            <Table className="table table-zebra table-compact">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Severity</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.slice(0, 20).map((event) => (
                  <tr key={event.id}>
                    <td className="text-sm opacity-70">
                      {event.timestamp.toLocaleTimeString()}
                    </td>
                    <td>
                      <div className="flex items-center gap-2">
                        <span>{getTypeIcon(event.type)}</span>
                        <span className="capitalize">{event.type}</span>
                      </div>
                    </td>
                    <td className="max-w-xs truncate">{event.message}</td>
                    <td>
                      <Badge variant={getSeverityColor(event.severity)} size="sm">
                        {event.severity}
                      </Badge>
                    </td>
                    <td className="text-sm">
                      {event.duration ? `${event.duration}ms` : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      </Card>

      {isMonitoring && (
        <Alert variant="info" className="flex items-center gap-3">
          <ActivityIcon className="w-5 h-5 animate-pulse" />
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