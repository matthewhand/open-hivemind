/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import Card from '../DaisyUI/Card';
import Badge from '../DaisyUI/Badge';
import { Alert } from '../DaisyUI/Alert';
import { SkeletonList } from '../DaisyUI/Skeleton';
import {
  CheckCircle,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Activity,
} from 'lucide-react';
import { apiService } from '../../services/api';

interface ServiceStatus {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  latencyMs: number;
  lastChecked: string;
  details: string;
}

interface HealthCheckWidgetProps {
  /** Auto-refresh interval in milliseconds (default: 30000) */
  refreshInterval?: number;
  /** Show compact view (for embedding in other pages) */
  compact?: boolean;
}

const STATUS_CONFIG = {
  healthy: {
    icon: CheckCircle,
    color: 'text-success',
    bg: 'bg-success/10',
    border: 'border-success/30',
    badge: 'success' as const,
    label: 'Healthy',
  },
  degraded: {
    icon: AlertTriangle,
    color: 'text-warning',
    bg: 'bg-warning/10',
    border: 'border-warning/30',
    badge: 'warning' as const,
    label: 'Degraded',
  },
  down: {
    icon: XCircle,
    color: 'text-error',
    bg: 'bg-error/10',
    border: 'border-error/30',
    badge: 'error' as const,
    label: 'Down',
  },
};

const HealthCheckWidget: React.FC<HealthCheckWidgetProps> = ({
  refreshInterval = 30000,
  compact = false,
}) => {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const data = await apiService.getServiceHealth();
      setServices(data.services || []);
      setLastRefresh(new Date());
      setError(null);
    } catch (err: any) {
      if (err.status === 401 || err.status === 403) {
        setError('Authentication required to view service health.');
      } else {
        setError('Unable to fetch service health data.');
      }
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();

    if (refreshInterval > 0) {
      const interval = setInterval(fetchHealth, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchHealth, refreshInterval]);

  const healthyCount = services.filter((s) => s.status === 'healthy').length;
  const totalCount = services.length;

  const overallStatus: 'healthy' | 'degraded' | 'down' =
    totalCount === 0
      ? 'down'
      : healthyCount === totalCount
        ? 'healthy'
        : healthyCount > 0
          ? 'degraded'
          : 'down';

  const toggleExpand = (name: string) => {
    setExpandedService((prev) => (prev === name ? null : name));
  };

  const formatLatency = (ms: number) => {
    if (ms < 1) return '<1ms';
    if (ms < 1000) return `${Math.round(ms)}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const formatTime = (isoString: string) => {
    try {
      return new Date(isoString).toLocaleTimeString();
    } catch {
      return 'Unknown';
    }
  };

  if (loading && services.length === 0) {
    return (
      <Card>
        <Card.Body>
          <div className="py-4 px-2">
            <SkeletonList items={4} />
          </div>
        </Card.Body>
      </Card>
    );
  }

  if (error && services.length === 0) {
    return <Alert status="error" message={error} />;
  }

  const summaryConfig = STATUS_CONFIG[overallStatus];
  const SummaryIcon = summaryConfig.icon;

  return (
    <Card className="shadow-sm border border-base-200">
      <Card.Body>
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-lg">Service Health</h3>
          </div>
          <div className="flex items-center gap-2">
            {lastRefresh && !compact && (
              <span className="text-xs text-base-content/50">
                {lastRefresh.toLocaleTimeString()}
              </span>
            )}
            <button
              className="btn btn-ghost btn-xs btn-circle"
              onClick={fetchHealth}
              disabled={isRefreshing}
              title="Refresh now"
              aria-label="Refresh service health"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Overall Summary */}
        <div
          className={`flex items-center gap-3 p-3 rounded-lg mb-4 ${summaryConfig.bg} border ${summaryConfig.border}`}
        >
          <SummaryIcon className={`w-5 h-5 ${summaryConfig.color}`} />
          <div className="flex-1">
            <span className="font-medium text-sm">
              {healthyCount}/{totalCount} services healthy
            </span>
          </div>
          <Badge variant={summaryConfig.badge} size="sm">
            {summaryConfig.label}
          </Badge>
        </div>

        {/* Service Cards Grid */}
        <div className={compact ? 'space-y-2' : 'grid grid-cols-1 md:grid-cols-2 gap-3'}>
          {services.map((service) => {
            const config = STATUS_CONFIG[service.status];
            const StatusIcon = config.icon;
            const isExpanded = expandedService === service.name;

            return (
              <div
                key={service.name}
                className={`rounded-lg border ${config.border} ${config.bg} transition-all`}
              >
                <button
                  className="w-full p-3 flex items-center gap-3 text-left cursor-pointer"
                  onClick={() => toggleExpand(service.name)}
                  aria-expanded={isExpanded}
                  aria-controls={`service-details-${service.name.replace(/\s+/g, '-').toLowerCase()}`}
                  aria-label={`${isExpanded ? 'Collapse' : 'Expand'} details for ${service.name}`}
                >
                  <StatusIcon className={`w-4 h-4 flex-shrink-0 ${config.color}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm truncate">{service.name}</span>
                      <Badge variant={config.badge} size="sm">
                        {config.label}
                      </Badge>
                    </div>
                    <div className="text-xs text-base-content/50 mt-0.5">
                      {formatLatency(service.latencyMs)} latency
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="w-4 h-4 text-base-content/40" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-base-content/40" />
                  )}
                </button>

                {isExpanded && (
                  <div
                    id={`service-details-${service.name.replace(/\s+/g, '-').toLowerCase()}`}
                    className="px-3 pb-3 pt-0 border-t border-base-200/50"
                  >
                    <div className="text-xs space-y-1 mt-2">
                      <div className="flex justify-between">
                        <span className="text-base-content/60">Details:</span>
                        <span className="font-mono">{service.details}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-base-content/60">Latency:</span>
                        <span className="font-mono">{formatLatency(service.latencyMs)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-base-content/60">Last checked:</span>
                        <span className="font-mono">{formatTime(service.lastChecked)}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Card.Body>
    </Card>
  );
};

export default HealthCheckWidget;
