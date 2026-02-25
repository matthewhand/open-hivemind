/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Alert, Table } from './DaisyUI';
import {
  Zap,
  Server,
  Users,
  ChartBar,
  Activity,
  Bot,
  MessageSquare,
  AlertCircle,
  CheckCircle,
  FileText,
  Clock,
  ArrowRight,
  ArrowLeft
} from 'lucide-react';
import { apiService } from '../services/api';
import type { ActivityEvent } from '../services/api';

interface ActivityMonitorProps {
    refreshInterval?: number;
}

const ActivityMonitor: React.FC<ActivityMonitorProps> = ({ refreshInterval = 30000 }) => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchActivity = async () => {
      try {
          const response = await apiService.getActivity();
          setEvents(response.events || []);
          setError(null);
      } catch (err) {
          console.error("Failed to fetch activity:", err);
          setError("Failed to load activity stream");
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    fetchActivity(); // Initial fetch

    if (!isMonitoring) return;

    const interval = setInterval(fetchActivity, refreshInterval);
    return () => clearInterval(interval);
  }, [isMonitoring, refreshInterval]);

  const getStatusColor = (status: string): 'info' | 'warning' | 'error' | 'success' => {
    switch (status) {
      case 'error': return 'error';
      case 'timeout': return 'warning';
      case 'success': return 'success';
      default: return 'info';
    }
  };

  const getTypeIcon = (type: string) => {
    const className = "w-4 h-4";
    switch (type) {
      case 'incoming': return <ArrowRight className={className} />;
      case 'outgoing': return <ArrowLeft className={className} />;
      default: return <FileText className={className} />;
    }
  };

  // Stats calculation
  const totalEvents = events.length;
  const errorEvents = events.filter(e => e.status === 'error' || e.status === 'timeout').length;
  const incomingEvents = events.filter(e => e.messageType === 'incoming').length;
  const outgoingEvents = events.filter(e => e.messageType === 'outgoing').length;

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
            <div className="text-2xl font-bold">{totalEvents}</div>
            <p className="text-sm opacity-70">Total Events</p>
          </div>
        </Card>
        <Card className="shadow">
            <div className="card-body text-center">
                <ArrowRight className="w-8 h-8 mx-auto text-info mb-2" />
                <div className="text-2xl font-bold">{incomingEvents}</div>
                <p className="text-sm opacity-70">Incoming</p>
            </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <ArrowLeft className="w-8 h-8 mx-auto text-success mb-2" />
            <div className="text-2xl font-bold">{outgoingEvents}</div>
            <p className="text-sm opacity-70">Outgoing</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <AlertCircle className="w-8 h-8 mx-auto text-error mb-2" />
            <div className="text-2xl font-bold">{errorEvents}</div>
            <p className="text-sm opacity-70">Errors / Timeouts</p>
          </div>
        </Card>
      </div>

      {/* Activity Table */}
      <Card className="shadow-lg">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">Recent Activity</h3>
          <div className="overflow-x-auto">
            <Table className="table table-zebra table-compact">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Bot</th>
                  <th>Provider</th>
                  <th>Type</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {events.length === 0 ? (
                    <tr>
                        <td colSpan={6} className="text-center py-4">No recent activity</td>
                    </tr>
                ) : (
                    events.slice(0, 20).map((event) => (
                    <tr key={event.id}>
                        <td className="text-sm opacity-70 whitespace-nowrap">
                        {new Date(event.timestamp).toLocaleTimeString()}
                        </td>
                        <td className="font-medium">{event.botName}</td>
                        <td>
                            <div className="flex flex-col text-xs">
                                <span>{event.provider}</span>
                                <span className="opacity-70">{event.llmProvider}</span>
                            </div>
                        </td>
                        <td>
                        <div className="flex items-center gap-2">
                            <span>{getTypeIcon(event.messageType)}</span>
                            <span className="capitalize">{event.messageType}</span>
                        </div>
                        </td>
                        <td>
                        <Badge variant={getStatusColor(event.status)} size="sm">
                            {event.status}
                        </Badge>
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