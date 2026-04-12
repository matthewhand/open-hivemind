import React, { useState, useEffect, useCallback } from 'react';
import { Activity, RefreshCw, AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import PageHeader from '../components/DaisyUI/PageHeader';
import Card from '../components/DaisyUI/Card';
import Badge from '../components/DaisyUI/Badge';
import { apiService } from '../services/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Status = 'healthy' | 'degraded' | 'down';
type CircuitBreakerState = 'closed' | 'open' | 'half-open';

interface LatencyPercentiles {
  p50: number;
  p95: number;
  p99: number;
}

interface ProviderHealth {
  key: string;
  name: string;
  type: string;
  status: Status;
  latency: LatencyPercentiles;
  errorRate: number;
  uptime: number;
  lastCheck: string;
  circuitBreaker: CircuitBreakerState;
  suggestedFallback: string;
}

interface ProviderHealthData {
  llm: ProviderHealth[];
  memory: ProviderHealth[];
  message: ProviderHealth[];
  tool: ProviderHealth[];
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const REFRESH_INTERVAL_MS = 15_000;

const STATUS_CONFIG: Record<
  Status,
  {
    icon: typeof CheckCircle;
    color: string;
    bg: string;
    badge: 'success' | 'warning' | 'error';
    label: string;
  }
> = {
  healthy: {
    icon: CheckCircle,
    color: 'text-success',
    bg: 'bg-success/10',
    badge: 'success',
    label: 'Healthy',
  },
  degraded: {
    icon: AlertTriangle,
    color: 'text-warning',
    bg: 'bg-warning/10',
    badge: 'warning',
    label: 'Degraded',
  },
  down: {
    icon: XCircle,
    color: 'text-error',
    bg: 'bg-error/10',
    badge: 'error',
    label: 'Down',
  },
};

const CB_LABELS: Record<CircuitBreakerState, { label: string; badge: 'success' | 'warning' | 'error' }> = {
  closed: { label: 'Closed', badge: 'success' },
  'half-open': { label: 'Half-Open', badge: 'warning' },
  open: { label: 'Open', badge: 'error' },
};

const SECTIONS: { key: keyof ProviderHealthData; title: string }[] = [
  { key: 'llm', title: 'LLM Providers' },
  { key: 'memory', title: 'Memory Providers' },
  { key: 'message', title: 'Message Providers' },
  { key: 'tool', title: 'Tool Providers' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatLatency(ms: number): string {
  if (ms === 0) return '--';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(1)} s`;
}

function formatTimestamp(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString();
  } catch {
    return 'Unknown';
  }
}

function formatUptime(pct: number): string {
  return `${pct.toFixed(2)} %`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface ProviderCardProps {
  provider: ProviderHealth;
}

const ProviderCard: React.FC<ProviderCardProps> = ({ provider }) => {
  const statusCfg = STATUS_CONFIG[provider.status];
  const StatusIcon = statusCfg.icon;
  const cbCfg = CB_LABELS[provider.circuitBreaker];

  return (
    <div
      className={`rounded-xl border p-4 ${statusCfg.bg} border-${statusCfg.badge}/30 flex flex-col gap-3`}
    >
      {/* Header: name + status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon className={`w-4 h-4 flex-shrink-0 ${statusCfg.color}`} />
          <div className="min-w-0">
            <p className="font-semibold text-sm truncate">{provider.name}</p>
            <p className="text-xs text-base-content/50 font-mono">{provider.type}</p>
          </div>
        </div>
        <Badge variant={statusCfg.badge} size="sm">
          {statusCfg.label}
        </Badge>
      </div>

      {/* Latency */}
      <div>
        <p className="text-xs text-base-content/60 mb-1">Latency</p>
        <div className="flex gap-3 text-xs font-mono">
          <span>
            p50 <span className="text-base-content/50">{formatLatency(provider.latency.p50)}</span>
          </span>
          <span>
            p95 <span className="text-base-content/50">{formatLatency(provider.latency.p95)}</span>
          </span>
          <span>
            p99 <span className="text-base-content/50">{formatLatency(provider.latency.p99)}</span>
          </span>
        </div>
      </div>

      {/* Error rate + uptime row */}
      <div className="flex gap-4 text-xs">
        <div>
          <p className="text-base-content/60">Error rate</p>
          <p className="font-mono">{(provider.errorRate * 100).toFixed(2)} %</p>
        </div>
        <div>
          <p className="text-base-content/60">Uptime (24 h)</p>
          <p className="font-mono">{formatUptime(provider.uptime)}</p>
        </div>
      </div>

      {/* Circuit breaker */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-base-content/60">Circuit breaker</span>
        <Badge variant={cbCfg.badge} size="sm">{cbCfg.label}</Badge>
      </div>

      {/* Last check */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-base-content/60">Last check</span>
        <span className="font-mono">{formatTimestamp(provider.lastCheck)}</span>
      </div>

      {/* Fallback suggestion */}
      {provider.suggestedFallback && provider.suggestedFallback !== 'None configured' && (
        <div className="text-xs text-base-content/60 border-t border-base-content/10 pt-2">
          <span className="text-base-content/50">Fallback: </span>
          <span>{provider.suggestedFallback}</span>
        </div>
      )}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

const ProviderHealthPage: React.FC = () => {
  const [data, setData] = useState<ProviderHealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchHealth = useCallback(async () => {
    try {
      setIsRefreshing(true);
      const resp = await apiService.get<{
        success: boolean;
        data: ProviderHealthData;
      }>('/api/admin/provider-health');
      setData(resp.data);
      setLastRefresh(new Date());
      setError(null);
    } catch (err: unknown) {
      const msg =
        (err as { message?: string })?.message ?? 'Unable to fetch provider health data.';
      setError(msg);
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchHealth]);

  // Skeleton rendering
  if (loading && !data) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Provider Health"
          description="Real-time status panel for all configured providers"
          icon={Activity}
          gradient="success"
        />
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-base-200 p-4 animate-pulse">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-4 h-4 rounded bg-base-content/10" />
                <div className="h-4 w-32 rounded bg-base-content/10" />
              </div>
              <div className="h-3 w-24 rounded bg-base-content/10 mb-2" />
              <div className="h-3 w-40 rounded bg-base-content/10 mb-2" />
              <div className="h-3 w-20 rounded bg-base-content/10" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Provider Health"
        description="Real-time status panel for all configured providers"
        icon={Activity}
        gradient="success"
      />

      {/* Controls bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-base-content/60">
          <Activity className="w-4 h-4" />
          <span>
            {data
              ? Object.values(data).flat().length
              : 0}{' '}
            providers monitored
          </span>
        </div>
        <div className="flex items-center gap-3">
          {lastRefresh && (
            <span className="text-xs text-base-content/50">
              Last updated: {lastRefresh.toLocaleTimeString()}
            </span>
          )}
          <button
            className="btn btn-ghost btn-sm gap-1"
            onClick={fetchHealth}
            disabled={isRefreshing}
            aria-label="Refresh provider health data"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="alert alert-error shadow-lg">
          <AlertTriangle className="w-5 h-5" />
          <span>{error}</span>
          <button className="btn btn-sm btn-ghost" onClick={fetchHealth}>
            Retry
          </button>
        </div>
      )}

      {/* Provider sections */}
      {SECTIONS.map((section) => {
        const providers = data?.[section.key] ?? [];
        if (providers.length === 0) return null;

        const healthyCount = providers.filter((p) => p.status === 'healthy').length;
        const hasIssues = healthyCount < providers.length;

        return (
          <div key={section.key}>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-bold">{section.title}</h2>
              {hasIssues && (
                <Badge variant="warning" size="sm">
                  {providers.length - healthyCount} issue{providers.length - healthyCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {providers.map((p) => (
                <ProviderCard key={p.key} provider={p} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ProviderHealthPage;
