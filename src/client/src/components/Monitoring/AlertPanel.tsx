/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle,
  Info,
  XCircle,
  Check,
  CheckCheck,
  X,
  Bell
} from 'lucide-react';

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
        return <XCircle className="w-6 h-6 shrink-0 text-current" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 shrink-0 text-current" />;
      case 'success':
        return <CheckCircle className="w-6 h-6 shrink-0 text-current" />;
      default:
        return <Info className="w-6 h-6 shrink-0 text-current" />;
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
          <h2 className="card-title flex items-center gap-2">
            <Bell className="w-5 h-5" /> Alerts & Notifications
          </h2>
          <div className="flex gap-2">
            <div className="badge badge-error gap-2">
              {getAlertCountByType('error')} Errors
            </div>
            <div className="badge badge-warning gap-2">
              {getAlertCountByType('warning')} Warnings
            </div>
            <div className="badge badge-info gap-2">
              {getAlertCountByType('info')} Info
            </div>
          </div>
        </div>

        {showFilters && (
          <div className="flex flex-col sm:flex-row gap-4 mb-6 justify-between">
            <div className="join">
              <button
                className={`join-item btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter('all')}
              >
                All ({alerts.filter(a => !a.resolved).length})
              </button>
              <button
                className={`join-item btn btn-sm ${filter === 'error' ? 'btn-error' : 'btn-ghost'}`}
                onClick={() => setFilter('error')}
              >
                Errors ({getAlertCountByType('error')})
              </button>
              <button
                className={`join-item btn btn-sm ${filter === 'warning' ? 'btn-warning' : 'btn-ghost'}`}
                onClick={() => setFilter('warning')}
              >
                Warnings ({getAlertCountByType('warning')})
              </button>
              <button
                className={`join-item btn btn-sm ${filter === 'info' ? 'btn-info' : 'btn-ghost'}`}
                onClick={() => setFilter('info')}
              >
                Info ({getAlertCountByType('info')})
              </button>
            </div>

            <div className="form-control">
              <input
                type="text"
                placeholder="Search alerts..."
                className="input input-bordered input-sm w-full"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        )}

        <div className="space-y-3 max-h-96 overflow-y-auto">
          {filteredAlerts.length === 0 ? (
            <div className="text-center py-12 text-neutral-content/50 bg-base-200/50 rounded-box">
              <Bell className="w-12 h-12 mx-auto mb-2 opacity-20" />
              <p>No alerts found matching criteria</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert ${alert.resolved ? 'alert-success' : `alert-${alert.type}`} ${alert.acknowledged && !alert.resolved ? 'opacity-75' : ''
                  }`}
              >
                {getAlertIcon(alert.type)}
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-semibold">{alert.title}</h4>
                      <p className="text-sm opacity-90">{alert.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs opacity-70">{alert.source}</span>
                        <span className="text-xs opacity-70">•</span>
                        <span className="text-xs opacity-70">{formatTimestamp(alert.timestamp)}</span>
                        {alert.acknowledged && (
                          <span className="badge badge-success badge-xs">Acknowledged</span>
                        )}
                        {alert.resolved && (
                          <span className="badge badge-success badge-xs">Resolved</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1">
                      {!alert.acknowledged && !alert.resolved && (
                        <button
                          className="btn btn-xs btn-ghost btn-square"
                          onClick={() => handleAcknowledge(alert.id)}
                          title="Acknowledge"
                        >
                          <Check className="w-4 h-4" />
                        </button>
                      )}
                      {!alert.resolved && (
                        <button
                          className="btn btn-xs btn-ghost btn-square"
                          onClick={() => handleResolve(alert.id)}
                          title="Resolve"
                        >
                          <CheckCheck className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        className="btn btn-xs btn-ghost btn-square"
                        onClick={() => handleDismiss(alert.id)}
                        title="Dismiss"
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
          <div className="mt-4 flex justify-between items-center">
            <span className="text-sm text-neutral-content/70">
              Showing {filteredAlerts.length} of {alerts.length} alerts
            </span>
            <button
              className="btn btn-sm btn-ghost"
              onClick={() => {
                alerts.forEach(alert => {
                  if (!alert.acknowledged && !alert.resolved) {
                    handleAcknowledge(alert.id);
                  }
                });
              }}
            >
              Acknowledge All
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertPanel;
