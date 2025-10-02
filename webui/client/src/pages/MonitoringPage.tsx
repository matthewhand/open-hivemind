import React, { useEffect, useState } from 'react';
import { Box, Typography } from '@mui/material';
import PerformanceMonitor from '../components/PerformanceMonitor';
import VisualFeedback from '../components/DaisyUI/VisualFeedback';
import Timeline from '../components/DaisyUI/Timeline';
import type { TimelineEvent } from '../components/DaisyUI/Timeline';
import { useWebSocket } from '../hooks/useWebSocket';

const MonitoringPage: React.FC = () => {
  const { messages, metrics, connected } = useWebSocket();
  const [events, setEvents] = useState<TimelineEvent[]>([]);

  // Convert WebSocket metrics to VisualFeedback format
  const currentMetrics = metrics.length > 0 ? [
    { name: 'CPU Usage', value: metrics[0].cpuUsage, unit: '%' },
    { name: 'Memory Usage', value: metrics[0].memoryUsage, unit: '%' },
    { name: 'Response Time', value: metrics[0].responseTime, unit: 'ms' }
  ] : [
    { name: 'CPU Usage', value: 0, unit: '%' },
    { name: 'Memory Usage', value: 0, unit: '%' },
    { name: 'Response Time', value: 0, unit: 'ms' }
  ];

  // Convert WebSocket messages to timeline events
  useEffect(() => {
    if (messages.length > 0) {
      const convertedEvents: TimelineEvent[] = messages.map((msg, index) => ({
        id: msg.id || `msg-${index}`,
        timestamp: new Date(msg.timestamp),
        title: `Message from ${msg.botName}`,
        description: `Channel: ${msg.channelId}, User: ${msg.userId}`,
        type: msg.status === 'success' ? 'success' : msg.status === 'error' ? 'error' : 'warning',
        metadata: {
          botName: msg.botName,
          provider: msg.provider,
          messageType: msg.messageType,
          status: msg.status
        },
        details: (
          <div className="space-y-2">
            <div className="stats stats-vertical lg:stats-horizontal shadow">
              <div className="stat">
                <div className="stat-title">Processing Time</div>
                <div className="stat-value text-info">{msg.processingTime || 0}ms</div>
                <div className="stat-desc">Duration</div>
              </div>
              <div className="stat">
                <div className="stat-title">Content Length</div>
                <div className="stat-value">{msg.contentLength}</div>
                <div className="stat-desc">Characters</div>
              </div>
            </div>
          </div>
        )
      }));
      
      setEvents(convertedEvents);
    }
  }, [messages]);

  useEffect(() => {
    // The useWebSocket hook handles connection automatically
  }, []);

  return (
    <Box>
      <Typography variant="h4" component="h1" gutterBottom>
        System Monitoring
      </Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Real-time performance metrics and system health monitoring.
        {connected ? ' (Live updates enabled)' : ' (Connecting...)'}
      </Typography>

      <Box sx={{ mb: 4 }}>
        <VisualFeedback metrics={currentMetrics} initialRating={4} />
      </Box>
      
      <Box sx={{ mb: 4 }}>
        <PerformanceMonitor />
      </Box>

      {/* System Activity Timeline */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h5" component="h2" gutterBottom>
          System Activity
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Recent system events and audit logs
        </Typography>
        
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
      </Box>
    </Box>
  );
};

export default MonitoringPage;