import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import {
  Card,
  Button,
  Badge,
  Alert,
  Modal,
  Toggle,
  Tooltip,
  Loading
} from './DaisyUI';
import {
  ArrowPathIcon as RefreshIcon,
  BellIcon as NotificationsIcon,
  Cog6ToothIcon as SettingsIcon,
  XCircleIcon as ErrorIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon as WarningIcon,
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';

interface UpdateEvent {
  id: string;
  type: 'bot_status' | 'system_health' | 'activity' | 'config_change';
  timestamp: string;
  data: Record<string, unknown>;
  source: string;
}

interface RealTimeUpdateSettings {
  enabled: boolean;
  refreshInterval: number;
  notifications: {
    botStatus: boolean;
    systemHealth: boolean;
    activity: boolean;
    configChanges: boolean;
  };
  soundEnabled: boolean;
}

interface RealTimeUpdatesContextType {
  isConnected: boolean;
  lastUpdate: Date | null;
  settings: RealTimeUpdateSettings;
  updateSettings: (settings: Partial<RealTimeUpdateSettings>) => void;
  manualRefresh: () => Promise<void>;
  connectionStatus: 'connected' | 'disconnected' | 'error';
  events: UpdateEvent[];
}

const RealTimeUpdatesContext = createContext<RealTimeUpdatesContextType | null>(null);

const buildWebSocketUrl = (path: string): string => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  return `${protocol}://${window.location.host}${path}`;
};

interface RealTimeUpdatesProviderProps {
  children: ReactNode;
}

export const RealTimeUpdatesProvider: React.FC<RealTimeUpdatesProviderProps> = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'error'>('disconnected');
  const [events, setEvents] = useState<UpdateEvent[]>([]);
  const [settings, setSettings] = useState<RealTimeUpdateSettings>({
    enabled: true,
    refreshInterval: 30000,
    notifications: { botStatus: true, systemHealth: true, activity: true, configChanges: true },
    soundEnabled: false,
  });

  const updateSettings = useCallback((newSettings: Partial<RealTimeUpdateSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const manualRefresh = useCallback(async () => {
    try {
      setConnectionStatus('connected');
      await Promise.all([
        apiService.getStatus(),
        apiService.getConfig(),
        apiService.getActivity()
      ]);
      setLastUpdate(new Date());
      setIsConnected(true);
    } catch (error) {
      console.error('Manual refresh failed:', error);
      setConnectionStatus('error');
      setIsConnected(false);
    }
  }, []);

  useEffect(() => {
    if (!settings.enabled) {
      setIsConnected(false);
      setConnectionStatus('disconnected');
      return;
    }

    // Simulate WebSocket (in real impl, use actual WebSocket)
    const pollInterval = setInterval(async () => {
      try {
        await manualRefresh();
      } catch (error) {
        console.error('Polling refresh failed:', error);
      }
    }, settings.refreshInterval);

    return () => clearInterval(pollInterval);
  }, [settings.enabled, settings.refreshInterval, manualRefresh]);

  const contextValue: RealTimeUpdatesContextType = {
    isConnected,
    lastUpdate,
    settings,
    updateSettings,
    manualRefresh,
    connectionStatus,
    events,
  };

  return (
    <RealTimeUpdatesContext.Provider value={contextValue}>
      {children}
    </RealTimeUpdatesContext.Provider>
  );
};

interface RealTimeUpdatesProps {
  onRefresh?: () => void;
}

const RealTimeUpdates: React.FC<RealTimeUpdatesProps> = ({ onRefresh }) => {
  const context = useContext(RealTimeUpdatesContext);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [eventsDialogOpen, setEventsDialogOpen] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' | 'info' } | null>(null);

  if (!context) {
    return null;
  }

  const { isConnected, lastUpdate, settings, updateSettings, manualRefresh, connectionStatus, events } = context;

  const handleToggleRealTime = () => {
    updateSettings({ enabled: !settings.enabled });
    setToast({
      message: settings.enabled ? 'Real-time updates disabled' : 'Real-time updates enabled',
      type: 'info',
    });
  };

  const handleManualRefresh = async () => {
    try {
      await manualRefresh();
      if (onRefresh) onRefresh();
      setToast({ message: 'Data refreshed successfully', type: 'success' });
    } catch {
      setToast({ message: 'Failed to refresh data', type: 'error' });
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected': return <CheckCircleIcon className="w-5 h-5 text-success" />;
      case 'error': return <ErrorIcon className="w-5 h-5 text-error" />;
      default: return <WarningIcon className="w-5 h-5 text-warning" />;
    }
  };

  const getStatusColor = (): 'success' | 'error' | 'warning' => {
    switch (connectionStatus) {
      case 'connected': return 'success';
      case 'error': return 'error';
      default: return 'warning';
    }
  };

  return (
    <>
      <Card className="shadow-xl">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-3">
              <div className="indicator">
                <span className={`indicator-item badge badge-${getStatusColor()} badge-xs`}></span>
                {getStatusIcon()}
              </div>
              <h2 className="text-xl font-bold">Real-time Updates</h2>
              <Badge variant={isConnected ? 'success' : 'neutral'} size="sm">
                {isConnected ? 'Connected' : 'Disconnected'}
              </Badge>
            </div>

            <div className="flex items-center gap-2">
              <Tooltip content="Toggle real-time updates">
                <div className="form-control">
                  <label className="label cursor-pointer gap-2">
                    <span className="label-text">Enable</span>
                    <Toggle checked={settings.enabled} onChange={handleToggleRealTime} />
                  </label>
                </div>
              </Tooltip>

              <Tooltip content="Manual refresh">
                <Button size="sm" variant="ghost" onClick={handleManualRefresh}>
                  <RefreshIcon className="w-4 h-4" />
                </Button>
              </Tooltip>

              <Tooltip content="View recent events">
                <Button size="sm" variant="ghost" onClick={() => setEventsDialogOpen(true)}>
                  <NotificationsIcon className="w-4 h-4" />
                </Button>
              </Tooltip>

              <Tooltip content="Settings">
                <Button size="sm" variant="ghost" onClick={() => setSettingsDialogOpen(true)}>
                  <SettingsIcon className="w-4 h-4" />
                </Button>
              </Tooltip>
            </div>
          </div>

          <div className="flex justify-between items-center text-sm opacity-70">
            <span>Last update: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}</span>
            <span>Refresh interval: {settings.refreshInterval / 1000}s</span>
          </div>

          {connectionStatus === 'error' && (
            <Alert status="error" message="Connection lost. Attempting to reconnect..." className="mt-4" />
          )}
        </div>
      </Card>

      {/* Settings Modal */}
      <Modal
        isOpen={settingsDialogOpen}
        onClose={() => setSettingsDialogOpen(false)}
        title="Real-time Updates Settings"
      >
        <div className="space-y-4">
          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">
                <strong>Refresh Interval</strong>
                <p className="text-xs opacity-70">How often to check for updates</p>
              </span>
              <Toggle
                checked={settings.refreshInterval === 15000}
                onChange={(checked) => updateSettings({ refreshInterval: checked ? 15000 : 30000 })}
              />
              <span className="label-text-alt">{settings.refreshInterval === 15000 ? '15s' : '30s'}</span>
            </label>
          </div>

          <div className="divider"></div>

          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Sound Notifications</span>
              <Toggle
                checked={settings.soundEnabled}
                onChange={(checked) => updateSettings({ soundEnabled: checked })}
              />
            </label>
          </div>

          <div className="divider">Notification Preferences</div>

          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Bot Status Changes</span>
              <Toggle
                checked={settings.notifications.botStatus}
                onChange={(checked) => updateSettings({
                  notifications: { ...settings.notifications, botStatus: checked }
                })}
              />
            </label>
          </div>

          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">System Health Updates</span>
              <Toggle
                checked={settings.notifications.systemHealth}
                onChange={(checked) => updateSettings({
                  notifications: { ...settings.notifications, systemHealth: checked }
                })}
              />
            </label>
          </div>

          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Activity Events</span>
              <Toggle
                checked={settings.notifications.activity}
                onChange={(checked) => updateSettings({
                  notifications: { ...settings.notifications, activity: checked }
                })}
              />
            </label>
          </div>

          <div className="form-control">
            <label className="label cursor-pointer">
              <span className="label-text">Configuration Changes</span>
              <Toggle
                checked={settings.notifications.configChanges}
                onChange={(checked) => updateSettings({
                  notifications: { ...settings.notifications, configChanges: checked }
                })}
              />
            </label>
          </div>
        </div>

        <div className="modal-action">
          <Button onClick={() => setSettingsDialogOpen(false)}>Close</Button>
        </div>
      </Modal>

      {/* Events Modal */}
      <Modal
        isOpen={eventsDialogOpen}
        onClose={() => setEventsDialogOpen(false)}
        title="Recent Update Events"
      >
        <div className="space-y-2">
          {events.length === 0 ? (
            <p className="text-center py-8 opacity-70">No recent events</p>
          ) : (
            events.map((event) => (
              <div key={event.id} className="p-3 border border-base-300 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <Badge variant="primary" size="sm">{event.type}</Badge>
                  <Badge variant="neutral" size="sm">{event.source}</Badge>
                </div>
                <p className="text-xs opacity-70">
                  {new Date(event.timestamp).toLocaleString()} - {JSON.stringify(event.data).substring(0, 100)}...
                </p>
              </div>
            ))
          )}
        </div>

        <div className="modal-action">
          <Button onClick={() => setEventsDialogOpen(false)}>Close</Button>
        </div>
      </Modal>

      {/* Toast */}
      {toast && (
        <div className="toast toast-end">
          <Alert status={toast.type} message={toast.message} />
        </div>
      )}
    </>
  );
};

export default RealTimeUpdates;
export { RealTimeUpdatesContext };
