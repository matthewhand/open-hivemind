import React, { useEffect, useState } from 'react';
import PerformanceMonitor from '../components/PerformanceMonitor';
import VisualFeedback from '../components/DaisyUI/VisualFeedback';
import Timeline, { TimelineEvent } from '../components/DaisyUI/Timeline';
import { useWebSocket } from '../hooks/useWebSocket';
import ActivityCharts from '../components/Monitoring/ActivityCharts';

const MonitoringPage: React.FC = () => {
  const { connect, disconnect, isConnected } = useWebSocket();
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  // Mock metrics data
  const mockMetrics = [
    { name: 'CPU Usage', value: 45, unit: '%' },
    { name: 'Memory Usage', value: 78, unit: '%' },
    { name: 'Response Time', value: 125, unit: 'ms' }
  ];

  // Mock timeline events
  const mockEvents: TimelineEvent[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 5 * 60 * 1000), // 5 minutes ago
      title: 'System Health Check Completed',
      description: 'All services are running normally',
      type: 'success',
      metadata: { service: 'health-monitor', status: 'healthy' },
      details: (
        <div className="space-y-2">
          <div className="stats stats-vertical lg:stats-horizontal shadow">
            <div className="stat">
              <div className="stat-title">Services</div>
              <div className="stat-value text-success">12/12</div>
              <div className="stat-desc">All operational</div>
            </div>
            <div className="stat">
              <div className="stat-title">Response Time</div>
              <div className="stat-value text-info">125ms</div>
              <div className="stat-desc">Average</div>
            </div>
          </div>
        </div>
      )
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      title: 'High Memory Usage Detected',
      description: 'Memory usage has exceeded 80% threshold',
      type: 'warning',
      metadata: { service: 'memory-monitor', usage: '85%' },
      details: (
        <div className="alert alert-warning">
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
          </svg>
          <span>Consider scaling up resources or optimizing memory usage</span>
        </div>
      )
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      title: 'Database Connection Restored',
      description: 'Connection to primary database has been re-established',
      type: 'success',
      metadata: { service: 'database', connection: 'primary' }
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 45 * 60 * 1000), // 45 minutes ago
      title: 'Database Connection Failed',
      description: 'Lost connection to primary database, switching to backup',
      type: 'error',
      metadata: { service: 'database', connection: 'primary', backup: 'active' },
      details: (
        <div className="alert alert-error">
          <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Automatic failover to backup database successful</span>
        </div>
      )
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      title: 'Scheduled Maintenance Started',
      description: 'System maintenance window has begun',
      type: 'info',
      metadata: { type: 'maintenance', duration: '30min' }
    }
  ];

  useEffect(() => {
    // Connect to WebSocket for real-time monitoring
    connect();

    // Initialize with mock events
    setEvents(mockEvents);

    return () => {
      disconnect();
    };
  }, [connect, disconnect]);

  const handleNewEvent = (event: TimelineEvent) => {
    setEvents(prev => [event, ...prev]);
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">
          System Monitoring
        </h1>
        <p className="text-base-content/70">
          Real-time performance metrics and system health monitoring.
          {isConnected ? ' (Live updates enabled)' : ' (Connecting...)'}
        </p>
      </div>

      <div className="mb-6">
        <VisualFeedback metrics={mockMetrics} initialRating={4} />
      </div>

      <div className="mb-6">
        <PerformanceMonitor />
      </div>

      <div className="mb-6">
        <ActivityCharts />
      </div>

      {/* System Activity Timeline */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-2">
          System Activity
        </h2>
        <p className="text-sm text-base-content/70 mb-4">
          Recent system events and audit logs
        </p>

        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <h2 className="card-title">Activity Timeline</h2>
              <div className="flex gap-2">
                <div className="badge badge-success gap-2">
                  <div className="w-2 h-2 bg-success rounded-full"></div>
                  Success
                </div>
                <div className="badge badge-warning gap-2">
                  <div className="w-2 h-2 bg-warning rounded-full"></div>
                  Warning
                </div>
                <div className="badge badge-error gap-2">
                  <div className="w-2 h-2 bg-error rounded-full"></div>
                  Error
                </div>
                <div className="badge badge-info gap-2">
                  <div className="w-2 h-2 bg-info rounded-full"></div>
                  Info
                </div>
              </div>
            </div>

            <Timeline
              events={events}
              viewMode="detailed"
              showTimestamps={true}
              autoScroll={true}
              maxEvents={20}
              onEventClick={(event) => console.log('Event clicked:', event)}
              className="max-h-96 overflow-y-auto"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default MonitoringPage;