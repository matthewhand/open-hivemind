import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';

export interface Event {
  id: string;
  type: 'message' | 'system' | 'error' | 'warning' | 'info' | 'bot_status' | 'performance';
  title: string;
  message: string;
  timestamp: string;
  source: string;
  metadata?: Record<string, any>;
  level: 'low' | 'medium' | 'high' | 'critical';
}

export interface EventStreamProps {
  maxEvents?: number;
  showFilters?: boolean;
  autoScroll?: boolean;
  refreshInterval?: number;
  className?: string;
  onEventClick?: (event: Event) => void;
}

const EventStream: React.FC<EventStreamProps> = ({
  maxEvents = 100,
  showFilters = true,
  autoScroll = true,
  refreshInterval,
  className = '',
  onEventClick
}) => {
  const { messageFlow, alerts, performanceMetrics, botStats } = useWebSocket();
  const [events, setEvents] = useState<Event[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isPaused, setIsPaused] = useState(false);
  const eventEndRef = useRef<HTMLDivElement>(null);
  const eventContainerRef = useRef<HTMLDivElement>(null);

  // Convert WebSocket data to Event format
  useEffect(() => {
    if (isPaused) return;

    const newEvents: Event[] = [];

    // Process message flow events
    messageFlow.forEach((msg, index) => {
      newEvents.push({
        id: `msg-${index}`,
        type: 'message',
        title: `Message from ${msg.source || 'Unknown'}`,
        message: msg.content || 'New message received',
        timestamp: msg.timestamp || new Date().toISOString(),
        source: msg.source || 'System',
        metadata: msg,
        level: 'low'
      });
    });

    // Process alert events
    alerts.forEach((alert, index) => {
      newEvents.push({
        id: `alert-${index}`,
        type: alert.severity as Event['type'] || 'info',
        title: alert.title || 'System Alert',
        message: alert.message || '',
        timestamp: alert.timestamp || new Date().toISOString(),
        source: alert.source || 'System',
        metadata: alert,
        level: alert.severity === 'error' ? 'critical' :
               alert.severity === 'warning' ? 'high' : 'medium'
      });
    });

    // Process performance metrics
    performanceMetrics.forEach((metric, index) => {
      newEvents.push({
        id: `perf-${index}`,
        type: 'performance',
        title: `Performance Update`,
        message: `CPU: ${metric.cpu?.toFixed(1) || 0}%, Memory: ${metric.memory?.toFixed(1) || 0}%`,
        timestamp: metric.timestamp || new Date().toISOString(),
        source: 'Performance Monitor',
        metadata: metric,
        level: 'low'
      });
    });

    // Process bot stats
    botStats.forEach((stat, index) => {
      newEvents.push({
        id: `bot-${index}`,
        type: 'bot_status',
        title: `Bot Activity: ${stat.name}`,
        message: `Messages: ${stat.messageCount}, Errors: ${stat.errorCount}`,
        timestamp: new Date().toISOString(),
        source: 'Bot Monitor',
        metadata: stat,
        level: stat.errorCount > 0 ? 'medium' : 'low'
      });
    });

    // Sort by timestamp and merge with existing events
    const allEvents = [...newEvents, ...events]
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, maxEvents);

    setEvents(allEvents);
  }, [messageFlow, alerts, performanceMetrics, botStats, isPaused, maxEvents]);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && !isPaused && eventEndRef.current) {
      eventEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [events, autoScroll, isPaused]);

  const filteredEvents = events.filter(event => {
    const matchesType = filter === 'all' || event.type === filter;
    const matchesLevel = levelFilter === 'all' || event.level === levelFilter;
    const matchesSearch = !searchTerm ||
      event.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.source.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesType && matchesLevel && matchesSearch;
  });

  const getEventIcon = (type: Event['type']) => {
    switch (type) {
      case 'message':
        return '💬';
      case 'error':
        return '❌';
      case 'warning':
        return '⚠️';
      case 'info':
        return 'ℹ️';
      case 'system':
        return '⚙️';
      case 'bot_status':
        return '🤖';
      case 'performance':
        return '📊';
      default:
        return '📝';
    }
  };

  const getEventColor = (type: Event['type']) => {
    switch (type) {
      case 'error': return 'text-error';
      case 'warning': return 'text-warning';
      case 'info': return 'text-info';
      case 'performance': return 'text-success';
      case 'bot_status': return 'text-primary';
      default: return 'text-neutral';
    }
  };

  const getLevelBadge = (level: Event['level']) => {
    const colors = {
      low: 'badge-success',
      medium: 'badge-warning',
      high: 'badge-warning',
      critical: 'badge-error'
    };
    return colors[level] || 'badge-neutral';
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 5000) return 'Just now';
    if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const handleEventClick = (event: Event) => {
    onEventClick?.(event);
  };

  const clearEvents = () => {
    setEvents([]);
  };

  const exportEvents = () => {
    const dataStr = JSON.stringify(filteredEvents, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    const exportFileDefaultName = `events-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };

  return (
    <div className={`card bg-base-100 shadow-xl ${className}`}>
      <div className="card-body">
        <div className="flex justify-between items-center mb-4">
          <h2 className="card-title">Event Stream</h2>
          <div className="flex gap-2">
            <button
              className={`btn btn-sm ${isPaused ? 'btn-warning' : 'btn-ghost'}`}
              onClick={() => setIsPaused(!isPaused)}
            >
              {isPaused ? '▶️ Resume' : '⏸️ Pause'}
            </button>
            <button className="btn btn-sm btn-ghost" onClick={clearEvents}>
              🗑️ Clear
            </button>
            <button className="btn btn-sm btn-ghost" onClick={exportEvents}>
              📥 Export
            </button>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-col lg:flex-row gap-4 mb-4">
            <div className="flex gap-2 flex-wrap">
              <button
                className={`btn btn-xs ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter('all')}
              >
                All
              </button>
              <button
                className={`btn btn-xs ${filter === 'message' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter('message')}
              >
                Messages
              </button>
              <button
                className={`btn btn-xs ${filter === 'system' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter('system')}
              >
                System
              </button>
              <button
                className={`btn btn-xs ${filter === 'bot_status' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter('bot_status')}
              >
                Bots
              </button>
              <button
                className={`btn btn-xs ${filter === 'performance' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter('performance')}
              >
                Performance
              </button>
            </div>

            <div className="flex gap-2">
              <select
                className="select select-xs select-bordered"
                value={levelFilter}
                onChange={(e) => setLevelFilter(e.target.value)}
              >
                <option value="all">All Levels</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>

              <input
                type="text"
                placeholder="Search events..."
                className="input input-xs input-bordered"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        )}

        <div
          ref={eventContainerRef}
          className="space-y-2 max-h-96 overflow-y-auto bg-base-200 rounded-lg p-4"
        >
          {filteredEvents.length === 0 ? (
            <div className="text-center py-8 text-neutral-content/50">
              <div className="text-4xl mb-2">📡</div>
              <p>No events to display</p>
              {isPaused && <p className="text-sm mt-2">Stream is paused</p>}
            </div>
          ) : (
            filteredEvents.map((event) => (
              <div
                key={event.id}
                className={`flex items-start gap-3 p-3 rounded-lg bg-base-100 hover:bg-base-300 cursor-pointer transition-colors`}
                onClick={() => handleEventClick(event)}
              >
                <div className="text-2xl flex-shrink-0">{getEventIcon(event.type)}</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className={`font-semibold text-sm ${getEventColor(event.type)}`}>
                      {event.title}
                    </h4>
                    <span className={`badge badge-xs ${getLevelBadge(event.level)}`}>
                      {event.level}
                    </span>
                  </div>
                  <p className="text-xs text-neutral-content/80 mb-1">{event.message}</p>
                  <div className="flex items-center gap-2 text-xs text-neutral-content/60">
                    <span>{event.source}</span>
                    <span>•</span>
                    <span>{formatTimestamp(event.timestamp)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={eventEndRef} />
        </div>

        {events.length > 0 && (
          <div className="mt-4 flex justify-between items-center text-xs text-neutral-content/60">
            <span>Showing {filteredEvents.length} of {events.length} events</span>
            {isPaused && <span className="text-warning">Stream paused</span>}
          </div>
        )}
      </div>
    </div>
  );
};

export default EventStream;