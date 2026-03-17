/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-refresh/only-export-components, no-empty, no-case-declarations */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAppSelector } from '../store/hooks';
import { selectUser } from '../store/slices/authSlice';
import { Card, Badge, Button, LoadingSpinner, Toggle } from '../components/DaisyUI';
import {
  DevicePhoneMobileIcon,
  SignalIcon,
  SignalSlashIcon,
  ArrowPathIcon,
  CheckCircleIcon,
  XCircleIcon,
} from '@heroicons/react/24/outline';

interface PWAContextType {
  isInstallable: boolean;
  isOnline: boolean;
  isUpdateAvailable: boolean;
  installPWA: () => Promise<void>;
  updatePWA: () => Promise<void>;
  checkForUpdates: () => Promise<void>;
  settings: PWASettings;
  updateSettings: (settings: Partial<PWASettings>) => void;
}

interface PWASettings {
  enablePushNotifications: boolean;
  enableBackgroundSync: boolean;
  enableOfflineMode: boolean;
  cacheStrategy: 'network-first' | 'cache-first' | 'stale-while-revalidate';
}

const defaultSettings: PWASettings = {
  enablePushNotifications: false,
  enableBackgroundSync: true,
  enableOfflineMode: true,
  cacheStrategy: 'network-first',
};

const PWAContext = createContext<PWAContextType | undefined>(undefined);

export const PWAProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const user = useAppSelector(selectUser);
  const [isInstallable, setIsInstallable] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);
  const [settings, setSettings] = useState<PWASettings>(defaultSettings);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const installPWA = async () => {
    if (!deferredPrompt) {return;}

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setIsInstallable(false);
    }
  };

  const updatePWA = async () => {
    setLoading(true);
    // Mock update process
    await new Promise(resolve => setTimeout(resolve, 1500));
    setIsUpdateAvailable(false);
    setLoading(false);
    window.location.reload();
  };

  const checkForUpdates = async () => {
    setLoading(true);
    // Mock check for updates
    await new Promise(resolve => setTimeout(resolve, 1000));
    // Randomly find an update for demo purposes
    setIsUpdateAvailable(Math.random() > 0.7);
    setLoading(false);
  };

  const updateSettings = (newSettings: Partial<PWASettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  };

  // Only show PWA debug/control panel if user is logged in (or for dev purposes)
  const showPanel = !!user;

  return (
    <PWAContext.Provider
      value={{
        isInstallable,
        isOnline,
        isUpdateAvailable,
        installPWA,
        updatePWA,
        checkForUpdates,
        settings,
        updateSettings,
      }}
    >
      {children}

      {/* PWA Status Indicator / Dev Panel */}
      {showPanel && (
        <div className="fixed bottom-4 right-4 z-50">
          {!isOnline && (
            <div className="mb-2">
              <Badge variant="error" size="lg" className="gap-2 shadow-lg">
                <SignalSlashIcon className="w-4 h-4" />
                Offline Mode
              </Badge>
            </div>
          )}

          {isUpdateAvailable && (
            <div className="mb-2">
              <Card className="w-64 shadow-xl bg-base-100 border border-primary">
                <div className="p-4">
                  <h3 className="font-bold text-sm mb-2">Update Available</h3>
                  <p className="text-xs mb-3 opacity-70">A new version of the app is available.</p>
                  <Button
                    size="sm"
                    variant="primary"
                    fullWidth
                    onClick={updatePWA}
                    disabled={loading}
                  >
                    {loading ? <LoadingSpinner size="xs" /> : 'Update Now'}
                  </Button>
                </div>
              </Card>
            </div>
          )}
        </div>
      )}
    </PWAContext.Provider>
  );
};

export const usePWA = () => {
  const context = useContext(PWAContext);
  if (!context) {throw new Error('usePWA must be used within PWAProvider');}
  return context;
};

export default PWAProvider;