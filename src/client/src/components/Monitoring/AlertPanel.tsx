/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  Bell,
  AlertTriangle,
  Info,
  CheckCircle,
  XCircle,
  Check,
  CheckCheck,
  X,
  Search,
  Clock
} from 'lucide-react';
import { Badge, Button, Input } from '../DaisyUI';

export interface Alert {
  id: string;
  type: 'info' | 'warning' | 'error' | 'success';
  title: string;
  message: string;
  timestamp: string;
  source: string;
  acknowledged?: boolean;
  resolved?: boolean;
  metadata?: Record<string, any>;
}

export interface AlertPanelProps {
  alerts?: Alert[];
  onAcknowledge?: (alertId: string) => void;
  onResolve?: (alertId: string) => void;
  onDismiss?: (alertId: string) => void;
  showFilters?: boolean;
  maxAlerts?: number;
  className?: string;
}

const AlertPanel: React.FC<AlertPanelProps> = ({
  alerts: propAlerts,
  onAcknowledge,
  onResolve,
  onDismiss,
  showFilters = true,
  maxAlerts = 50,
  className = '',
}) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Process prop alerts
  useEffect(() => {
    const allAlerts = [...(propAlerts || [])];

    const sortedAlerts = [...allAlerts].sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
    ).slice(0, maxAlerts);

    setAlerts(sortedAlerts);
  }, [propAlerts, maxAlerts]);

  const filteredAlerts = alerts.filter(alert => {
    const matchesFilter = filter === 'all' || alert.type === filter;
    const matchesSearch = !searchTerm ||
      alert.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
      alert.source.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  const handleAcknowledge = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, acknowledged: true } : alert,
    ));
    onAcknowledge?.(alertId);
  };

  const handleResolve = (alertId: string) => {
    setAlerts(prev => prev.map(alert =>
      alert.id === alertId ? { ...alert, resolved: true } : alert,
    ));
    onResolve?.(alertId);
  };

  const handleDismiss = (alertId: string) => {
    setAlerts(prev => prev.filter(alert => alert.id !== alertId));
    onDismiss?.(alertId);
  };

  const getAlertCountByType = (type: Alert['type']) => {
    return alerts.filter(alert => alert.type === type && !alert.resolved).length;
  };

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'error':
        return <XCircle className="w-6 h-6 text-error" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-warning" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 text-success" />;
      default:
        return <Info className="w-6 h-6 text-info" />;
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) { return 'Just now'; }
    if (diff < 3600000) { return `${Math.floor(diff / 60000)}m ago`; }
    if (diff < 86400000) { return `${Math.floor(diff / 3600000)}h ago`; }
    return date.toLocaleDateString();
  };

  return (
    <div className={`card bg-base-100 shadow-xl border border-base-200 ${className}`}>
      <div className="card-body">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-3">
             <Bell className="w-6 h-6" />
             <h2 className="card-title">Alerts & Notifications</h2>
          </div>
          <div className="flex gap-2">
            <Badge variant="error" size="sm" className="gap-1">
              {getAlertCountByType('error')} Errors
            </Badge>
            <Badge variant="warning" size="sm" className="gap-1">
              {getAlertCountByType('warning')} Warnings
            </Badge>
            <Badge variant="info" size="sm" className="gap-1">
              {getAlertCountByType('info')} Info
            </Badge>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex gap-2 flex-wrap">
              <Button
                size="sm"
                variant={filter === 'all' ? 'primary' : 'ghost'}
                onClick={() => setFilter('all')}
              >
                All ({alerts.filter(a => !a.resolved).length})
              </Button>
              <Button
                size="sm"
                variant={filter === 'error' ? 'error' : 'ghost'}
                onClick={() => setFilter('error')}
                className={filter !== 'error' ? 'text-error' : ''}
              >
                Errors ({getAlertCountByType('error')})
              </Button>
              <Button
                size="sm"
                variant={filter === 'warning' ? 'warning' : 'ghost'}
                onClick={() => setFilter('warning')}
                className={filter !== 'warning' ? 'text-warning' : ''}
              >
                Warnings ({getAlertCountByType('warning')})
              </Button>
              <Button
                size="sm"
                variant={filter === 'info' ? 'info' : 'ghost'}
                onClick={() => setFilter('info')}
                className={filter !== 'info' ? 'text-info' : ''}
              >
                Info ({getAlertCountByType('info')})
              </Button>
            </div>

            <div className="form-control flex-1">
              <Input
                type="text"
                placeholder="Search alerts..."
                className="input-sm w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                prefix={<Search className="w-4 h-4 opacity-50"/>}
              />
            </div>
          </div>
        )}

        <div className="space-y-3 max-h-96 overflow-y-auto pr-2 custom-scrollbar">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12 text-neutral-content/50 border-2 border-dashed border-base-200 rounded-xl">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No alerts found</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert ${alert.resolved ? 'bg-base-200/50' : `alert-${alert.type}`} ${alert.acknowledged && !alert.resolved ? 'opacity-75' : ''
                  } transition-all duration-200 hover:shadow-md border border-transparent hover:border-base-300`}
              >
                {getAlertIcon(alert.type)}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm sm:text-base truncate pr-2">{alert.title}</h4>
                      <p className="text-sm opacity-90 break-words">{alert.message}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        <span className="badge badge-ghost badge-xs opacity-70">{alert.source}</span>
                        <span className="text-xs opacity-50">•</span>
                        <span className="text-xs opacity-70 flex items-center gap-1">
                            <Clock className="w-3 h-3"/> {formatTimestamp(alert.timestamp)}
                        </span>
                        {alert.acknowledged && (
                          <Badge variant="success" size="xs">Acknowledged</Badge>
                        )}
                        {alert.resolved && (
                          <Badge variant="success" size="xs">Resolved</Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {!alert.acknowledged && !alert.resolved && (
                        <button
                          className="btn btn-xs btn-circle btn-ghost tooltip tooltip-left"
                          data-tip="Acknowledge"
                          onClick={() => handleAcknowledge(alert.id)}
                          aria-label="Acknowledge"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {!alert.resolved && (
                        <button
                          className="btn btn-xs btn-circle btn-ghost tooltip tooltip-left"
                          data-tip="Resolve"
                          onClick={() => handleResolve(alert.id)}
                          aria-label="Resolve"
                        >
                          <CheckCheck className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        className="btn btn-xs btn-circle btn-ghost tooltip tooltip-left"
                        data-tip="Dismiss"
                        onClick={() => handleDismiss(alert.id)}
                        aria-label="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {alerts.length > 0 && (
          <div className="mt-4 pt-4 border-t border-base-200 flex justify-between items-center">
            <span className="text-xs text-neutral-content/70">
              Showing {filteredAlerts.length} of {alerts.length} alerts
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                alerts.forEach(alert => {
                  if (!alert.acknowledged && !alert.resolved) {
                    handleAcknowledge(alert.id);
                  }
                });
              }}
              disabled={alerts.every(a => a.acknowledged || a.resolved)}
            >
              Acknowledge All
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertPanel;
