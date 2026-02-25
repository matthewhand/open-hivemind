/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { Button, ToastNotification } from '../DaisyUI';
import { apiService, SystemInfo } from '../../services/api';
import {
  ServerStackIcon,
  CpuChipIcon,
  CircleStackIcon,
  ArrowPathIcon,
  TrashIcon,
  ClockIcon,
  CommandLineIcon
} from '@heroicons/react/24/outline';

const SettingsMaintenance: React.FC = () => {
  const [systemInfo, setSystemInfo] = useState<SystemInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  useEffect(() => {
    fetchSystemInfo();
  }, []);

  const fetchSystemInfo = async () => {
    setLoading(true);
    try {
      const response = await apiService.getSystemInfo();
      setSystemInfo(response.systemInfo);
    } catch (error) {
      console.error('Failed to fetch system info:', error);
      setToast({ message: 'Failed to fetch system information', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleReloadConfig = async () => {
    setActionLoading('reload');
    try {
      await apiService.reloadConfig();
      setToast({ message: 'Configuration reloaded successfully', type: 'success' });
      // Refresh system info after reload
      setTimeout(fetchSystemInfo, 1000);
    } catch (error) {
      console.error('Reload failed:', error);
      setToast({ message: 'Failed to reload configuration', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleClearCache = async () => {
    setActionLoading('cache');
    try {
      await apiService.clearCache();
      setToast({ message: 'System cache cleared successfully', type: 'success' });
    } catch (error) {
      console.error('Clear cache failed:', error);
      setToast({ message: 'Failed to clear cache', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const formatUptime = (seconds: number) => {
    const d = Math.floor(seconds / (3600 * 24));
    const h = Math.floor((seconds % (3600 * 24)) / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    const parts = [];
    if (d > 0) parts.push(`${d}d`);
    if (h > 0) parts.push(`${h}h`);
    if (m > 0) parts.push(`${m}m`);
    parts.push(`${s}s`);

    return parts.join(' ');
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  if (loading && !systemInfo) {
    return (
      <div className="flex justify-center py-12">
        <span className="loading loading-spinner loading-lg text-primary"></span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <ServerStackIcon className="w-5 h-5 text-primary" />
        <div>
          <h5 className="text-lg font-bold">System Maintenance</h5>
          <p className="text-sm text-base-content/70">Monitor system health and perform administrative tasks</p>
        </div>
      </div>

      {/* System Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Uptime Card */}
        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-figure text-secondary">
              <ClockIcon className="w-8 h-8" />
            </div>
            <div className="stat-title">System Uptime</div>
            <div className="stat-value text-xl font-mono">
              {systemInfo ? formatUptime(systemInfo.uptime) : '--'}
            </div>
            <div className="stat-desc">Since last restart</div>
          </div>
        </div>

        {/* Memory Card */}
        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-figure text-primary">
              <CpuChipIcon className="w-8 h-8" />
            </div>
            <div className="stat-title">Memory Usage</div>
            <div className="stat-value text-xl font-mono">
              {systemInfo ? formatBytes(systemInfo.memory.rss) : '--'}
            </div>
            <div className="stat-desc">RSS / Total Allocated</div>
          </div>
        </div>

        {/* Database Card */}
        <div className="stats shadow bg-base-100 border border-base-200">
          <div className="stat">
            <div className="stat-figure text-accent">
              <CircleStackIcon className="w-8 h-8" />
            </div>
            <div className="stat-title">Database Status</div>
            <div className={`stat-value text-xl ${systemInfo?.database.connected ? 'text-success' : 'text-error'}`}>
              {systemInfo?.database.connected ? 'Connected' : 'Disconnected'}
            </div>
            <div className="stat-desc">
              {systemInfo?.database.stats ? `${Object.keys(systemInfo.database.stats).length} tables loaded` : 'No stats available'}
            </div>
          </div>
        </div>
      </div>

      {/* Environment Details */}
      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body">
          <h3 className="card-title text-base mb-4 flex items-center gap-2">
            <CommandLineIcon className="w-4 h-4" /> Environment Details
          </h3>
          <div className="overflow-x-auto">
            <table className="table table-zebra w-full text-sm">
              <tbody>
                <tr>
                  <td className="font-semibold w-1/3">Node.js Version</td>
                  <td className="font-mono">{systemInfo?.nodeVersion}</td>
                </tr>
                <tr>
                  <td className="font-semibold">Platform</td>
                  <td className="font-mono">{systemInfo?.platform} ({systemInfo?.arch})</td>
                </tr>
                <tr>
                  <td className="font-semibold">Environment</td>
                  <td>
                    <span className={`badge ${systemInfo?.environment === 'production' ? 'badge-primary' : 'badge-ghost'}`}>
                      {systemInfo?.environment}
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="font-semibold">Process ID</td>
                  <td className="font-mono">{systemInfo?.pid}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Service Control Actions */}
      <div className="card bg-base-100 shadow border border-base-200">
        <div className="card-body">
          <h3 className="card-title text-base mb-4 flex items-center gap-2">
            <ArrowPathIcon className="w-4 h-4" /> Service Controls
          </h3>
          <p className="text-sm text-base-content/70 mb-6">
            Perform administrative actions on the running service. These actions may temporarily affect availability.
          </p>

          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[250px] p-4 bg-base-200 rounded-lg flex flex-col gap-3">
              <h4 className="font-bold flex items-center gap-2">
                <ArrowPathIcon className="w-4 h-4" /> Reload Configuration
              </h4>
              <p className="text-xs text-base-content/60 flex-grow">
                Re-reads all configuration files from disk and updates running services without restarting the process.
              </p>
              <Button
                onClick={handleReloadConfig}
                disabled={!!actionLoading}
                loading={actionLoading === 'reload'}
                variant="primary"
                size="sm"
                className="w-full"
              >
                Reload Config
              </Button>
            </div>

            <div className="flex-1 min-w-[250px] p-4 bg-base-200 rounded-lg flex flex-col gap-3">
              <h4 className="font-bold flex items-center gap-2">
                <TrashIcon className="w-4 h-4" /> Clear System Cache
              </h4>
              <p className="text-xs text-base-content/60 flex-grow">
                Clears internal caches (LLM providers, templates, etc.). Useful if changes aren't reflecting immediately.
              </p>
              <Button
                onClick={handleClearCache}
                disabled={!!actionLoading}
                loading={actionLoading === 'cache'}
                variant="outline"
                color="warning"
                size="sm"
                className="w-full"
              >
                Clear Cache
              </Button>
            </div>
          </div>
        </div>
      </div>

      {toast && (
        <ToastNotification
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
};

export default SettingsMaintenance;
