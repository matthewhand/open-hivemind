import React, { useState } from 'react';
import { Card, Badge, Button, Alert, Timeline } from './DaisyUI';
import {
  ClockIcon,
  UserIcon,
  CogIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';

export interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: 'user' | 'system' | 'bot' | 'error' | 'success';
  title: string;
  description: string;
  icon?: React.ReactNode;
}

const mockEvents: TimelineEvent[] = [
  {
    id: '1',
    timestamp: new Date(),
    type: 'success',
    title: 'Bot Configuration Updated',
    description: 'Successfully updated bot settings and reloaded configuration',
    icon: <CheckCircleIcon className="w-5 h-5 text-success" />
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 60000),
    type: 'user',
    title: 'User Login',
    description: 'Administrator logged into system from secure location',
    icon: <UserIcon className="w-5 h-5 text-primary" />
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 120000),
    type: 'system',
    title: 'System Health Check',
    description: 'All systems operational, no issues detected',
    icon: <CogIcon className="w-5 h-5 text-info" />
  },
  {
    id: '4',
    timestamp: new Date(Date.now() - 300000),
    type: 'error',
    title: 'API Rate Limit',
    description: 'Temporary rate limit reached for external API calls',
    icon: <ExclamationTriangleIcon className="w-5 h-5 text-warning" />
  },
];

const ActivityTimeline: React.FC = () => {
  const [events, setEvents] = useState<TimelineEvent[]>(mockEvents);
  const [filter, setFilter] = useState<string>('all');

  const filteredEvents = events.filter(event =>
    filter === 'all' || event.type === filter
  );

  const getTimelineColor = (type: string) => {
    switch (type) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'user': return 'primary';
      case 'system': return 'info';
      case 'bot': return 'neutral';
      default: return 'neutral';
    }
  };

  const addNewEvent = () => {
    const types: Array<'user' | 'system' | 'bot' | 'error' | 'success'> = ['user', 'system', 'bot', 'error', 'success'];
    const titles = ['System Check', 'Data Sync', 'Configuration Update', 'User Action', 'Error Detected'];

    const newEvent: TimelineEvent = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type: types[Math.floor(Math.random() * types.length)],
      title: titles[Math.floor(Math.random() * titles.length)],
      description: `New activity detected at ${new Date().toLocaleTimeString()}`,
    };

    setEvents(prev => [newEvent, ...prev].slice(0, 20));
  };

  const recentEvents = events.filter(e =>
    e.timestamp > new Date(Date.now() - 600000)
  );

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg border-l-4 border-primary">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <ClockIcon className="w-8 h-8 text-primary" />
              <div>
                <h2 className="card-title text-2xl">Activity Timeline</h2>
                <p className="text-sm opacity-70">Chronological system events and activities</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="info" size="lg">
                {events.length} Events
              </Badge>
              <Button onClick={addNewEvent} className="btn-primary">
                Add Event
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow">
          <div className="card-body text-center">
            <ClockIcon className="w-8 h-8 mx-auto text-primary mb-2" />
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-sm opacity-70">Total Events</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <UserIcon className="w-8 h-8 mx-auto text-info mb-2" />
            <div className="text-2xl font-bold">{events.filter(e => e.type === 'user').length}</div>
            <p className="text-sm opacity-70">User Actions</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <CogIcon className="w-8 h-8 mx-auto text-warning mb-2" />
            <div className="text-2xl font-bold">{events.filter(e => e.type === 'system').length}</div>
            <p className="text-sm opacity-70">System Events</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <CheckCircleIcon className="w-8 h-8 mx-auto text-success mb-2" />
            <div className="text-2xl font-bold">{events.filter(e => e.type === 'success').length}</div>
            <p className="text-sm opacity-70">Success Events</p>
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
                className={`btn-${filter === 'bot' ? 'active' : 'ghost'}`}
                onClick={() => setFilter('bot')}
              >
                Bot
              </Button>
              <Button
                className={`btn-${filter === 'success' ? 'active' : 'ghost'}`}
                onClick={() => setFilter('success')}
              >
                Success
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

      {/* Timeline */}
      <Card className="shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-6">Recent Activity</h3>
          <Timeline>
            {filteredEvents.slice(0, 10).map((event, index) => (
              <Timeline.Item key={event.id}>
                <Timeline.Point color={getTimelineColor(event.type)}>
                  {event.icon}
                </Timeline.Point>
                <Timeline.Content>
                  <div className="p-4 border border-base-300 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{event.title}</h4>
                      <Badge variant={getTimelineColor(event.type)} size="sm">
                        {event.type}
                      </Badge>
                    </div>
                    <p className="text-sm opacity-70 mb-2">{event.description}</p>
                    <p className="text-xs opacity-50">
                      {event.timestamp.toLocaleString()}
                    </p>
                  </div>
                </Timeline.Content>
              </Timeline.Item>
            ))}
          </Timeline>
        </div>
      </Card>

      {/* Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="shadow">
          <div className="card-body">
            <h3 className="font-bold mb-2">Recent Activity</h3>
            <p className="text-sm opacity-70 mb-1">
              {recentEvents.length} events in last 10 minutes
            </p>
            <div className="w-full bg-base-200 rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full"
                style={{ width: `${Math.min((recentEvents.length / 10) * 100, 100)}%` }}
              ></div>
            </div>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body">
            <h3 className="font-bold mb-2">System Health</h3>
            <div className="flex items-center gap-2">
              <CheckCircleIcon className="w-5 h-5 text-success" />
              <span className="text-sm">All systems operational</span>
            </div>
            <p className="text-xs opacity-70 mt-1">Last check: {new Date().toLocaleTimeString()}</p>
          </div>
        </Card>
      </div>

      <Alert variant="info" className="flex items-center gap-3">
        <ClockIcon className="w-5 h-5" />
        <div>
          <p className="font-medium">Timeline tracking active</p>
          <p className="text-sm opacity-70">Events are automatically captured and organized chronologically</p>
        </div>
      </Alert>
    </div>
  );
};

export default ActivityTimeline;