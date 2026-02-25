/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Alert, Table, StatsCards } from './DaisyUI';
import {
  Activity,
  Bot,
  User,
  Server,
  AlertCircle,
  Clock,
  CheckCircle,
  Pause,
  Play,
  BarChart2
} from 'lucide-react';
import { apiService, ActivityEvent as ApiActivityEvent } from '../services/api';

const ActivityMonitor: React.FC = () => {
  const [events, setEvents] = useState<ApiActivityEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = async () => {
    try {
      setLoading(true);
      const data = await apiService.getActivity();
      setEvents(data.events || []);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch activity:', err);
      // specific error message handled in UI
      // Keep existing events if fail
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
      case 'outgoing': return <Bot className="w-4 h-4" />;
      case 'incoming': return <User className="w-4 h-4" />;
      default: return <Server className="w-4 h-4" />;
    }
  };

  const stats = [
      {
          id: 'total',
          title: 'Total Events',
          value: events.length,
          icon: <Activity className="w-8 h-8"/>,
          color: 'primary' as const
      },
      {
          id: 'bot',
          title: 'Bot Responses',
          value: events.filter(e => e.messageType === 'outgoing').length,
          icon: <Bot className="w-8 h-8"/>,
          color: 'secondary' as const
      },
      {
          id: 'user',
          title: 'User Messages',
          value: events.filter(e => e.messageType === 'incoming').length,
          icon: <User className="w-8 h-8"/>,
          color: 'accent' as const
      },
      {
          id: 'errors',
          title: 'Errors',
          value: events.filter(e => e.status === 'error' || e.status === 'timeout').length,
          icon: <AlertCircle className="w-8 h-8"/>,
          color: 'error' as const
      }
  ];

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-sm border border-base-200">
        <div className="card-body p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-xl text-primary">
                  <Activity className="w-6 h-6" />
              </div>
              <div>
                <h2 className="card-title text-lg">Live Activity Feed</h2>
                <p className="text-sm opacity-70">Real-time system activity tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isMonitoring ? 'success' : 'neutral'} size="lg" className="gap-1">
                {isMonitoring ? <Activity className="w-3 h-3 animate-pulse"/> : <Pause className="w-3 h-3"/>}
                {isMonitoring ? 'Live' : 'Paused'}
              </Badge>
              <Button
                size="sm"
                onClick={() => setIsMonitoring(!isMonitoring)}
                className={`btn-${isMonitoring ? 'error' : 'success'} btn-outline`}
              >
                {isMonitoring ? <Pause className="w-4 h-4"/> : <Play className="w-4 h-4"/>}
                {isMonitoring ? 'Pause' : 'Resume'}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <StatsCards stats={stats} isLoading={loading && events.length === 0} />

      {/* Activity Table */}
      <Card className="shadow-sm border border-base-200">
        <div className="card-body p-0">
          <div className="overflow-x-auto">
            <Table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Bot / Provider</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                    <tr>
                        <td colSpan={5} className="text-center py-8 text-base-content/50">
                            No recent activity found
                        </td>
                    </tr>
                ) : (
                    events.slice(0, 20).map((event) => (
                    <tr key={event.id}>
                        <td className="text-sm opacity-70 font-mono">
                        {new Date(event.timestamp).toLocaleTimeString()}
                        </td>
                        <td>
                        <div className="flex items-center gap-2">
                            <span className="p-1 bg-base-200 rounded">{getTypeIcon(event.messageType)}</span>
                            <span className="capitalize text-sm font-medium">{event.messageType}</span>
                        </div>
                        </td>
                        <td>
                            <div className="flex flex-col">
                                <span className="font-medium text-sm">{event.botName}</span>
                                <span className="text-xs opacity-70">{event.provider} / {event.llmProvider}</span>
                            </div>
                        </td>
                        <td>
                        <Badge variant={getSeverityColor(event.status)} size="sm">
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
    </div>
  );
};

export default ActivityMonitor;
