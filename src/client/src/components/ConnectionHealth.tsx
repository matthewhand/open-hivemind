import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, Clock, Activity, Loader2 } from 'lucide-react';

export type ConnectionStatus = 'online' | 'offline' | 'connecting';

export interface ConnectionHealthProps {
  lastConnected?: Date | string | null;
  status: ConnectionStatus;
  messageCount?: number;
  className?: string;
  enablePolling?: boolean;
  pollInterval?: number;
  onHealthCheck?: () => Promise<{ status: ConnectionStatus; lastConnected?: Date }>;
}

/**
 * ConnectionHealth component displays live connection status indicators
 * Shows connection state, last connected time, and optional message activity
 */
export const ConnectionHealth: React.FC<ConnectionHealthProps> = ({
  lastConnected,
  status: initialStatus,
  messageCount,
  className = '',
  enablePolling = false,
  pollInterval = 30000,
  onHealthCheck,
}) => {
  const [status, setStatus] = useState<ConnectionStatus>(initialStatus);
  const [lastConnectedTime, setLastConnectedTime] = useState(lastConnected);

  useEffect(() => {
    if (!enablePolling || !onHealthCheck) return;

    const pollHealth = async () => {
      try {
        const result = await onHealthCheck();
        setStatus(result.status);
        if (result.lastConnected) {
          setLastConnectedTime(result.lastConnected);
        }
      } catch (error) {
        setStatus('offline');
      }
    };

    const interval = setInterval(pollHealth, pollInterval);
    return () => clearInterval(interval);
  }, [enablePolling, pollInterval, onHealthCheck]);

  const formatRelativeTime = (date: Date | string | null | undefined): string => {
    if (!date) return 'Never';

    const now = new Date();
    const then = new Date(date);
    const seconds = Math.floor((now.getTime() - then.getTime()) / 1000);

    if (seconds < 30) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  const getStatusBadge = () => {
    switch (status) {
      case 'online':
        return 'badge-success';
      case 'offline':
        return 'badge-error';
      case 'connecting':
        return 'badge-warning';
    }
  };

  const getStatusIcon = () => {
    switch (status) {
      case 'online':
        return <Wifi className="h-4 w-4" />;
      case 'offline':
        return <WifiOff className="h-4 w-4" />;
      case 'connecting':
        return <Loader2 className="h-4 w-4 animate-spin" />;
    }
  };

  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <div className={`badge ${getStatusBadge()} gap-1`} aria-label={`Connection status: ${status}`}>
        {getStatusIcon()}
        <span className="capitalize">{status}</span>
      </div>

      {lastConnectedTime && (
        <div className="flex items-center gap-1 text-sm text-base-content/75">
          <Clock className="h-3 w-3" />
          <span>{formatRelativeTime(lastConnectedTime)}</span>
        </div>
      )}

      {messageCount !== undefined && messageCount > 0 && (
        <div className="flex items-center gap-1 text-sm text-base-content/75" aria-label={`${messageCount} messages`}>
          <Activity className="h-3 w-3" />
          <span>{messageCount}</span>
        </div>
      )}
    </div>
  );
};

export default ConnectionHealth;
