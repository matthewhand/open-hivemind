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
  Bot,
  MessageCircle,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { apiService } from '../services/api';
import type { ActivityResponse, ActivityEvent as ApiActivityEvent } from '../services/api';

// Internal UI representation of an event
interface DisplayEvent {
  id: string;
  timestamp: Date;
  type: 'bot' | 'user' | 'system' | 'error';
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  duration?: number;
  details?: string;
}

const ActivityMonitor: React.FC = () => {
  const [events, setEvents] = useState<DisplayEvent[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [loading, setLoading] = useState(false);

  const fetchActivity = async () => {
      try {
          if (events.length === 0) setLoading(true);
          const response = await apiService.getActivity();
          if (response && response.events) {
              const mappedEvents: DisplayEvent[] = response.events.map(e => {
                  let type: DisplayEvent['type'] = 'system';
                  if (e.status === 'error' || e.status === 'timeout') {
                      type = 'error';
                  } else if (e.messageType === 'incoming') {
                      type = 'user';
                  } else if (e.messageType === 'outgoing') {
                      type = 'bot';
                  }

                  let severity: DisplayEvent['severity'] = 'low';
                  if (e.status === 'error') {severity = 'high';}
                  else if (e.status === 'timeout') {severity = 'medium';}

                  const message = e.errorMessage ||
                      `${e.botName} (${e.provider}): ${e.messageType} message via ${e.llmProvider}`;

                  return {
                      id: e.id || Math.random().toString(36).substring(7),
                      timestamp: new Date(e.timestamp),
                      type,
                      message,
                      severity,
                      duration: e.processingTime,
                      details: e.errorMessage
                  };
              });

              // Sort by timestamp desc
              mappedEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
              setEvents(mappedEvents);
          }
      } catch (err) {
          console.error("Failed to fetch activity:", err);
      } finally {
          setLoading(false);
      }
  };

  useEffect(() => {
    fetchActivity(); // Initial fetch

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
      case 'error': return <AlertTriangle className={className} />;
      default: return <Info className={className} />;
    }
  };

  const recentEventsCount = events.filter(e =>
    e.timestamp > new Date(Date.now() - 300000),
  ).length;

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
                size="sm"
              >
                {isMonitoring ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
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
            <div className="flex justify-center mb-2">
                 <Activity className="w-8 h-8 text-primary" />
            </div>
            <div className="text-2xl font-bold">{events.length}</div>
            <p className="text-sm opacity-70">Total Events</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center p-4">
            <div className="flex justify-center mb-2">
                <Bot className="w-8 h-8 text-info" />
            </div>
            <div className="text-2xl font-bold">{events.filter(e => e.type === 'bot').length}</div>
            <p className="text-sm opacity-70">Bot Activities</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center p-4">
             <div className="flex justify-center mb-2">
                <Users className="w-8 h-8 text-warning" />
             </div>
            <div className="text-2xl font-bold">{events.filter(e => e.type === 'user').length}</div>
            <p className="text-sm opacity-70">User Activities</p>
          </div>
        </Card>
        <Card className="shadow">
           <div className="card-body text-center p-4">
             <div className="flex justify-center mb-2">
                <BarChart2 className="w-8 h-8 text-success" />
             </div>
            <div className="text-2xl font-bold">{recentEventsCount}</div>
            <p className="text-sm opacity-70">Last 5 min</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow">
        <div className="card-body p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 opacity-70" />
                <span className="font-semibold">Filter:</span>
            </div>
            <div className="join">
              <Button
                size="sm"
                className={`join-item btn-${filter === 'all' ? 'active' : 'ghost'}`}
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                size="sm"
                className={`join-item btn-${filter === 'bot' ? 'active' : 'ghost'}`}
                onClick={() => setFilter('bot')}
              >
                Bot
              </Button>
              <Button
                size="sm"
                className={`join-item btn-${filter === 'user' ? 'active' : 'ghost'}`}
                onClick={() => setFilter('user')}
              >
                User
              </Button>
              <Button
                size="sm"
                className={`join-item btn-${filter === 'system' ? 'active' : 'ghost'}`}
                onClick={() => setFilter('system')}
              >
                System
              </Button>
              <Button
                size="sm"
                className={`join-item btn-${filter === 'error' ? 'active' : 'ghost'}`}
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
          {loading && events.length === 0 ? (
             <div className="flex justify-center items-center py-8">
               <span className="loading loading-spinner loading-lg"></span>
               <span className="ml-2 opacity-70">Loading activity...</span>
             </div>
          ) : (
          <div className="overflow-x-auto">
            <Table className="table table-zebra table-compact w-full">
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
                        <td colSpan={5} className="text-center py-8 opacity-50">
                            No activity events found
                        </td>
                    </tr>
                ) : (
                    filteredEvents.slice(0, 20).map((event) => (
                    <tr key={event.id}>
                        <td className="text-sm opacity-70 whitespace-nowrap">
                        {event.timestamp.toLocaleTimeString()}
                        </td>
                        <td>
                        <div className="flex items-center gap-2">
                            <span>{getTypeIcon(event.type)}</span>
                            <span className="capitalize">{event.type}</span>
                        </div>
                        </td>
                        <td className="max-w-xs truncate" title={event.message}>
                            {event.message}
                        </td>
                        <td>
                        <Badge variant={getSeverityColor(event.severity)} size="sm">
                            {event.severity}
                        </Badge>
                        </td>
                        <td className="text-sm font-mono">
                        {event.duration ? `${event.duration}ms` : '-'}
                        </td>
                    </tr>
                    ))
                )}
              </tbody>
            </Table>
          </div>
          )}
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
