/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Card, Badge, Button, Alert, Table } from './DaisyUI';
import {
  Bolt,
  Server,
  Users,
  Activity,
  Bot,
  MessageCircle,
  AlertCircle,
  Clock,
  Play,
  Pause
} from 'lucide-react';
import { apiService } from '../services/api';
import type { ActivityEvent } from '../services/api';

const ActivityMonitor: React.FC = () => {
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [isMonitoring, setIsMonitoring] = useState(true);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const fetchActivity = async () => {
    try {
      // Fetch recent activity
      // We could pass 'from' timestamp to get only new events, but for simplicity we fetch latest
      const response = await apiService.getActivity();
      if (response && response.events) {
        // Sort by timestamp descending
        const sortedEvents = response.events.sort((a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
        );
        setEvents(sortedEvents);
      }
    } catch (err) {
      console.error('Failed to fetch activity:', err);
    }
  };

  useEffect(() => {
    fetchActivity(); // Initial fetch

    if (!isMonitoring) { return; }

    const interval = setInterval(() => {
      fetchActivity();
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [isMonitoring]);

  const filteredEvents = events.filter(event => {
    if (filter === 'all') return true;
    if (filter === 'error') return event.status === 'error' || event.status === 'timeout';
    if (filter === 'bot') return true; // All events involve bots in API response usually
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

  const getTypeIcon = (provider: string) => {
    // Determine icon based on provider or message type
    // Since we don't have detailed type, we use provider icon or generic
    switch (provider?.toLowerCase()) {
      case 'discord': return <Bot className="w-4 h-4" />;
      case 'slack': return <MessageCircle className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  // Calculate stats from events
  const totalEvents = events.length;
  const errorEvents = events.filter(e => e.status === 'error' || e.status === 'timeout').length;
  const uniqueBots = new Set(events.map(e => e.botName)).size;
  const recentCount = events.filter(e => new Date(e.timestamp) > new Date(Date.now() - 300000)).length; // 5 min

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
                className={`btn-${isMonitoring ? 'error' : 'success'} btn-sm gap-2`}
              >
                {isMonitoring ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
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
            <Bolt className="w-8 h-8 mx-auto text-primary mb-2" />
            <div className="text-2xl font-bold">{totalEvents}</div>
            <p className="text-sm opacity-70">Total Events</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center p-4">
            <Bot className="w-8 h-8 mx-auto text-info mb-2" />
            <div className="text-2xl font-bold">{uniqueBots}</div>
            <p className="text-sm opacity-70">Active Bots</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center p-4">
            <AlertCircle className="w-8 h-8 mx-auto text-error mb-2" />
            <div className="text-2xl font-bold">{errorEvents}</div>
            <p className="text-sm opacity-70">Errors</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center p-4">
            <Clock className="w-8 h-8 mx-auto text-success mb-2" />
            <div className="text-2xl font-bold">{recentCount}</div>
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
              <Button
                className={`join-item btn-sm ${filter === 'all' ? 'btn-active' : 'btn-ghost'}`}
                onClick={() => setFilter('all')}
              >
                All
              </Button>
              <Button
                className={`join-item btn-sm ${filter === 'error' ? 'btn-active' : 'btn-ghost'}`}
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
                  <th>Bot / Provider</th>
                  <th>Details</th>
                  <th>Status</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {filteredEvents.length > 0 ? (
                  filteredEvents.slice(0, 20).map((event) => (
                    <tr key={event.id}>
                      <td className="text-sm opacity-70 whitespace-nowrap">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <span>{getTypeIcon(event.provider)}</span>
                          <div className="flex flex-col">
                            <span className="font-medium">{event.botName}</span>
                            <span className="text-xs opacity-70">{event.provider}</span>
                          </div>
                        </div>
                      </td>
                      <td className="max-w-xs truncate">
                        <div className="flex flex-col">
                           <span className="text-xs">{event.messageType}</span>
                           <span className="text-xs opacity-70">{event.llmProvider}</span>
                           {event.errorMessage && <span className="text-xs text-error">{event.errorMessage}</span>}
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
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center py-4 opacity-50">
                      No activity events found
                    </td>
                  </tr>
                )}
              </tbody>
            </Table>
          </div>
        </div>
      </Card>

      {isMonitoring && (
        <Alert status="info" icon={<Activity className="w-5 h-5 animate-pulse" />}>
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
