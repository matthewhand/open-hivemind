import React, { useState, useEffect } from 'react';
import { SignalSlashIcon, BoltSlashIcon } from '@heroicons/react/24/outline';
import { useWebSocket } from '../contexts/WebSocketContext';

const OfflineBanner: React.FC = () => {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const { isConnected } = useWebSocket();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const showBanner = isOffline || !isConnected;

  if (!showBanner) return null;

  return (
    <div className="bg-error text-error-content px-4 py-3 relative z-[100] shadow-md flex items-center justify-center transition-all duration-300 w-full animate-in slide-in-from-top">
      <div className="flex items-center space-x-3 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
        {isOffline ? <SignalSlashIcon className="w-5 h-5 flex-shrink-0" /> : <BoltSlashIcon className="w-5 h-5 flex-shrink-0" />}
        <div className="flex-1">
          <span className="font-semibold text-sm sm:text-base">
            {isOffline ? 'You are currently offline. ' : 'Disconnected from server. '}
          </span>
          <span className="text-sm font-normal opacity-90 hidden sm:inline">
            Reconnecting automatically when connection is restored...
          </span>
        </div>
      </div>
    </div>
  );
};

export default OfflineBanner;
