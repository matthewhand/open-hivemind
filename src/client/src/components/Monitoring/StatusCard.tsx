import React, { useState, useEffect } from 'react';

export interface StatusMetric {
  label: string;
  value: string | number;
  unit?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  status?: 'healthy' | 'warning' | 'error' | 'unknown';
  icon?: string;
}

export interface StatusCardProps {
  title: string;
  subtitle?: string;
  metrics: StatusMetric[];
  status?: 'healthy' | 'warning' | 'error' | 'unknown';
  refreshInterval?: number;
  onRefresh?: () => void;
  isLoading?: boolean;
  className?: string;
  compact?: boolean;
}

const StatusCard: React.FC<StatusCardProps> = ({
  title,
  subtitle,
  metrics,
  status = 'unknown',
  refreshInterval,
  onRefresh,
  isLoading = false,
  className = '',
  compact = false,
}) => {
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  useEffect(() => {
    if (refreshInterval && onRefresh) {
      const interval = setInterval(() => {
        onRefresh();
        setLastRefresh(new Date());
      }, refreshInterval);

      return () => clearInterval(interval);
    }
  }, [refreshInterval, onRefresh]);

  const getStatusColor = (status: string) => {
    switch (status) {
    case 'healthy': return 'text-success';
    case 'warning': return 'text-warning';
    case 'error': return 'text-error';
    default: return 'text-neutral';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
    case 'healthy': return 'bg-success/10 border-success/20';
    case 'warning': return 'bg-warning/10 border-warning/20';
    case 'error': return 'bg-error/10 border-error/20';
    default: return 'bg-neutral/10 border-neutral/20';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
    case 'healthy':
      return (
        <svg className="w-6 h-6 text-success" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    case 'warning':
      return (
        <svg className="w-6 h-6 text-warning" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      );
    case 'error':
      return (
        <svg className="w-6 h-6 text-error" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    default:
      return (
        <svg className="w-6 h-6 text-neutral" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      );
    }
  };

  const getTrendIcon = (trend?: 'up' | 'down' | 'stable') => {
    switch (trend) {
    case 'up':
      return <span className="text-success text-sm">↑</span>;
    case 'down':
      return <span className="text-error text-sm">↓</span>;
    default:
      return <span className="text-neutral text-sm">→</span>;
    }
  };

  const cardClass = compact
    ? `card bg-base-100 shadow-lg border ${getStatusBgColor(status)} ${className}`
    : `card bg-base-100 shadow-xl ${className}`;

  return (
    <div className={cardClass}>
      <div className={`card-body ${compact ? 'p-4' : 'p-6'}`}>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-3">
            {getStatusIcon(status)}
            <div>
              <h2 className={`card-title ${compact ? 'text-lg' : 'text-xl'}`}>{title}</h2>
              {subtitle && (
                <p className="text-sm text-neutral-content/70">{subtitle}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isLoading && (
              <div className="loading loading-spinner loading-sm"></div>
            )}
            <div className={`badge ${getStatusColor(status)} badge-outline`}>
              {status}
            </div>
          </div>
        </div>

        <div className={compact ? 'space-y-2' : 'space-y-4'}>
          {metrics.map((metric, index) => (
            <div key={index} className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                {metric.icon && <span className="text-lg">{metric.icon}</span>}
                <span className="text-sm text-neutral-content/80">{metric.label}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className={`font-semibold ${compact ? 'text-base' : 'text-lg'}`}>
                  {metric.value}
                </span>
                {metric.unit && (
                  <span className="text-xs text-neutral-content/70">{metric.unit}</span>
                )}
                {metric.trend && (
                  <div className="flex items-center gap-1">
                    {getTrendIcon(metric.trend)}
                    {metric.trendValue !== undefined && (
                      <span className={`text-xs ${
                        metric.trend === 'up' ? 'text-success' :
                          metric.trend === 'down' ? 'text-error' : 'text-neutral'
                      }`}>
                        {metric.trendValue > 0 ? '+' : ''}{metric.trendValue}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {!compact && refreshInterval && (
          <div className="mt-4 pt-4 border-t border-base-300">
            <div className="flex justify-between items-center text-xs text-neutral-content/50">
              <span>Auto-refresh: {refreshInterval / 1000}s</span>
              <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusCard;