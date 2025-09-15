import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/slices/authSlice';
import { 
  Box, 
  Card, 
  CardContent, 
  Typography, 
  Chip,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Button,
  LinearProgress,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Badge
} from '@mui/material';
import { 
  OfflineBolt as OfflineIcon,
  Wifi as OnlineIcon,
  Download as DownloadIcon,
  Update as UpdateIcon,
  Settings as SettingsIcon,
  Storage as StorageIcon,
  Speed as SpeedIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  Notifications as NotificationIcon,
  PhoneIphone as DeviceIcon,
  SignalWifiOff as OfflineIndicatorIcon,
  SignalWifi4Bar as OnlineIndicatorIcon,
  InstallMobile as InstallIcon,
  Share as ShareIcon
} from '@mui/icons-material';
import { AnimatedBox } from '../animations/AnimationComponents';

export interface PWAConfig {
  enabled: boolean;
  offlineSupport: boolean;
  backgroundSync: boolean;
  pushNotifications: boolean;
  autoUpdate: boolean;
  cacheFirst: boolean;
  networkTimeout: number; // milliseconds
  maxCacheAge: number; // seconds
  maxCacheSize: number; // MB
  strategies: {
    api: CacheStrategy;
    static: CacheStrategy;
    images: CacheStrategy;
    fonts: CacheStrategy;
  };
}

export interface CacheStrategy {
  type: 'cacheFirst' | 'networkFirst' | 'staleWhileRevalidate';
  maxAge: number; // seconds
  maxEntries: number;
  networkTimeout: number; // milliseconds
  backgroundSync: boolean;
}

export interface ServiceWorkerStatus {
  installed: boolean;
  activated: boolean;
  controlling: boolean;
  updateAvailable: boolean;
  error?: Error;
}

export interface OfflineStatus {
  online: boolean;
  type?: 'wifi' | 'cellular' | 'ethernet' | 'none';
  effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
  downlink?: number;
  rtt?: number;
  saveData?: boolean;
}

export interface InstallPrompt {
  prompt?: () => Promise<void>;
  userChoice?: 'accepted' | 'dismissed';
  platform?: string;
}

export interface PWAMetrics {
  cacheSize: number;
  cachedRequests: number;
  offlineRequests: number;
  syncQueueSize: number;
  lastSync: Date | null;
  installStatus: 'not-installed' | 'installed' | 'prompt-available';
  updateStatus: 'up-to-date' | 'update-available' | 'updating';
}

export interface BackgroundSyncEvent {
  id: string;
  type: 'queue' | 'retry' | 'periodic';
  url: string;
  method: string;
  data: any;
  timestamp: Date;
  attempts: number;
  status: 'pending' | 'success' | 'failed';
  error?: string;
}

interface PWAContextType {
  // Configuration
  config: PWAConfig;
  isSupported: boolean;
  isInstalled: boolean;
  
  // Service Worker
  swStatus: ServiceWorkerStatus;
  updateAvailable: boolean;
  
  // Offline functionality
  isOnline: boolean;
  offlineStatus: OfflineStatus;
  
  // Installation
  installPrompt: InstallPrompt | null;
  metrics: PWAMetrics;
  
  // Core functionality
  install: () => Promise<void>;
  update: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  
  // Cache management
  clearCache: () => Promise<void>;
  getCacheSize: () => Promise<number>;
  getCachedUrls: () => Promise<string[]>;
  
  // Background sync
  enableBackgroundSync: () => Promise<void>;
  disableBackgroundSync: () => Promise<void>;
  getSyncQueue: () => Promise<BackgroundSyncEvent[]>;
  clearSyncQueue: () => Promise<void>;
  
  // Offline requests
  queueOfflineRequest: (request: any) => Promise<void>;
  getOfflineRequests: () => Promise<any[]>;
  clearOfflineRequests: () => Promise<void>;
  
  // Configuration
  updateConfig: (updates: Partial<PWAConfig>) => Promise<void>;
  
  // Metrics and monitoring
  subscribeToUpdates: (callback: (event: any) => void) => () => void;
  getPerformanceMetrics: () => Promise<any>;
  
  // UI helpers
  formatBytes: (bytes: number) => string;
  formatDuration: (ms: number) => string;
  getNetworkQuality: () => 'excellent' | 'good' | 'poor' | 'offline';
}

// Mock service worker implementation for demonstration
class MockServiceWorker {
  private status: ServiceWorkerStatus = {
    installed: false,
    activated: false,
    controlling: false,
    updateAvailable: false,
  };
  
  private cache = new Map<string, any>();
  private syncQueue: BackgroundSyncEvent[] = [];
  private offlineRequests: any[] = [];
  private subscribers: Array<(event: any) => void> = [];
  private metrics: PWAMetrics = {
    cacheSize: 0,
    cachedRequests: 0,
    offlineRequests: 0,
    syncQueueSize: 0,
    lastSync: null,
    installStatus: 'not-installed',
    updateStatus: 'up-to-date',
  };

  constructor() {
    this.initialize();
  }

  private initialize() {
    // Simulate service worker initialization
    setTimeout(() => {
      this.status.installed = true;
      this.status.activated = true;
      this.status.controlling = true;
      this.metrics.installStatus = 'installed';
      this.notifySubscribers({ type: 'sw-installed' });
    }, 1000);
  }

  async install(): Promise<void> {
    if (this.status.installed) {
      throw new Error('Service Worker already installed');
    }
    
    this.status.installed = true;
    this.status.activated = true;
    this.status.controlling = true;
    this.metrics.installStatus = 'installed';
    this.notifySubscribers({ type: 'installed' });
  }

  async update(): Promise<void> {
    this.metrics.updateStatus = 'updating';
    this.notifySubscribers({ type: 'update-start' });
    
    // Simulate update process
    setTimeout(() => {
      this.status.updateAvailable = false;
      this.metrics.updateStatus = 'up-to-date';
      this.notifySubscribers({ type: 'update-complete' });
    }, 2000);
  }

  async checkForUpdates(): Promise<void> {
    // Simulate checking for updates
    const hasUpdate = Math.random() > 0.7;
    if (hasUpdate) {
      this.status.updateAvailable = true;
      this.metrics.updateStatus = 'update-available';
      this.notifySubscribers({ type: 'update-available' });
    }
  }

  private notifySubscribers(event: any): void {
    this.subscribers.forEach(callback => callback(event));
  }

  subscribe(callback: (event: any) => void): () => void {
    this.subscribers.push(callback);
    return () => {
      const index = this.subscribers.indexOf(callback);
      if (index > -1) {
        this.subscribers.splice(index, 1);
      }
    };
  }

  getMetrics(): PWAMetrics {
    return { ...this.metrics };
  }

  getOfflineStatus(): OfflineStatus {
    return {
      online: navigator.onLine,
      type: 'wifi',
      effectiveType: '4g',
      downlink: 10,
      rtt: 50,
      saveData: false,
    };
  }

  async enableBackgroundSync(): Promise<void> {
    this.metrics.syncQueueSize = this.syncQueue.length;
    this.notifySubscribers({ type: 'sync-enabled' });
  }

  async disableBackgroundSync(): Promise<void> {
    this.notifySubscribers({ type: 'sync-disabled' });
  }

  getSyncQueue(): Promise<BackgroundSyncEvent[]> {
    return Promise.resolve([...this.syncQueue]);
  }

  async clearSyncQueue(): Promise<void> {
    this.syncQueue = [];
    this.metrics.syncQueueSize = 0;
    this.notifySubscribers({ type: 'sync-cleared' });
  }

  async queueOfflineRequest(request: any): Promise<void> {
    const syncEvent: BackgroundSyncEvent = {
      id: `sync-${Date.now()}`,
      type: 'queue',
      url: request.url || '/api/request',
      method: request.method || 'POST',
      data: request.data,
      timestamp: new Date(),
      attempts: 0,
      status: 'pending',
    };
    
    this.syncQueue.push(syncEvent);
    this.metrics.syncQueueSize = this.syncQueue.length;
    this.notifySubscribers({ type: 'request-queued', syncEvent });
  }

  getOfflineRequests(): Promise<any[]> {
    return Promise.resolve([...this.offlineRequests]);
  }

  async clearOfflineRequests(): Promise<void> {
    this.offlineRequests = [];
    this.metrics.offlineRequests = 0;
  }

  async getPerformanceMetrics(): Promise<any> {
    return {
      cacheSize: this.metrics.cacheSize,
      cachedRequests: this.metrics.cachedRequests,
      offlineRequests: this.metrics.offlineRequests,
      syncQueueSize: this.metrics.syncQueueSize,
      lastSync: this.metrics.lastSync,
      installStatus: this.metrics.installStatus,
      updateStatus: this.metrics.updateStatus,
      serviceWorker: this.status,
    };
  }

  async clearCache(): Promise<void> {
    this.cache.clear();
    this.metrics.cacheSize = 0;
    this.metrics.cachedRequests = 0;
    this.notifySubscribers({ type: 'cache-cleared' });
  }

  async getCacheSize(): Promise<number> {
    return this.metrics.cacheSize;
  }

  async getCachedUrls(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }
}

const defaultPWAConfig: PWAConfig = {
  enabled: true,
  offlineSupport: true,
  backgroundSync: true,
  pushNotifications: true,
  autoUpdate: true,
  cacheFirst: true,
  networkTimeout: 3000,
  maxCacheAge: 86400, // 24 hours
  maxCacheSize: 50, // MB
  strategies: {
    api: {
      type: 'networkFirst',
      maxAge: 300,
      maxEntries: 50,
      networkTimeout: 3000,
      backgroundSync: true,
    },
    static: {
      type: 'cacheFirst',
      maxAge: 86400,
      maxEntries: 100,
      networkTimeout: 5000,
      backgroundSync: false,
    },
    images: {
      type: 'cacheFirst',
      maxAge: 604800, // 7 days
      maxEntries: 200,
      networkTimeout: 10000,
      backgroundSync: false,
    },
    fonts: {
      type: 'cacheFirst',
      maxAge: 31536000, // 1 year
      maxEntries: 30,
      networkTimeout: 5000,
      backgroundSync: false,
    },
  },
};

interface PWAProviderProps {
  children: React.ReactNode;
}

export const PWAProvider: React.FC<PWAProviderProps> = ({ children }) => {
  const currentUser = useAppSelector(selectUser);
  const [config, setConfig] = useState<PWAConfig>(defaultPWAConfig);
  const [sw] = useState<MockServiceWorker>(new MockServiceWorker());
  const [isSupported, setIsSupported] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);
  const [swStatus, setSwStatus] = useState<ServiceWorkerStatus>({
    installed: false,
    activated: false,
    controlling: false,
    updateAvailable: false,
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineStatus, setOfflineStatus] = useState<OfflineStatus>({
    online: navigator.onLine,
  });
  const [installPrompt, setInstallPrompt] = useState<InstallPrompt | null>(null);
  const [metrics, setMetrics] = useState<PWAMetrics>(sw.getMetrics());
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setOfflineStatus({ online: true });
    };

    const handleOffline = () => {
      setIsOnline(false);
      setOfflineStatus({ online: false });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Check if PWA is supported
    if ('serviceWorker' in navigator && 'caches' in window) {
      setIsSupported(true);
    }

    // Simulate install prompt
    setTimeout(() => {
      setInstallPrompt({
        prompt: async () => {
          console.log('Install prompt shown');
          setIsInstalled(true);
        },
        platform: 'web',
      });
    }, 3000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const unsubscribe = sw.subscribe((event) => {
      if (event.type === 'installed') {
        setIsInstalled(true);
        setSwStatus(sw.getServiceWorkerStatus());
      } else if (event.type === 'update-available') {
        setSwStatus(sw.getServiceWorkerStatus());
        setUpdateDialogOpen(true);
      } else if (event.type === 'sw-installed') {
        setSwStatus(sw.getServiceWorkerStatus());
      }
    });

    return () => unsubscribe();
  }, [sw]);

  // Core functionality
  const install = async (): Promise<void> => {
    if (!installPrompt?.prompt) {
      throw new Error('No install prompt available');
    }
    
    await installPrompt.prompt();
    setIsInstalled(true);
  };

  const update = async (): Promise<void> => {
    await sw.update();
    setUpdateDialogOpen(false);
  };

  const checkForUpdates = async (): Promise<void> => {
    await sw.checkForUpdates();
  };

  const updateConfig = async (updates: Partial<PWAConfig>): Promise<void> => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const subscribeToUpdates = useCallback((callback: (event: any) => void): (() => void) => {
    return sw.subscribe(callback);
  }, [sw]);

  const getPerformanceMetrics = async (): Promise<any> => {
    return sw.getPerformanceMetrics();
  };

  // Cache management
  const clearCache = async (): Promise<void> => {
    await sw.clearCache();
    setMetrics(sw.getMetrics());
  };

  const getCacheSize = async (): Promise<number> => {
    return sw.getCacheSize();
  };

  const getCachedUrls = async (): Promise<string[]> => {
    return sw.getCachedUrls();
  };

  // Background sync
  const enableBackgroundSync = async (): Promise<void> => {
    await sw.enableBackgroundSync();
  };

  const disableBackgroundSync = async (): Promise<void> => {
    await sw.disableBackgroundSync();
  };

  const getSyncQueue = async (): Promise<BackgroundSyncEvent[]> => {
    return sw.getSyncQueue();
  };

  const clearSyncQueue = async (): Promise<void> => {
    await sw.clearSyncQueue();
  };

  // Offline requests
  const queueOfflineRequest = async (request: any): Promise<void> => {
    await sw.queueOfflineRequest(request);
    setMetrics(sw.getMetrics());
  };

  const getOfflineRequests = async (): Promise<any[]> => {
    return sw.getOfflineRequests();
  };

  const clearOfflineRequests = async (): Promise<void> => {
    await sw.clearOfflineRequests();
  };

  // Utility functions
  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const formatDuration = useCallback((ms: number): string => {
    if (ms < 1000) return `${ms.toFixed(0)}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  }, []);

  const getNetworkQuality = useCallback((): 'excellent' | 'good' | 'poor' | 'offline' => {
    if (!isOnline) return 'offline';
    if (offlineStatus.effectiveType === '4g' && (offlineStatus.downlink || 0) > 5) return 'excellent';
    if (offlineStatus.effectiveType === '3g' || (offlineStatus.downlink || 0) > 1) return 'good';
    return 'poor';
  }, [isOnline, offlineStatus]);

  const contextValue: PWAContextType = {
    config,
    isSupported,
    isInstalled,
    swStatus,
    updateAvailable: swStatus.updateAvailable,
    isOnline,
    offlineStatus,
    installPrompt,
    metrics,
    install,
    update,
    checkForUpdates,
    clearCache,
    getCacheSize,
    getCachedUrls,
    enableBackgroundSync,
    disableBackgroundSync,
    getSyncQueue,
    clearSyncQueue,
    queueOfflineRequest,
    getOfflineRequests,
    clearOfflineRequests,
    updateConfig,
    subscribeToUpdates,
    getPerformanceMetrics,
    formatBytes,
    formatDuration,
    getNetworkQuality,
  };

  if (!currentUser) {
    return (
      <AnimatedBox
        animation={{ initial: { opacity: 0 }, animate: { opacity: 1 } }}
        sx={{ p: 3, display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}
      >
        <Card sx={{ maxWidth: 400, textAlign: 'center' }}>
          <CardContent>
            <OfflineIcon sx={{ fontSize: 64, color: 'primary.main', mb: 2 }} />
            <Typography variant="h5" gutterBottom>
              PWA Features
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
              Please log in to access Progressive Web App features.
            </Typography>
          </CardContent>
        </Card>
      </AnimatedBox>
    );
  }

  return (
    <PWAContext.Provider value={contextValue}>
      <AnimatedBox
        animation={{ initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } }}
        sx={{ width: '100%' }}
      >
        {/* PWA Header */}
        <Card sx={{ mb: 3, borderLeft: 4, borderColor: 'primary.main' }}>
          <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
              <Box display="flex" alignItems="center" gap={2}>
                <DeviceIcon color="primary" />
                <Box>
                  <Typography variant="h6">
                    Progressive Web App
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {isInstalled ? 'Installed' : 'Web App'} • {getNetworkQuality()} connection
                  </Typography>
                </Box>
              </Box>
              
              <Box display="flex" alignItems="center" gap={1}>
                <Badge badgeContent={metrics.syncQueueSize} color="warning">
                  <OfflineIcon />
                </Badge>
                <Chip
                  label={isOnline ? 'Online' : 'Offline'}
                  size="small"
                  color={isOnline ? 'success' : 'warning'}
                  icon={isOnline ? <OnlineIndicatorIcon /> : <OfflineIndicatorIcon />}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>

        {/* Network Status */}
        <Grid container spacing={2} mb={3}>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box textAlign="center">
                  <Typography variant="h4" color={isOnline ? 'success.main' : 'warning.main'}>
                    {isOnline ? 'Online' : 'Offline'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Network Status
                  </Typography>
                  {isOnline ? <OnlineIcon color="success" /> : <OfflineIcon color="warning" />}
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box textAlign="center">
                  <Typography variant="h4" color="info.main">
                    {formatBytes(metrics.cacheSize)}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Cache Size
                  </Typography>
                  <StorageIcon color="info" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box textAlign="center">
                  <Typography variant="h4" color="primary.main">
                    {metrics.syncQueueSize}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Sync Queue
                  </Typography>
                  <UpdateIcon color="primary" />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Installation & Updates */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Installation & Updates
            </Typography>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} sm={6}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Chip
                    label={isInstalled ? 'Installed' : 'Not Installed'}
                    color={isInstalled ? 'success' : 'default'}
                    icon={isInstalled ? <CheckIcon /> : <WarningIcon />}
                  />
                  {!isInstalled && installPrompt && (
                    <Button
                      variant="contained"
                      startIcon={<InstallIcon />}
                      onClick={install}
                    >
                      Install App
                    </Button>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12} sm={6}>
                <Box display="flex" alignItems="center" gap={2}>
                  <Chip
                    label={metrics.updateStatus.replace('-', ' ').toUpperCase()}
                    color={metrics.updateStatus === 'up-to-date' ? 'success' : 'warning'}
                    icon={metrics.updateStatus === 'up-to-date' ? <CheckIcon /> : <UpdateIcon />}
                  />
                  {swStatus.updateAvailable && (
                    <Button
                      variant="outlined"
                      startIcon={<UpdateIcon />}
                      onClick={() => setUpdateDialogOpen(true)}
                    >
                      Update Now
                    </Button>
                  )}
                </Box>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Service Worker Status */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Service Worker Status
            </Typography>
            <List dense>
              <ListItem>
                <ListItemIcon>
                  {swStatus.installed ? <CheckIcon color="success" /> : <WarningIcon color="warning" />}
                </ListItemIcon>
                <ListItemText
                  primary="Installed"
                  secondary={swStatus.installed ? 'Service Worker is active' : 'Service Worker not installed'}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  {swStatus.activated ? <CheckIcon color="success" /> : <WarningIcon color="warning" />}
                </ListItemIcon>
                <ListItemText
                  primary="Activated"
                  secondary={swStatus.activated ? 'Service Worker is controlling the page' : 'Service Worker not activated'}
                />
              </ListItem>
              <ListItem>
                <ListItemIcon>
                  {swStatus.controlling ? <CheckIcon color="success" /> : <WarningIcon color="warning" />}
                </ListItemIcon>
                <ListItemText
                  primary="Controlling"
                  secondary={swStatus.controlling ? 'Service Worker is handling requests' : 'Service Worker not controlling requests'}
                />
              </ListItem>
            </List>
          </CardContent>
        </Card>

        {/* Configuration */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              PWA Configuration
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.offlineSupport}
                      onChange={(e) => updateConfig({ offlineSupport: e.target.checked })}
                    />
                  }
                  label="Offline Support"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.backgroundSync}
                      onChange={(e) => updateConfig({ backgroundSync: e.target.checked })}
                    />
                  }
                  label="Background Sync"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.pushNotifications}
                      onChange={(e) => updateConfig({ pushNotifications: e.target.checked })}
                    />
                  }
                  label="Push Notifications"
                />
              </Grid>
              <Grid item xs={12} sm={6}>
                <FormControlLabel
                  control={
                    <Switch
                      checked={config.autoUpdate}
                      onChange={(e) => updateConfig({ autoUpdate: e.target.checked })}
                    />
                  }
                  label="Auto Update"
                />
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      </AnimatedBox>

      {/* Update Dialog */}
      <Dialog open={updateDialogOpen} onClose={() => setUpdateDialogOpen(false)}>
        <DialogTitle>Update Available</DialogTitle>
        <DialogContent>
          <Typography>
            A new version of Open-Hivemind is available. Would you like to update now?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setUpdateDialogOpen(false)}>
            Later
          </Button>
          <Button onClick={update} variant="contained" startIcon={<UpdateIcon />}>
            Update Now
          </Button>
        </DialogActions>
      </Dialog>
    </PWAContext.Provider>
  );
};

// Export types and utilities
export type { PWAConfig, CacheStrategy, ServiceWorkerStatus, OfflineStatus, InstallPrompt, PWAMetrics, BackgroundSyncEvent, PWAContextType };
export { PWAContext };

export default PWAProvider;