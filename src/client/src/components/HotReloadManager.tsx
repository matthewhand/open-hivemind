import React, { useState, useEffect } from 'react';
import { Card, Button, Input, Alert, Toggle, Badge, Modal } from './DaisyUI';
import { PlayIcon, StopIcon, ClockIcon } from '@heroicons/react/24/outline';

export interface ReloadEvent {
  id: string;
  timestamp: Date;
  type: 'auto' | 'manual';
  component: string;
  status: 'success' | 'error';
  duration: number;
}

const HotReloadManager: React.FC = () => {
  const [isEnabled, setIsEnabled] = useState(true);
  const [interval, setInterval] = useState(5);
  const [isMonitoring, setIsMonitoring] = useState(false);
  const [events, setEvents] = useState<ReloadEvent[]>([]);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    if (isEnabled && isMonitoring) {
      const timer = setInterval(() => {
        const newEvent: ReloadEvent = {
          id: Date.now().toString(),
          timestamp: new Date(),
          type: 'auto',
          component: 'Dashboard',
          status: Math.random() > 0.1 ? 'success' : 'error',
          duration: Math.floor(Math.random() * 1000) + 100
        };
        setEvents(prev => [newEvent, ...prev].slice(0, 10));
      }, interval * 1000);

      return () => clearInterval(timer);
    }
  }, [isEnabled, isMonitoring, interval]);

  const handleManualReload = () => {
    const newEvent: ReloadEvent = {
      id: Date.now().toString(),
      timestamp: new Date(),
      type: 'manual',
      component: 'Manual Trigger',
      status: 'success',
      duration: 150
    };
    setEvents(prev => [newEvent, ...prev].slice(0, 10));
  };

  const recentEvents = events.filter(e =>
    e.timestamp > new Date(Date.now() - 60000)
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'success';
      case 'error': return 'error';
      default: return 'info';
    }
  };

  return (
    <div className="w-full space-y-6">
      <Card className="shadow-lg border-l-4 border-warning">
        <div className="card-body">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="card-title text-2xl">Hot Reload Manager</h2>
              <p className="text-sm opacity-70">Auto-refresh components during development</p>
            </div>
            <Badge variant={isEnabled ? 'success' : 'neutral'} size="lg">
              {isEnabled ? 'Active' : 'Disabled'}
            </Badge>
          </div>
        </div>
      </Card>

      {/* Controls */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="shadow">
          <div className="card-body">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold">Auto Reload</h3>
              <Toggle
                checked={isEnabled}
                onChange={setIsEnabled}
              />
            </div>
            <p className="text-sm opacity-70">Enable automatic component reloading</p>
          </div>
        </Card>

        <Card className="shadow">
          <div className="card-body">
            <h3 className="font-bold mb-2">Interval</h3>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={interval}
                onChange={(e) => setInterval(parseInt(e.target.value) || 5)}
                className="w-20"
                min="1"
                max="60"
              />
              <span className="text-sm opacity-70">seconds</span>
            </div>
          </div>
        </Card>

        <Card className="shadow">
          <div className="card-body">
            <h3 className="font-bold mb-2">Manual Action</h3>
            <Button
              onClick={handleManualReload}
              className="btn-primary btn-sm"
            >
              <PlayIcon className="w-4 h-4 mr-2" />
              Reload Now
            </Button>
          </div>
        </Card>
      </div>

      {/* Monitoring */}
      <Card className="shadow-lg">
        <div className="card-body">
          <div className="flex items-center justify-between mb-4">
            <h3 className="card-title text-lg">Monitoring Status</h3>
            <Button
              onClick={() => setIsMonitoring(!isMonitoring)}
              className={`btn-${isMonitoring ? 'error' : 'success'}`}
            >
              {isMonitoring ? (
                <>
                  <StopIcon className="w-4 h-4 mr-2" />
                  Stop Monitoring
                </>
              ) : (
                <>
                  <PlayIcon className="w-4 h-4 mr-2" />
                  Start Monitoring
                </>
              )}
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{events.length}</div>
              <p className="text-sm opacity-70">Total Events</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-success">{recentEvents.filter(e => e.status === 'success').length}</div>
              <p className="text-sm opacity-70">Successful</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-error">{recentEvents.filter(e => e.status === 'error').length}</div>
              <p className="text-sm opacity-70">Failed</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{interval}s</div>
              <p className="text-sm opacity-70">Interval</p>
            </div>
          </div>

          {/* Recent Events */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <h4 className="font-semibold">Recent Events</h4>
              <Button
                size="sm"
                className="btn-ghost"
                onClick={() => setShowDetails(true)}
              >
                View All
              </Button>
            </div>
            {events.slice(0, 5).map((event) => (
              <div key={event.id} className="flex items-center justify-between p-2 border border-base-300 rounded">
                <div className="flex items-center gap-2">
                  <ClockIcon className="w-4 h-4 opacity-50" />
                  <span className="text-sm">{event.component}</span>
                  <Badge variant={getStatusColor(event.status)} size="sm">
                    {event.status}
                  </Badge>
                </div>
                <span className="text-xs opacity-70">
                  {event.timestamp.toLocaleTimeString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {isMonitoring && (
        <Alert variant="info" className="flex items-center gap-3">
          <ClockIcon className="w-5 h-5 animate-pulse" />
          <div>
            <p className="font-medium">Monitoring active</p>
            <p className="text-sm opacity-70">Auto-reload enabled every {interval} seconds</p>
          </div>
        </Alert>
      )}

      {/* Details Modal */}
      <Modal
        open={showDetails}
        onClose={() => setShowDetails(false)}
        title="Hot Reload Details"
      >
        <div className="space-y-4">
          <div className="max-h-96 overflow-y-auto space-y-2">
            {events.map((event) => (
              <div key={event.id} className="p-3 border border-base-300 rounded">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold">{event.component}</p>
                    <p className="text-sm opacity-70">{event.timestamp.toLocaleString()}</p>
                  </div>
                  <div className="flex gap-2">
                    <Badge variant={event.type === 'auto' ? 'info' : 'primary'} size="sm">
                      {event.type}
                    </Badge>
                    <Badge variant={getStatusColor(event.status)} size="sm">
                      {event.status}
                    </Badge>
                  </div>
                </div>
                <p className="text-sm opacity-70">Duration: {event.duration}ms</p>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default HotReloadManager;