import React, { useState, useEffect, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import { Card, Badge, Button, Alert, Toggle, Progress } from './DaisyUI';
import {
  SparklesIcon,
  WifiIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
  BellIcon,
  RefreshIcon
} from '@heroicons/react/24/outline';

export interface RealtimeEvent {
  id: string;
  timestamp: Date;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  source: string;
  acknowledged?: boolean;
}

export interface RealtimeConfig {
  enabled: boolean;
  autoReconnect: boolean;
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
}

interface RealtimeContextType {
  isConnected: boolean;
  lastUpdate: Date | null;
  events: RealtimeEvent[];
  config: RealtimeConfig;
  updateConfig: (config: Partial<RealtimeConfig>) => void;
  acknowledgeEvent: (id: string) => void;
  clearEvents: () => void;
}

const RealtimeContext = createContext<RealtimeContextType | undefined>(undefined);

const mockEvents: RealtimeEvent[] = [
  {
    id: '1',
    timestamp: new Date(),
    type: 'info',
    title: 'System Update',
    message: 'New version available for download',
    source: 'System',
    acknowledged: false
  },
  {
    id: '2',
    timestamp: new Date(Date.now() - 60000),
    type: 'success',
    title: 'Backup Complete',
    message: 'Database backup completed successfully',
    source: 'Backup Service',
    acknowledged: true
  },
  {
    id: '3',
    timestamp: new Date(Date.now() - 120000),
    type: 'warning',
    title: 'High Memory Usage',
    message: 'Memory usage exceeds 80%',
    source: 'Monitor',
    acknowledged: false
  },
];

const RealtimeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(true);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(new Date());
  const [events, setEvents] = useState<RealtimeEvent[]>(mockEvents);
  const [config, setConfig] = useState<RealtimeConfig>({
    enabled: true,
    autoReconnect: true,
    reconnectInterval: 5000,
    maxReconnectAttempts: 5,
    heartbeatInterval: 30000
  });

  useEffect(() => {
    if (!config.enabled) return;

    const heartbeat = setInterval(() => {
      setLastUpdate(new Date());

      // Simulate random events
      if (Math.random() > 0.7) {
        const types: Array<'info' | 'success' | 'warning' | 'error'> = ['info', 'success', 'warning', 'error'];
        const titles = ['System Update', 'Performance Alert', 'User Activity', 'API Call'];
        const sources = ['System', 'Monitor', 'User', 'API'];

        const newEvent: RealtimeEvent = {
          id: Date.now().toString(),
          timestamp: new Date(),
          type: types[Math.floor(Math.random() * types.length)],
          title: titles[Math.floor(Math.random() * titles.length)],
          message: `Event occurred at ${new Date().toLocaleTimeString()}`,
          source: sources[Math.floor(Math.random() * sources.length)],
          acknowledged: false
        };

        setEvents(prev => [newEvent, ...prev].slice(0, 50));
      }
    }, config.heartbeatInterval);

    // Simulate connection issues
    const connectionIssue = setInterval(() => {
      if (Math.random() > 0.9) {
        setIsConnected(false);
        setTimeout(() => setIsConnected(true), 2000);
      }
    }, 10000);

    return () => {
      clearInterval(heartbeat);
      clearInterval(connectionIssue);
    };
  }, [config.enabled, config.heartbeatInterval]);

  const updateConfig = (newConfig: Partial<RealtimeConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
  };

  const acknowledgeEvent = (id: string) => {
    setEvents(prev => prev.map(event =>
      event.id === id ? { ...event, acknowledged: true } : event
    ));
  };

  const clearEvents = () => {
    setEvents([]);
  };

  return (
    <RealtimeContext.Provider value={{
      isConnected,
      lastUpdate,
      events,
      config,
      updateConfig,
      acknowledgeEvent,
      clearEvents
    }}>
      {children}
    </RealtimeContext.Provider>
  );
};

const RealTimeUpdates: React.FC = () => {
  const context = useContext(RealtimeContext);
  if (!context) {
    return <div>Loading...</div>;
  }

  const { isConnected, lastUpdate, events, config, updateConfig, acknowledgeEvent, clearEvents } = context;

  const getEventColor = (type: string): 'info' | 'warning' | 'error' | 'success' => {
    switch (type) {
      case 'success': return 'success';
      case 'error': return 'error';
      case 'warning': return 'warning';
      case 'info': return 'info';
      default: return 'info';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'success': return <CheckCircleIcon className="w-5 h-5 text-success" />;
      case 'error': return <ExclamationTriangleIcon className="w-5 h-5 text-error" />;
      case 'warning': return <ExclamationTriangleIcon className="w-5 h-5 text-warning" />;
      case 'info': return <InformationCircleIcon className="w-5 h-5 text-info" />;
      default: return <InformationCircleIcon className="w-5 h-5" />;
    }
  };

  const unacknowledgedCount = events.filter(e => !e.acknowledged).length;
  const recentEvents = events.filter(e => e.timestamp > new Date(Date.now() - 300000));

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg border-l-4 border-secondary">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <SparklesIcon className="w-8 h-8 text-secondary" />
              <div>
                <h2 className="card-title text-2xl">Real-Time Updates</h2>
                <p className="text-sm opacity-70">Live system events and notifications</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={isConnected ? 'success' : 'error'} size="lg">
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
              <Badge variant="info" size="lg">
                {unacknowledgedCount} New
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="shadow">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-secondary">{events.length}</div>
            <p className="text-sm opacity-70">Total Events</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-warning">{unacknowledgedCount}</div>
            <p className="text-sm opacity-70">Unacknowledged</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <div className="text-2xl font-bold text-info">{recentEvents.length}</div>
            <p className="text-sm opacity-70">Last 5 min</p>
          </div>
        </Card>
        <Card className="shadow">
          <div className="card-body text-center">
            <div className="text-2xl font-bold">{config.heartbeatInterval / 1000}s</div>
            <p className="text-sm opacity-70">Heartbeat</p>
          </div>
        </Card>
      </div>

      {/* Configuration */}
      <Card className="shadow">
        <div className="card-body">
          <h3 className="card-title text-lg mb-4">Configuration</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Real-Time Updates</h4>
                  <p className="text-sm opacity-70">Enable live system monitoring</p>
                </div>
                <Toggle
                  checked={config.enabled}
                  onChange={(checked) => updateConfig({ enabled: checked })}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold">Auto Reconnect</h4>
                  <p className="text-sm opacity-70">Automatic connection recovery</p>
                </div>
                <Toggle
                  checked={config.autoReconnect}
                  onChange={(checked) => updateConfig({ autoReconnect: checked })}
                />
              </div>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Reconnect Interval</label>
                <select
                  value={config.reconnectInterval}
                  onChange={(e) => updateConfig({ reconnectInterval: parseInt(e.target.value) })}
                  className="select select-bordered w-full"
                >
                  <option value={3000}>3 seconds</option>
                  <option value={5000}>5 seconds</option>
                  <option value={10000}>10 seconds</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">Heartbeat Interval</label>
                <select
                  value={config.heartbeatInterval}
                  onChange={(e) => updateConfig({ heartbeatInterval: parseInt(e.target.value) })}
                  className="select select-bordered w-full"
                >
                  <option value={15000}>15 seconds</option>
                  <option value={30000}>30 seconds</option>
                  <option value={60000}>60 seconds</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Events */}
      <Card className="shadow-lg">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="card-title text-lg flex items-center gap-2">
              <BellIcon className="w-5 h-5" />
              Recent Events
            </h3>
            <div className="flex gap-2">
              <Button size="sm" onClick={clearEvents} className="btn-ghost">
                Clear All
              </Button>
              <Button size="sm" onClick={() => window.location.reload()}>
                <RefreshIcon className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
          </div>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.slice(0, 20).map((event) => (
              <div
                key={event.id}
                className={`border rounded-lg p-4 ${
                  event.acknowledged ? 'border-base-200 bg-base-100' : 'border-primary bg-primary/5'
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    {getEventIcon(event.type)}
                    <div>
                      <h4 className="font-semibold">{event.title}</h4>
                      <p className="text-sm opacity-70">{event.message}</p>
                      <p className="text-xs opacity-50 mt-1">
                        {event.source} • {event.timestamp.toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={getEventColor(event.type)} size="sm">
                      {event.type}
                    </Badge>
                    {!event.acknowledged && (
                      <Button
                        size="sm"
                        className="btn-primary btn-outline"
                        onClick={() => acknowledgeEvent(event.id)}
                      >
                        Acknowledge
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Connection Status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <WifiIcon className={`w-5 h-5 ${isConnected ? 'text-success' : 'text-error'}`} />
          <span className="text-sm">
            {isConnected ? 'Connected to real-time service' : 'Disconnected from real-time service'}
          </span>
        </div>
        <span className="text-sm opacity-70">
          Last update: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
        </span>
      </div>

      {!config.enabled && (
        <Alert variant="warning" className="flex items-center gap-3">
          <BellIcon className="w-5 h-5" />
          <div>
            <p className="font-medium">Real-time updates disabled</p>
            <p className="text-sm opacity-70">Enable real-time monitoring to see live system events</p>
          </div>
        </Alert>
      )}

      {!isConnected && config.enabled && (
        <Alert variant="error" className="flex items-center gap-3">
          <ExclamationTriangleIcon className="w-5 h-5" />
          <div>
            <p className="font-medium">Connection lost</p>
            <p className="text-sm opacity-70">Attempting to reconnect to real-time service...</p>
          </div>
        </Alert>
      )}
    </div>
  );
};

export { RealtimeProvider, RealtimeContext };
export default RealTimeUpdates;