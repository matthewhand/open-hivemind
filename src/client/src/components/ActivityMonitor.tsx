import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Alert, Table, StatsCards } from './DaisyUI';
import {
  Activity,
  Play,
  Pause,
  Zap,
  Server,
  Users,
  BarChart,
  Bot,
  MessageSquare,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react';
import { apiService } from '../services/api';
import type { ActivityEvent } from '../services/api';

const ActivityMonitor: React.FC = () => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  const fetchActivity = async () => {
    try {
      const response = await apiService.getActivity();
      setEvents(response.events);
    } catch (error) {
      console.error('Failed to fetch activity:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();

    let interval: NodeJS.Timeout;
    if (isMonitoring) {
      interval = setInterval(fetchActivity, 5000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isMonitoring]);

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'error') return event.status === 'error' || event.status === 'timeout';
    if (filter === 'bot') return true; // Most events are bot related really
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'success': return <Badge variant="success" size="sm">Success</Badge>;
      case 'error': return <Badge variant="error" size="sm">Error</Badge>;
      case 'timeout': return <Badge variant="warning" size="sm">Timeout</Badge>;
      default: return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  const recentEvents = events.filter(e =>
    new Date(e.timestamp).getTime() > Date.now() - 5 * 60 * 1000
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
      id: 'bots',
      title: 'Bot Activities',
      value: events.length, // Assuming all are bot activities for now
      icon: <Bot className="w-8 h-8" />,
      color: 'info' as const,
    },
    {
      id: 'errors',
      title: 'Errors',
      value: events.filter(e => e.status === 'error' || e.status === 'timeout').length,
      icon: <AlertTriangle className="w-8 h-8" />,
      color: 'error' as const,
    },
    {
      id: 'recent',
      title: 'Last 5 min',
      value: recentEvents.length,
      icon: <Clock className="w-8 h-8" />,
      color: 'success' as const,
    }
  ];

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-sm border border-base-200">
        <div className="card-body p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-base-200 rounded-xl">
                <Activity className="w-6 h-6 text-primary" />
              </div>
              <div>
                <h2 className="card-title text-xl">Activity Monitor</h2>
                <p className="text-sm opacity-70">Real-time system activity tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isMonitoring ? 'success' : 'neutral'} size="lg" className="gap-2">
                <span className={`w-2 h-2 rounded-full ${isMonitoring ? 'bg-current animate-pulse' : 'bg-current'}`}></span>
                {isMonitoring ? 'Live' : 'Paused'}
              </Badge>
              <Button
                size="sm"
                variant={isMonitoring ? 'error' : 'success'}
                className="btn-outline gap-2"
                onClick={() => setIsMonitoring(!isMonitoring)}
              >
                {isMonitoring ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {isMonitoring ? 'Pause' : 'Resume'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      <StatsCards stats={stats} />

      {/* Activity Table */}
      <Card className="shadow-sm border border-base-200">
        <div className="card-body p-0">
          <div className="p-4 border-b border-base-200 flex justify-between items-center">
            <h3 className="font-bold">Recent Activity</h3>
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
                className={`join-item ${filter === 'error' ? 'btn-active' : ''}`}
                onClick={() => setFilter('error')}
              >
                Errors
              </Button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <Table className="table w-full">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Bot</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-base-content/50">
                      No activity events found
                    </td>
                  </tr>
                ) : (
                  filteredEvents.slice(0, 20).map((event) => (
                    <tr key={event.id} className="hover">
                      <td className="text-sm font-mono opacity-70">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <Bot className="w-4 h-4 opacity-50" />
                          <span className="font-medium">{event.botName}</span>
                        </div>
                        <div className="text-xs opacity-50 mt-0.5">{event.provider} / {event.llmProvider}</div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          {event.messageType === 'incoming' ? (
                            <span className="text-info">Incoming</span>
                          ) : (
                            <span className="text-success">Outgoing</span>
                          )}
                        </div>
                      </td>
                      <td>
                        {getStatusBadge(event.status)}
                        {event.errorMessage && (
                          <div className="text-xs text-error mt-1 max-w-xs truncate" title={event.errorMessage}>
                            {event.errorMessage}
                          </div>
                        )}
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
    </div>
  );
};

export default ActivityMonitor;
