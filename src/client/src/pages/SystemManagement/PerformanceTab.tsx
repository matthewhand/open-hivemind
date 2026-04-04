
import React, { useState, useEffect, useCallback } from 'react';
import { apiService } from '../../services/api';
import { useErrorToast } from '../../components/DaisyUI/ToastNotification';
import DataTable from '../../components/DaisyUI/DataTable';
import Divider from '../../components/DaisyUI/Divider';
import { Stat, Stats } from '../../components/DaisyUI/Stat';
import { LoadingSpinner } from '../../components/DaisyUI/Loading';
import Card from '../../components/DaisyUI/Card';

interface PerformanceTabProps {
  onClearCache: () => void;
}

const PerformanceTab: React.FC<PerformanceTabProps> = ({ onClearCache }) => {
  const errorToast = useErrorToast();

  const [apiStatus, setApiStatus] = useState<any>(null);
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [envOverrides, setEnvOverrides] = useState<Record<string, string> | null>(null);
  const [isPerformanceLoading, setIsPerformanceLoading] = useState(false);

  const fetchApiStatus = useCallback(async () => {
    try {
      const status = await apiService.getApiEndpointsStatus();
      setApiStatus(status);
    } catch (_error) {
      errorToast('API Status', 'Failed to fetch API status');
    }
  }, []);

  const fetchPerformanceData = useCallback(async () => {
    setIsPerformanceLoading(true);
    try {
      const [infoResult, overridesResult] = await Promise.allSettled([
        apiService.getSystemInfo(),
        apiService.getEnvOverrides()
      ]);
      const info = infoResult.status === 'fulfilled' ? infoResult.value : { systemInfo: {} };
      const overrides = overridesResult.status === 'fulfilled' ? overridesResult.value : { data: { envVars: {} } };
      setSystemInfo(info.systemInfo);
      setEnvOverrides(overrides.data?.envVars || overrides.envVars);
    } catch (_error) {
      errorToast('Performance Data', 'Failed to fetch performance metrics');
    } finally {
      setIsPerformanceLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchApiStatus();
    fetchPerformanceData();
    const interval = setInterval(fetchApiStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchApiStatus, fetchPerformanceData]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-xl font-semibold">System Performance & Monitoring</h3>
        <button
          className="btn btn-warning btn-sm"
          onClick={onClearCache}
        >
          Clear System Cache
        </button>
      </div>

      {apiStatus && (
        <Stats className="shadow w-full">
          <Stat
            title="Overall Status"
            value={apiStatus.overall.status.toUpperCase()}
            valueClassName={apiStatus.overall.status === 'healthy' ? 'text-success' : 'text-error'}
            description={apiStatus.overall.message}
          />
          <Stat title="Online Endpoints" value={apiStatus.overall.stats.online} description={`/ ${apiStatus.overall.stats.total} total`} />
          <Stat title="Error Rate" value={apiStatus.overall.stats.error} valueClassName="text-error" description="endpoints reporting errors" />
        </Stats>
      )}

      <div className="flex justify-between items-center mt-8">
        <h3 className="text-xl font-semibold">Performance Tuning & System Info</h3>
        <button
          className="btn btn-sm btn-ghost"
          onClick={fetchPerformanceData}
          disabled={isPerformanceLoading}
        >
          {isPerformanceLoading ? <LoadingSpinner size="xs" /> : '🔄 Refresh'}
        </button>
      </div>

      {systemInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card bgVariant="ghost" className="bg-base-200" compact>
            <h4 className="font-bold mb-2">System Information</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="opacity-70">Platform:</span>
                <span className="font-mono">{systemInfo.platform} ({systemInfo.arch})</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Node Version:</span>
                <span className="font-mono">{systemInfo.nodeVersion}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Uptime:</span>
                <span className="font-mono">{Math.floor(systemInfo.uptime / 60)} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Process ID:</span>
                <span className="font-mono">{systemInfo.pid}</span>
              </div>
              <div className="flex justify-between">
                <span className="opacity-70">Memory Usage:</span>
                <span className="font-mono">
                  {Math.round(systemInfo.memory.rss / 1024 / 1024)} MB (RSS)
                </span>
              </div>
            </div>
          </Card>

          <Card bgVariant="ghost" className="bg-base-200" compact>
            <h4 className="font-bold mb-2">Database Status</h4>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="opacity-70">Connected:</span>
                <span className={systemInfo.database.connected ? 'text-success' : 'text-error'}>
                  {systemInfo.database.connected ? 'Yes' : 'No'}
                </span>
              </div>
              {systemInfo.database.stats && (
                <>
                  <div className="flex justify-between">
                    <span className="opacity-70">Pool Size:</span>
                    <span className="font-mono">{systemInfo.database.stats.poolSize || 'N/A'}</span>
                  </div>
                </>
              )}
            </div>
          </Card>
        </div>
      )}

      <Card bgVariant="ghost" className="bg-base-200" compact title="API Endpoints Status">
          <DataTable
            data={apiStatus?.endpoints || []}
            columns={[
              {
                key: 'name' as any,
                title: 'Endpoint',
                prominent: true,
                render: (_v: any, row: any) => (
                  <div>
                    <div className="font-bold">{row.name}</div>
                    <div className="text-xs opacity-50">{row.url}</div>
                  </div>
                ),
              },
              {
                key: 'status' as any,
                title: 'Status',
                render: (value: string) => (
                  <div className={`badge ${
                    value === 'online' ? 'badge-success' :
                    value === 'slow' ? 'badge-warning' : 'badge-error'
                  }`}>{value}</div>
                ),
              },
              {
                key: 'responseTime' as any,
                title: 'Response Time',
                render: (value: number) => `${value}ms`,
              },
              { key: 'consecutiveFailures' as any, title: 'Failures' },
              {
                key: 'lastChecked' as any,
                title: 'Last Checked',
                render: (value: string) => new Date(value).toLocaleTimeString(),
              },
            ]}
            rowKey={(row: any) => row.id}
            emptyState={<div className="text-center py-4 opacity-50">No endpoint data available</div>}
          />
      </Card>

      <Divider />

      <div>
        <h4 className="font-bold mb-4">Environment Configuration (Read-Only)</h4>
        <p className="text-sm text-neutral-content/70 mb-4">
          These settings are loaded from environment variables and take precedence over database configuration.
          To change them, update your `.env` file and restart the server.
        </p>

        {envOverrides ? (
          <div className="bg-base-300 rounded-lg p-2">
            <DataTable
              data={Object.entries(envOverrides).map(([k, v]) => ({ variable: k, value: v as string }))}
              columns={[
                { key: 'variable' as any, title: 'Variable', prominent: true, render: (v: string) => <span className="font-mono font-bold text-primary">{v}</span> },
                { key: 'value' as any, title: 'Value', render: (v: string) => <span className="font-mono break-all">{v}</span> },
              ]}
              rowKey={(row: any) => row.variable}
              emptyState={<div className="text-center py-4 opacity-50">No environment overrides detected.</div>}
            />
          </div>
        ) : (
          <div className="flex justify-center py-8">
            <span className="loading loading-dots loading-lg" aria-hidden="true"></span>
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceTab;
