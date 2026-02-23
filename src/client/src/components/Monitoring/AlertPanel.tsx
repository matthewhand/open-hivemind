/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';

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

  // Update internal state when props change
  useEffect(() => {
    const sortedAlerts = (propAlerts || []).sort((a, b) =>
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
      return (
        <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'warning':
      return (
        <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    case 'success':
      return (
        <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
        <svg className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();

    if (diff < 60000) {return 'Just now';}
    if (diff < 3600000) {return `${Math.floor(diff / 60000)}m ago`;}
    if (diff < 86400000) {return `${Math.floor(diff / 3600000)}h ago`;}
    return date.toLocaleDateString();
  };

  return (
    <div className={`card bg-base-100 shadow-xl ${className}`}>
      <div className="card-body">
        <div className="flex justify-between items-center mb-6">
          <h2 className="card-title">Alerts & Notifications</h2>
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
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex gap-2">
              <button
                className={`btn btn-sm ${filter === 'all' ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => setFilter('all')}
              >
                All ({alerts.filter(a => !a.resolved).length})
              </button>
              <button
                className={`btn btn-sm ${filter === 'error' ? 'btn-error' : 'btn-ghost'}`}
                onClick={() => setFilter('error')}
              >
                Errors ({getAlertCountByType('error')})
              </button>
              <button
                className={`btn btn-sm ${filter === 'warning' ? 'btn-warning' : 'btn-ghost'}`}
                onClick={() => setFilter('warning')}
              >
                Warnings ({getAlertCountByType('warning')})
              </button>
              <button
                className={`btn btn-sm ${filter === 'info' ? 'btn-info' : 'btn-ghost'}`}
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
            <div className="text-center py-8 text-neutral-content/50">
              <div className="text-4xl mb-2">🔔</div>
              <p>No alerts found</p>
            </div>
          ) : (
            filteredAlerts.map((alert) => (
              <div
                key={alert.id}
                className={`alert ${alert.resolved ? 'alert-success' : `alert-${alert.type}`} ${
                  alert.acknowledged && !alert.resolved ? 'opacity-75' : ''
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
                          className="btn btn-xs btn-ghost"
                          onClick={() => handleAcknowledge(alert.id)}
                          title="Acknowledge"
                        >
                          ✓
                        </button>
                      )}
                      {!alert.resolved && (
                        <button
                          className="btn btn-xs btn-ghost"
                          onClick={() => handleResolve(alert.id)}
                          title="Resolve"
                        >
                          ✓✓
                        </button>
                      )}
                      <button
                        className="btn btn-xs btn-ghost"
                        onClick={() => handleDismiss(alert.id)}
                        title="Dismiss"
                      >
                        ×
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
