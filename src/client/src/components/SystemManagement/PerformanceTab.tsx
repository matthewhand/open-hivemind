/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { Card, Button, Badge, Loading } from '../DaisyUI';
import { RefreshCw, Trash2, Server, Database, Activity, Globe } from 'lucide-react';

interface PerformanceTabProps {
  apiStatus: any;
  systemInfo: any;
  envOverrides: Record<string, string> | null;
  isLoading: boolean;
  onRefresh: () => void;
  onClearCache: () => void;
}

const PerformanceTab: React.FC<PerformanceTabProps> = ({
  apiStatus,
  systemInfo,
  envOverrides,
  isLoading,
  onRefresh,
  onClearCache,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 opacity-70"/>
            <h3 className="text-xl font-semibold">System Performance & Monitoring</h3>
        </div>
        <Button
          variant="warning"
          size="sm"
          onClick={onClearCache}
          className="gap-2"
        >
          <Trash2 className="w-4 h-4"/>
          Clear System Cache
        </Button>
      </div>

      {apiStatus && (
        <div className="stats shadow w-full bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-figure text-secondary">
                <Activity className="w-8 h-8 opacity-20"/>
            </div>
            <div className="stat-title">Overall Status</div>
            <div className={`stat-value text-2xl ${apiStatus.overall.status === 'healthy' ? 'text-success' : 'text-error'}`}>
              {apiStatus.overall.status.toUpperCase()}
            </div>
            <div className="stat-desc">{apiStatus.overall.message}</div>
          </div>

          <div className="stat">
            <div className="stat-figure text-secondary">
                <Globe className="w-8 h-8 opacity-20"/>
            </div>
            <div className="stat-title">Online Endpoints</div>
            <div className="stat-value text-2xl">{apiStatus.overall.stats.online}</div>
            <div className="stat-desc">/ {apiStatus.overall.stats.total} total</div>
          </div>

          <div className="stat">
            <div className="stat-title">Error Rate</div>
            <div className="stat-value text-2xl text-error">{apiStatus.overall.stats.error}</div>
            <div className="stat-desc">endpoints reporting errors</div>
          </div>
        </div>
      )}

      <div className="flex justify-between items-center mt-8">
        <h3 className="text-lg font-bold">Performance Tuning & System Info</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={onRefresh}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {systemInfo && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="bg-base-100 shadow-sm border border-base-200">
            <div className="card-body p-4">
              <div className="flex items-center gap-2 mb-2 text-primary">
                  <Server className="w-5 h-5"/>
                  <h4 className="font-bold">System Information</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-base-200 pb-2">
                  <span className="opacity-70">Platform:</span>
                  <span className="font-mono">{systemInfo.platform} ({systemInfo.arch})</span>
                </div>
                <div className="flex justify-between border-b border-base-200 pb-2">
                  <span className="opacity-70">Node Version:</span>
                  <span className="font-mono">{systemInfo.nodeVersion}</span>
                </div>
                <div className="flex justify-between border-b border-base-200 pb-2">
                  <span className="opacity-70">Uptime:</span>
                  <span className="font-mono">{Math.floor(systemInfo.uptime / 60)} minutes</span>
                </div>
                <div className="flex justify-between border-b border-base-200 pb-2">
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
            </div>
          </Card>

          <Card className="bg-base-100 shadow-sm border border-base-200">
            <div className="card-body p-4">
              <div className="flex items-center gap-2 mb-2 text-secondary">
                  <Database className="w-5 h-5"/>
                  <h4 className="font-bold">Database Status</h4>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between border-b border-base-200 pb-2">
                  <span className="opacity-70">Connected:</span>
                  <Badge variant={systemInfo.database.connected ? 'success' : 'error'} size="small">
                    {systemInfo.database.connected ? 'Yes' : 'No'}
                  </Badge>
                </div>
                {systemInfo.database.stats && (
                  <div className="flex justify-between">
                    <span className="opacity-70">Pool Size:</span>
                    <span className="font-mono">{systemInfo.database.stats.poolSize || 'N/A'}</span>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </div>
      )}

      <Card className="bg-base-100 shadow-sm border border-base-200">
        <div className="card-body p-4">
          <h4 className="card-title text-sm mb-4">API Endpoints Status</h4>
          <div className="overflow-x-auto">
            <table className="table table-xs w-full">
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th>Status</th>
                  <th>Response Time</th>
                  <th>Failures</th>
                  <th>Last Checked</th>
                </tr>
              </thead>
              <tbody>
                {apiStatus?.endpoints?.map((endpoint: any) => (
                  <tr key={endpoint.id}>
                    <td>
                      <div className="font-bold">{endpoint.name}</div>
                      <div className="text-xs opacity-50">{endpoint.url}</div>
                    </td>
                    <td>
                      <Badge variant={
                        endpoint.status === 'online' ? 'success' :
                        endpoint.status === 'slow' ? 'warning' : 'error'
                      } size="small">
                        {endpoint.status}
                      </Badge>
                    </td>
                    <td className="font-mono">{endpoint.responseTime}ms</td>
                    <td className="font-mono">{endpoint.consecutiveFailures}</td>
                    <td className="font-mono opacity-70">{new Date(endpoint.lastChecked).toLocaleTimeString()}</td>
                  </tr>
                ))}
                {!apiStatus?.endpoints?.length && (
                  <tr>
                    <td colSpan={5} className="text-center py-4 opacity-50">No endpoint data available</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      <div className="divider"></div>

      <div>
        <h4 className="font-bold mb-4">Environment Configuration (Read-Only)</h4>
        <p className="text-sm text-neutral-content/70 mb-4">
          These settings are loaded from environment variables and take precedence over database configuration.
          To change them, update your `.env` file and restart the server.
        </p>

        {envOverrides ? (
          <div className="overflow-x-auto bg-base-200 rounded-lg p-2 border border-base-300">
            <table className="table table-xs w-full">
              <thead>
                <tr>
                  <th>Variable</th>
                  <th>Value</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(envOverrides).length > 0 ? (
                  Object.entries(envOverrides).map(([key, value]) => (
                    <tr key={key}>
                      <td className="font-mono font-bold text-primary">{key}</td>
                      <td className="font-mono break-all">{value}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={2} className="text-center py-4 opacity-50">
                      No environment overrides detected.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex justify-center py-8">
            <Loading size="lg" />
          </div>
        )}
      </div>
    </div>
  );
};

export default PerformanceTab;
