import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Alert, Table, Loading } from './DaisyUI';
import {
  Zap,
  Bot,
  Users,
  BarChart2,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Server
} from 'lucide-react';
import { apiService } from '../services/api';
import type { ActivityEvent as ApiActivityEvent } from '../services/api';

export interface ActivityEvent {
  id: string;
  timestamp: Date;
  type: 'bot' | 'user' | 'system' | 'error';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  duration?: number;
}

const ActivityMonitor: React.FC = () => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchActivity = async () => {
    try {
        const response = await apiService.getActivity();

        // Map API events to local structure
        const mappedEvents: ActivityEvent[] = response.events.map(e => {
            let type: ActivityEvent['type'] = 'system';
            if (e.status === 'error' || e.status === 'timeout') {
                type = 'error';
            } else if (e.messageType === 'incoming') {
                type = 'user';
            } else if (e.messageType === 'outgoing') {
                type = 'bot';
            }

            let severity: ActivityEvent['severity'] = 'low';
            if (e.status === 'error') {severity = 'high';}
            else if (e.status === 'timeout') {severity = 'medium';}

            let message = '';
            if (e.errorMessage) {
                message = e.errorMessage;
            } else {
                message = `${e.botName} (${e.provider}) - ${e.messageType}`;
            }

            return {
                id: e.id,
                timestamp: new Date(e.timestamp),
                type,
                message,
                severity,
                duration: e.processingTime
            };
        });

        setEvents(mappedEvents);
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

  const filteredEvents = events.filter(event =>
    filter === 'all' || event.type === filter,
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
    const className = "w-4 h-4";
    switch (type) {
      case 'bot': return <Bot className={className} />;
      case 'user': return <Users className={className} />;
      case 'system': return <Server className={className} />;
      case 'error': return <XCircle className={className} />;
      default: return <Activity className={className} />;
    }
  };

  const recentEvents = events.filter(e =>
    e.timestamp > new Date(Date.now() - 300000),
  );

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
            <Zap className="w-8 h-8 mx-auto text-primary mb-2" />
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-sm opacity-70">Total Events</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <Bot className="w-8 h-8 mx-auto text-info mb-2" />
            <div className="text-2xl font-bold">{events.filter(e => e.type === 'bot').length}</div>
            <p className="text-sm opacity-70">Bot Activities</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <Users className="w-8 h-8 mx-auto text-warning mb-2" />
            <div className="text-2xl font-bold">{events.filter(e => e.type === 'user').length}</div>
            <p className="text-sm opacity-70">User Activities</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <BarChart2 className="w-8 h-8 mx-auto text-success mb-2" />
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
                {filteredEvents.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="text-center py-4 opacity-70">No activity recorded</td>
                    </tr>
                ) : (
                    filteredEvents.slice(0, 20).map((event) => (
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
            <p className="text-sm opacity-70">Real-time events being captured</p>
          </div>
        </Alert>
      )}
    </div>
  );
};

export default ActivityMonitor;
