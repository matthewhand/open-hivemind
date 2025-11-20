import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/slices/authSlice';
import {
  Card,
  Button,
  Badge,
  Toggle,
  Loading
} from '../components/DaisyUI';
import {
  BoltIcon as OfflineIcon,
  WifiIcon as OnlineIcon,
  ArrowPathIcon as UpdateIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon as WarningIcon,
  DevicePhoneMobileIcon as DeviceIcon,
  ServerStackIcon as StorageIcon,
} from '@heroicons/react/24/outline';

export interface PWAConfig {
  enabled: boolean;
  offlineSupport: boolean;
  backgroundSync: boolean;
  pushNotifications: boolean;
  autoUpdate: boolean;
}

export interface ServiceWorkerStatus {
  installed: boolean;
  activated: boolean;
  controlling: boolean;
  updateAvailable: boolean;
}

export interface PWAMetrics {
  cacheSize: number;
  cachedRequests: number;
  syncQueueSize: number;
  installStatus: 'not-installed' | 'installed' | 'prompt-available';
  updateStatus: 'up-to-date' | 'update-available' | 'updating';
}

interface PWAContextType {
  config: PWAConfig;
  isSupported: boolean;
  isInstalled: boolean;
  swStatus: ServiceWorkerStatus;
  isOnline: boolean;
  metrics: PWAMetrics;
  install: () => Promise<void>;
  update: () => Promise<void>;
  updateConfig: (updates: Partial<PWAConfig>) => Promise<void>;
  formatBytes: (bytes: number) => string;
}

const PWAContext = createContext<PWAContextType | undefined>(undefined);

const defaultPWAConfig: PWAConfig = {
  enabled: true,
  offlineSupport: true,
  backgroundSync: true,
  pushNotifications: true,
  autoUpdate: true,
};

interface PWAProviderProps {
  children: React.ReactNode;
}

export const PWAProvider: React.FC<PWAProviderProps> = ({ children }) => {
  const currentUser = useAppSelector(selectUser);
  const [config, setConfig] = useState<PWAConfig>(defaultPWAConfig);
  const [isSupported] = useState(true);
  const [isInstalled, setIsInstalled] = useState(false);
  const [swStatus, setSwStatus] = useState<ServiceWorkerStatus>({
    installed: false,
    activated: false,
    controlling: false,
    updateAvailable: false,
  });
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [metrics, setMetrics] = useState<PWAMetrics>({
    cacheSize: 0,
    cachedRequests: 0,
    syncQueueSize: 0,
    installStatus: 'not-installed',
    updateStatus: 'up-to-date',
  });
  const [updateDialogOpen, setUpdateDialogOpen] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Simulate SW installation
    setTimeout(() => {
      setSwStatus({
        installed: true,
        activated: true,
        controlling: true,
        updateAvailable: false,
      });
      setMetrics(prev => ({ ...prev, installStatus: 'installed' }));
    }, 1000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const install = async (): Promise<void> => {
    setIsInstalled(true);
  };

  const update = async (): Promise<void> => {
    setMetrics(prev => ({ ...prev, updateStatus: 'updating' }));
    setTimeout(() => {
      setSwStatus(prev => ({ ...prev, updateAvailable: false }));
      setMetrics(prev => ({ ...prev, updateStatus: 'up-to-date' }));
      setUpdateDialogOpen(false);
    }, 2000);
  };

  const updateConfig = async (updates: Partial<PWAConfig>): Promise<void> => {
    setConfig(prev => ({ ...prev, ...updates }));
  };

  const formatBytes = useCallback((bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  const contextValue: PWAContextType = {
    config,
    isSupported,
    isInstalled,
    swStatus,
    isOnline,
    metrics,
    install,
    update,
    updateConfig,
    formatBytes,
  };

  if (!currentUser) {
    return (
      <div className="flex justify-center items-center min-h-96 p-6">
        <Card className="max-w-md text-center shadow-xl">
          <div className="p-8">
            <OfflineIcon className="w-16 h-16 mx-auto text-primary mb-4" />
            <h2 className="text-2xl font-bold mb-2">PWA Features</h2>
            <p className="opacity-70">Please log in to access Progressive Web App features.</p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <PWAContext.Provider value={contextValue}>
      <div className="w-full space-y-6">
        {/* PWA Header */}
        <Card className="shadow-xl border-l-4 border-primary">
          <div className="p-6">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <DeviceIcon className="w-8 h-8 text-primary" />
                <div>
                  <h2 className="text-xl font-bold">Progressive Web App</h2>
                  <p className="text-sm opacity-70">
                    {isInstalled ? 'Installed' : 'Web App'} • {isOnline ? 'Online' : 'Offline'} connection
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {metrics.syncQueueSize > 0 && (
                  <Badge variant="warning">{metrics.syncQueueSize}</Badge>
                )}
                <Badge variant={isOnline ? 'success' : 'warning'}>
                  {isOnline ? 'Online' : 'Offline'}
                </Badge>
              </div>
            </div>
          </div>
        </Card>

        {/* Network Status Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="shadow-xl">
            <div className="p-6 text-center">
              <h3 className={`text-4xl font-bold mb-2 ${isOnline ? 'text-success' : 'text-warning'}`}>
                {isOnline ? 'Online' : 'Offline'}
              </h3>
              <p className="text-sm opacity-70 mb-4">Network Status</p>
              {isOnline ? (
                <OnlineIcon className="w-8 h-8 mx-auto text-success" />
              ) : (
                <OfflineIcon className="w-8 h-8 mx-auto text-warning" />
              )}
            </div>
          </Card>

          <Card className="shadow-xl">
            <div className="p-6 text-center">
              <h3 className="text-4xl font-bold mb-2 text-info">{formatBytes(metrics.cacheSize)}</h3>
              <p className="text-sm opacity-70 mb-4">Cache Size</p>
              <StorageIcon className="w-8 h-8 mx-auto text-info" />
            </div>
          </Card>

          <Card className="shadow-xl">
            <div className="p-6 text-center">
              <h3 className="text-4xl font-bold mb-2 text-primary">{metrics.syncQueueSize}</h3>
              <p className="text-sm opacity-70 mb-4">Sync Queue</p>
              <UpdateIcon className="w-8 h-8 mx-auto text-primary" />
            </div>
          </Card>
        </div>

        {/* Installation & Updates */}
        <Card className="shadow-xl">
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Installation & Updates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Badge variant={isInstalled ? 'success' : 'neutral'}>
                  {isInstalled ? 'Installed' : 'Not Installed'}
                </Badge>
                {!isInstalled && (
                  <Button variant="primary" size="sm" onClick={install}>
                    Install App
                  </Button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant={metrics.updateStatus === 'up-to-date' ? 'success' : 'warning'}>
                  {metrics.updateStatus.replace('-', ' ').toUpperCase()}
                </Badge>
                {swStatus.updateAvailable && (
                  <Button variant="outline" size="sm" onClick={() => setUpdateDialogOpen(true)}>
                    <UpdateIcon className="w-4 h-4 mr-2" />
                    Update Now
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Service Worker Status */}
        <Card className="shadow-xl">
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">Service Worker Status</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                {swStatus.installed ? (
                  <CheckCircleIcon className="w-5 h-5 text-success" />
                ) : (
                  <WarningIcon className="w-5 h-5 text-warning" />
                )}
                <div>
                  <p className="font-bold">Installed</p>
                  <p className="text-sm opacity-70">
                    {swStatus.installed ? 'Service Worker is active' : 'Service Worker not installed'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {swStatus.activated ? (
                  <CheckCircleIcon className="w-5 h-5 text-success" />
                ) : (
                  <WarningIcon className="w-5 h-5 text-warning" />
                )}
                <div>
                  <p className="font-bold">Activated</p>
                  <p className="text-sm opacity-70">
                    {swStatus.activated ? 'Service Worker is controlling the page' : 'Service Worker not activated'}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {swStatus.controlling ? (
                  <CheckCircleIcon className="w-5 h-5 text-success" />
                ) : (
                  <WarningIcon className="w-5 h-5 text-warning" />
                )}
                <div>
                  <p className="font-bold">Controlling</p>
                  <p className="text-sm opacity-70">
                    {swStatus.controlling ? 'Service Worker is handling requests' : 'Service Worker not controlling requests'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Configuration */}
        <Card className="shadow-xl">
          <div className="p-6">
            <h3 className="text-lg font-bold mb-4">PWA Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Offline Support</span>
                  <Toggle
                    checked={config.offlineSupport}
                    onChange={(checked) => updateConfig({ offlineSupport: checked })}
                  />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Background Sync</span>
                  <Toggle
                    checked={config.backgroundSync}
                    onChange={(checked) => updateConfig({ backgroundSync: checked })}
                  />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Push Notifications</span>
                  <Toggle
                    checked={config.pushNotifications}
                    onChange={(checked) => updateConfig({ pushNotifications: checked })}
                  />
                </label>
              </div>
              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Auto Update</span>
                  <Toggle
                    checked={config.autoUpdate}
                    onChange={(checked) => updateConfig({ autoUpdate: checked })}
                  />
                </label>
              </div>
            </div>
          </div>
        </Card>

        {/* Update Dialog */}
        {updateDialogOpen && (
          <div className="modal modal-open">
            <div className="modal-box">
              <h3 className="font-bold text-lg">Update Available</h3>
              <p className="py-4">A new version of the application is available. Update now to get the latest features and improvements.</p>
              <div className="modal-action">
                <Button variant="ghost" onClick={() => setUpdateDialogOpen(false)}>
                  Later
                </Button>
                <Button variant="primary" onClick={update} disabled={metrics.updateStatus === 'updating'}>
                  {metrics.updateStatus === 'updating' ? (
                    <><Loading.Spinner size="sm" className="mr-2" /> Updating...</>
                  ) : (
                    'Update Now'
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
      {children}
    </PWAContext.Provider>
  );
};

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (context === undefined) {
    throw new Error('usePWA must be used within a PWAProvider');
  }
  return context;
};

export default PWAProvider;