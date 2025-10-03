import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';
import type { ReactNode } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  Button,
  Chip,
  Alert,
  Snackbar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tooltip,
  Badge,
} from '@mui/material';
import {
  Refresh as RefreshIcon,
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  Error as ErrorIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
} from '@mui/icons-material';
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

const rawBaseUrl = import.meta.env.VITE_API_BASE_URL as string | undefined;
const normalizedBase = rawBaseUrl?.replace(/\/$/, '') ?? '';

const buildWebSocketUrl = (path: string): string => {
  if (normalizedBase) {
    const wsOrigin = normalizedBase.replace(/^http/i, (match) => (match.toLowerCase() === 'https' ? 'wss' : 'ws'));
    return `${wsOrigin}${path}`;
  }
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
    refreshInterval: 30000, // 30 seconds
    notifications: {
      botStatus: true,
      systemHealth: true,
      activity: true,
      configChanges: true,
    },
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

    const connectWebSocket = () => {
      // Simulate WebSocket connection for real-time updates
      const ws = new WebSocket(buildWebSocketUrl('/ws'));

      ws.onopen = () => {
        setIsConnected(true);
        setConnectionStatus('connected');
        setLastUpdate(new Date());
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          const updateEvent: UpdateEvent = {
            id: Date.now().toString(),
            type: data.type || 'bot_status',
            timestamp: new Date().toISOString(),
            data: data,
            source: 'websocket'
          };

          setEvents(prev => [updateEvent, ...prev.slice(0, 49)]); // Keep last 50 events
          setLastUpdate(new Date());

          // Show notification if enabled for this event type
          const notificationKey = updateEvent.type === 'config_change' ? 'configChanges' : updateEvent.type;
          if (settings.notifications[notificationKey as keyof typeof settings.notifications] && 'Notification' in window) {
            new Notification(`Real-time Update: ${updateEvent.type}`, {
              body: JSON.stringify(data).substring(0, 100) + '...',
              icon: '/favicon.ico'
            });
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setConnectionStatus('error');
        setIsConnected(false);
      };

      ws.onclose = () => {
        setConnectionStatus('disconnected');
        setIsConnected(false);
        // Attempt to reconnect after 5 seconds
        setTimeout(connectWebSocket, 5000);
      };

      return ws;
    };

    const ws = connectWebSocket();

    // Set up polling as fallback
    const pollInterval = setInterval(async () => {
      if (!isConnected) {
        try {
          await manualRefresh();
        } catch (error) {
          console.error('Polling refresh failed:', error);
        }
      }
    }, settings.refreshInterval);

    return () => {
      ws.close();
      clearInterval(pollInterval);
    };
  }, [settings.enabled, settings.refreshInterval, settings.notifications, isConnected, manualRefresh]);

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
  const [snackbar, setSnackbar] = useState<{
    open: boolean;
    message: string;
    severity: 'success' | 'error' | 'warning' | 'info';
  }>({
    open: false,
    message: '',
    severity: 'info',
  });

  if (!context) {
    return null;
  }

  const { isConnected, lastUpdate, settings, updateSettings, manualRefresh, connectionStatus, events } = context;

  const handleToggleRealTime = () => {
    updateSettings({ enabled: !settings.enabled });
    setSnackbar({
      open: true,
      message: settings.enabled ? 'Real-time updates disabled' : 'Real-time updates enabled',
      severity: 'info',
    });
  };

  const handleManualRefresh = async () => {
    try {
      await manualRefresh();
      if (onRefresh) onRefresh();
      setSnackbar({
        open: true,
        message: 'Data refreshed successfully',
        severity: 'success',
      });
    } catch {
      setSnackbar({
        open: true,
        message: 'Failed to refresh data',
        severity: 'error',
      });
    }
  };

  const getStatusIcon = () => {
    switch (connectionStatus) {
      case 'connected':
        return <CheckCircleIcon color="success" />;
      case 'error':
        return <ErrorIcon color="error" />;
      default:
        return <WarningIcon color="warning" />;
    }
  };

  const getStatusColor = () => {
    switch (connectionStatus) {
      case 'connected':
        return 'success';
      case 'error':
        return 'error';
      default:
        return 'warning';
    }
  };

  return (
    <>
      <Card>
        <CardContent>
          <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
            <Box display="flex" alignItems="center" gap={2}>
              <Badge color={getStatusColor()} variant="dot">
                {getStatusIcon()}
              </Badge>
              <Typography variant="h6">
                Real-time Updates
              </Typography>
              <Chip
                label={isConnected ? 'Connected' : 'Disconnected'}
                color={isConnected ? 'success' : 'default'}
                size="small"
              />
            </Box>

            <Box display="flex" alignItems="center" gap={1}>
              <Tooltip title="Toggle real-time updates">
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.enabled}
                      onChange={handleToggleRealTime}
                      color="primary"
                    />
                  }
                  label="Enable"
                />
              </Tooltip>

              <Tooltip title="Manual refresh">
                <IconButton onClick={handleManualRefresh} color="primary">
                  <RefreshIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="View recent events">
                <IconButton onClick={() => setEventsDialogOpen(true)} color="primary">
                  <NotificationsIcon />
                </IconButton>
              </Tooltip>

              <Tooltip title="Settings">
                <IconButton onClick={() => setSettingsDialogOpen(true)} color="default">
                  <SettingsIcon />
                </IconButton>
              </Tooltip>
            </Box>
          </Box>

          <Box display="flex" justifyContent="space-between" alignItems="center">
            <Typography variant="body2" color="text.secondary">
              Last update: {lastUpdate ? lastUpdate.toLocaleTimeString() : 'Never'}
            </Typography>

            <Typography variant="body2" color="text.secondary">
              Refresh interval: {settings.refreshInterval / 1000}s
            </Typography>
          </Box>

          {connectionStatus === 'error' && (
            <Alert severity="error" sx={{ mt: 2 }}>
              Connection lost. Attempting to reconnect...
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Settings Dialog */}
      <Dialog open={settingsDialogOpen} onClose={() => setSettingsDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Real-time Updates Settings</DialogTitle>
        <DialogContent>
          <List>
            <ListItem>
              <ListItemText
                primary="Refresh Interval"
                secondary="How often to check for updates when WebSocket is disconnected"
              />
              <ListItemSecondaryAction>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.refreshInterval === 15000}
                      onChange={(e) => updateSettings({
                        refreshInterval: e.target.checked ? 15000 : 30000
                      })}
                    />
                  }
                  label={settings.refreshInterval === 15000 ? '15s' : '30s'}
                />
              </ListItemSecondaryAction>
            </ListItem>

            <ListItem>
              <ListItemText
                primary="Sound Notifications"
                secondary="Play sound when updates are received"
              />
              <ListItemSecondaryAction>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.soundEnabled}
                      onChange={(e) => updateSettings({ soundEnabled: e.target.checked })}
                    />
                  }
                  label="Enable"
                />
              </ListItemSecondaryAction>
            </ListItem>

            <ListItem>
              <ListItemText
                primary="Bot Status Notifications"
                secondary="Show notifications for bot status changes"
              />
              <ListItemSecondaryAction>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notifications.botStatus}
                      onChange={(e) => updateSettings({
                        notifications: { ...settings.notifications, botStatus: e.target.checked }
                      })}
                    />
                  }
                  label="Enable"
                />
              </ListItemSecondaryAction>
            </ListItem>

            <ListItem>
              <ListItemText
                primary="System Health Notifications"
                secondary="Show notifications for system health changes"
              />
              <ListItemSecondaryAction>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notifications.systemHealth}
                      onChange={(e) => updateSettings({
                        notifications: { ...settings.notifications, systemHealth: e.target.checked }
                      })}
                    />
                  }
                  label="Enable"
                />
              </ListItemSecondaryAction>
            </ListItem>

            <ListItem>
              <ListItemText
                primary="Activity Notifications"
                secondary="Show notifications for new activity events"
              />
              <ListItemSecondaryAction>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notifications.activity}
                      onChange={(e) => updateSettings({
                        notifications: { ...settings.notifications, activity: e.target.checked }
                      })}
                    />
                  }
                  label="Enable"
                />
              </ListItemSecondaryAction>
            </ListItem>

            <ListItem>
              <ListItemText
                primary="Configuration Change Notifications"
                secondary="Show notifications for configuration changes"
              />
              <ListItemSecondaryAction>
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.notifications.configChanges}
                      onChange={(e) => updateSettings({
                        notifications: { ...settings.notifications, configChanges: e.target.checked }
                      })}
                    />
                  }
                  label="Enable"
                />
              </ListItemSecondaryAction>
            </ListItem>
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Events Dialog */}
      <Dialog open={eventsDialogOpen} onClose={() => setEventsDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Recent Update Events</DialogTitle>
        <DialogContent>
          {events.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
              No recent events
            </Typography>
          ) : (
            <List>
              {events.map((event) => (
                <ListItem key={event.id} divider>
                  <ListItemText
                    primary={
                      <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="subtitle2">
                          {event.type}
                        </Typography>
                        <Chip
                          label={event.source}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    }
                    secondary={
                      <Typography variant="body2" color="text.secondary">
                        {new Date(event.timestamp).toLocaleString()} - {JSON.stringify(event.data).substring(0, 100)}...
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEventsDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar for notifications */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          severity={snackbar.severity}
          sx={{ width: '100%' }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </>
  );
};

export default RealTimeUpdates;
export { RealTimeUpdatesContext };
