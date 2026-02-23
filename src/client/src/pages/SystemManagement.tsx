/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { apiService } from '../services/api';
import AlertPanel from '../components/Monitoring/AlertPanel';
import StatusCard from '../components/Monitoring/StatusCard';
import Modal from '../components/DaisyUI/Modal';

interface SystemConfig {
  refreshInterval: number;
  logLevel: string;
  maxConnections: number;
  enableDebugMode: boolean;
  enableAutoBackup: boolean;
  backupInterval: number;
  alertThresholds: {
    cpu: number;
    memory: number;
    disk: number;
    responseTime: number;
  };
}

interface BackupRecord {
  id: string;
  name: string;
  timestamp: string;
  size: string;
  type: 'manual' | 'automatic';
  status: 'success' | 'failed' | 'in_progress';
  description: string;
  createdAt: string;
}

const SystemManagement: React.FC = () => {
  const { alerts, performanceMetrics } = useWebSocket();
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    refreshInterval: 5000,
    logLevel: 'info',
    maxConnections: 1000,
    enableDebugMode: false,
    enableAutoBackup: true,
    backupInterval: 24 * 60 * 60 * 1000,
    alertThresholds: {
      cpu: 80,
      memory: 85,
      disk: 90,
      responseTime: 500,
    },
  });

  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [activeTab, setActiveTab] = useState('alerts');
  const [isLoading, setIsLoading] = useState(false);


  // Backup Modal State
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [useEncryption, setUseEncryption] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState('');

  // Performance Tab State
  const [apiStatus, setApiStatus] = useState<any>(null);


  // Performance Tab State
  const [systemInfo, setSystemInfo] = useState<any>(null);
  const [envOverrides, setEnvOverrides] = useState<Record<string, string> | null>(null);
  const [isPerformanceLoading, setIsPerformanceLoading] = useState(false);


  useEffect(() => {
    fetchSystemConfig();
    fetchBackupHistory();
  }, []);


  // Performance monitoring polling
  useEffect(() => {
    if (activeTab === 'performance') {
      fetchApiStatus();
      const interval = setInterval(fetchApiStatus, 10000); // Refresh every 10s
      return () => clearInterval(interval);
    }
  }, [activeTab]);

  const fetchApiStatus = async () => {
    try {
      const status = await apiService.getApiEndpointsStatus();
      setApiStatus(status);
    } catch (error) {
      console.error('Failed to fetch API status:', error);
    }
  };


  useEffect(() => {
    if (activeTab === 'performance') {
      fetchPerformanceData();
    }
  }, [activeTab]);

  const fetchPerformanceData = async () => {
    setIsPerformanceLoading(true);
    try {
      const [info, overrides] = await Promise.all([
        apiService.getSystemInfo(),
        apiService.getEnvOverrides()
      ]);
      setSystemInfo(info.systemInfo);
      // Backend returns { success: true, data: { envVars: ... } }
      setEnvOverrides(overrides.data?.envVars || overrides.envVars);
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
    } finally {
      setIsPerformanceLoading(false);

    }
  };

  const fetchSystemConfig = async () => {
    try {
      const globalConfig = await apiService.getGlobalConfig();
      const userSettings = globalConfig._userSettings?.values || {};

      // Merge user settings with defaults
      setSystemConfig(prev => ({
        ...prev,
        ...userSettings,
        // Ensure nested objects are merged correctly if present
        alertThresholds: {
          ...prev.alertThresholds,
          ...(userSettings.alertThresholds || {}),
        }
      }));
    } catch (error) {
      console.error('Failed to fetch system config:', error);
    }
  };

  const fetchBackupHistory = async () => {
    try {
      const backupList = await apiService.listSystemBackups();
      // Map API response to local interface
      const mappedBackups: BackupRecord[] = backupList.map((b: any) => ({
        id: b.id,
        name: b.name,
        timestamp: b.createdAt,
        size: b.size ? `${(b.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
        type: b.description?.includes('automatic') ? 'automatic' : 'manual',
        status: 'success', // Assuming listed backups are successful unless marked otherwise
        description: b.description || 'System backup',
        createdAt: b.createdAt
      }));
      setBackups(mappedBackups.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (error) {
      console.error('Failed to fetch backup history:', error);
    }
  };

  const handleConfigUpdate = async (key: keyof SystemConfig, value: any) => {
    setIsLoading(true);
    try {
      const updatedConfig = { ...systemConfig, [key]: value };
      setSystemConfig(updatedConfig);

      // Persist to backend (user settings)
      await apiService.updateGlobalConfig({ [key]: value });
    } catch (error) {
      console.error('Failed to update configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlertAcknowledge = async (alertId: string) => {
    try {
      await apiService.acknowledgeAlert(alertId);
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleAlertResolve = async (alertId: string) => {
    try {
      await apiService.resolveAlert(alertId);
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const openBackupModal = () => {
    setUseEncryption(false);
    setEncryptionKey('');
    setShowBackupModal(true);
  };

  const confirmCreateBackup = async () => {
    if (useEncryption && !encryptionKey) {
      alert('Encryption key is required when encryption is enabled');
      return;
    }
    if (useEncryption && encryptionKey.length < 8) {
      alert('Encryption key must be at least 8 characters long');
      return;
    }

    setShowBackupModal(false);
    setIsCreatingBackup(true);
    try {
      await apiService.createSystemBackup({
        name: `backup-${Date.now()}`,
        description: 'Manual backup from System Management',
        encrypt: useEncryption,
        encryptionKey: useEncryption ? encryptionKey : undefined
      });
      alert('Backup created successfully');
      await fetchBackupHistory();
    } catch (error) {
      console.error('Failed to create backup:', error);
      alert('Failed to create backup: ' + (error as Error).message);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    if (confirm('Are you sure you want to restore this backup? This will overwrite current configuration.')) {
      try {
        await apiService.restoreSystemBackup(backupId);
        alert('System restored successfully. Reloading...');
        setTimeout(() => window.location.reload(), 2000);
      } catch (error) {
        console.error('Failed to restore backup:', error);
        alert('Failed to restore backup: ' + (error as Error).message);
      }
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (confirm('Are you sure you want to delete this backup?')) {
      try {
        await apiService.deleteSystemBackup(backupId);
        alert('Backup deleted');
        setBackups(prev => prev.filter(backup => backup.id !== backupId));
      } catch (error) {
        console.error('Failed to delete backup:', error);
        alert('Failed to delete backup: ' + (error as Error).message);
      }
    }
  };

  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear the system cache? This may temporarily impact performance.')) {
      try {
        await apiService.clearCache();
        alert('Cache cleared successfully');
      } catch (error) {
        alert('Failed to clear cache: ' + (error as Error).message);
      }
    }
  };

  const currentMetric = performanceMetrics[performanceMetrics.length - 1] || {
    cpuUsage: 0, memoryUsage: 0, activeConnections: 0, messageRate: 0, errorRate: 0, responseTime: 0
  };

  const systemMetricsCards = [
    {
      title: 'Alert Management',
      subtitle: 'Active system alerts',
      status: alerts.some(a => a.level === 'error') ? 'error' :
        alerts.some(a => a.level === 'warning') ? 'warning' : 'healthy',
      metrics: [
        { label: 'Critical', value: alerts.filter(a => a.level === 'critical').length, icon: '🚨' },
        { label: 'Warnings', value: alerts.filter(a => a.level === 'warning').length, icon: '⚠️' },
        { label: 'Info', value: alerts.filter(a => a.level === 'info').length, icon: 'ℹ️' },
        { label: 'Total', value: alerts.length, icon: '✅' },
      ],
    },
    {
      title: 'Backup Status',
      subtitle: 'System recovery',
      status: backups.length > 0 ? 'healthy' : 'warning',
      metrics: [
        { label: 'Total Backups', value: backups.length, icon: '💾' },
        { label: 'Latest', value: backups.length > 0 ? new Date(backups[0].createdAt).toLocaleDateString() : 'None', icon: '📅' },
        { label: 'Auto-Backup', value: systemConfig.enableAutoBackup ? 'On' : 'Off', icon: systemConfig.enableAutoBackup ? '✅' : '➖' },
      ],
    },
    {
      title: 'System Resources',
      subtitle: 'Current utilization',
      status: currentMetric.cpuUsage > 80 ? 'warning' : 'healthy',
      metrics: [
        { label: 'CPU Usage', value: currentMetric.cpuUsage, unit: '%' },
        { label: 'Memory', value: currentMetric.memoryUsage, unit: '%' },
        { label: 'Connections', value: currentMetric.activeConnections, icon: '🔗' },
        { label: 'Latency', value: currentMetric.responseTime, unit: 'ms' },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-base-200 p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-4xl font-bold mb-2">System Management</h1>
            <p className="text-lg text-neutral-content/70">
              Manage system configuration, alerts, and backups
            </p>
          </div>
          <div className="flex gap-4">
            <button
              className="btn btn-success"
              onClick={openBackupModal}
              disabled={isCreatingBackup}
            >
              {isCreatingBackup ? <span className="loading loading-spinner loading-sm"></span> : '💾'} Create Backup
            </button>
          </div>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {systemMetricsCards.map((card, index) => (
          <StatusCard
            key={index}
            title={card.title}
            subtitle={card.subtitle}
            status={card.status as any}
            metrics={card.metrics}
            compact={true}
          />
        ))}
      </div>

      {/* Management Tabs */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="tabs tabs-boxed mb-6">
            <button
              className={`tab ${activeTab === 'alerts' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('alerts')}
            >
              Alert Management
            </button>
            <button
              className={`tab ${activeTab === 'config' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('config')}
            >
              System Configuration
            </button>
            <button
              className={`tab ${activeTab === 'backups' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('backups')}
            >
              Backup Management
            </button>
            <button
              className={`tab ${activeTab === 'performance' ? 'tab-active' : ''}`}
              onClick={() => setActiveTab('performance')}
            >
              Performance Tuning
            </button>
          </div>

          {/* Alert Management Tab */}
          {activeTab === 'alerts' && (
            <AlertPanel
              onAcknowledge={handleAlertAcknowledge}
              onResolve={handleAlertResolve}
              maxAlerts={20}
            />
          )}

          {/* System Configuration Tab */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">System Configuration</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Refresh Interval (ms)</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={systemConfig.refreshInterval}
                    onChange={(e) => handleConfigUpdate('refreshInterval', Number(e.target.value))}
                    min="1000"
                    max="60000"
                  />
                </div>

                 <div className="form-control">
                  <label className="label">
                    <span className="label-text">Log Level</span>
                  </label>
                  <select
                    className="select select-bordered"
                    value={systemConfig.logLevel}
                    onChange={(e) => handleConfigUpdate('logLevel', e.target.value)}
                  >
                    <option value="debug">Debug</option>
                    <option value="info">Info</option>
                    <option value="warn">Warning</option>
                    <option value="error">Error</option>
                  </select>
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Max Connections</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={systemConfig.maxConnections}
                    onChange={(e) => handleConfigUpdate('maxConnections', Number(e.target.value))}
                    min="100"
                    max="10000"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Backup Interval (hours)</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    value={systemConfig.backupInterval / (1000 * 60 * 60)}
                    onChange={(e) => handleConfigUpdate('backupInterval', Number(e.target.value) * 1000 * 60 * 60)}
                    min="1"
                    max="168"
                  />
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Alert Thresholds</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">CPU Usage Threshold (%)</span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered"
                      value={systemConfig.alertThresholds.cpu}
                      onChange={(e) => handleConfigUpdate('alertThresholds', {
                        ...systemConfig.alertThresholds,
                        cpu: Number(e.target.value),
                      })}
                      min="50"
                      max="95"
                    />
                  </div>
                   <div className="form-control">
                    <label className="label">
                      <span className="label-text">Memory Usage Threshold (%)</span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered"
                      value={systemConfig.alertThresholds.memory}
                      onChange={(e) => handleConfigUpdate('alertThresholds', {
                        ...systemConfig.alertThresholds,
                        memory: Number(e.target.value),
                      })}
                      min="50"
                      max="95"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Disk Usage Threshold (%)</span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered"
                      value={systemConfig.alertThresholds.disk}
                      onChange={(e) => handleConfigUpdate('alertThresholds', {
                        ...systemConfig.alertThresholds,
                        disk: Number(e.target.value),
                      })}
                      min="50"
                      max="95"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text">Response Time Threshold (ms)</span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered"
                      value={systemConfig.alertThresholds.responseTime}
                      onChange={(e) => handleConfigUpdate('alertThresholds', {
                        ...systemConfig.alertThresholds,
                        responseTime: Number(e.target.value),
                      })}
                      min="100"
                      max="5000"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Backup Management Tab */}
          {activeTab === 'backups' && (
            <div className="space-y-6">
              <h3 className="text-xl font-semibold">Backup History</h3>

              <div className="overflow-x-auto">
                <table className="table table-zebra w-full">
                  <thead>
                    <tr>
                      <th>Timestamp</th>
                      <th>Type</th>
                      <th>Size</th>
                      <th>Status</th>
                      <th>Description</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((backup) => (
                      <tr key={backup.id}>
                        <td>{new Date(backup.timestamp).toLocaleString()}</td>
                        <td>
                          <span className={`badge ${backup.type === 'manual' ? 'badge-info' : 'badge-neutral'}`}>
                            {backup.type}
                          </span>
                        </td>
                        <td>{backup.size}</td>
                        <td>
                          <span className="badge badge-success">
                            {backup.status}
                          </span>
                        </td>
                        <td>{backup.description}</td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              className="btn btn-xs btn-primary"
                              onClick={() => handleRestoreBackup(backup.id)}
                            >
                              Restore
                            </button>
                            <button
                              className="btn btn-xs btn-error"
                              onClick={() => handleDeleteBackup(backup.id)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Performance Tuning Tab */}
          {activeTab === 'performance' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">

                <h3 className="text-xl font-semibold">System Performance & Monitoring</h3>
                <button
                  className="btn btn-warning btn-sm"
                  onClick={handleClearCache}
                >
                  Clear System Cache
                </button>
              </div>

              {apiStatus && (
                <div className="stats shadow w-full">
                  <div className="stat">
                    <div className="stat-title">Overall Status</div>
                    <div className={`stat-value ${apiStatus.overall.status === 'healthy' ? 'text-success' : 'text-error'}`}>
                      {apiStatus.overall.status.toUpperCase()}
                    </div>
                    <div className="stat-desc">{apiStatus.overall.message}</div>
                  </div>

                  <div className="stat">
                    <div className="stat-title">Online Endpoints</div>
                    <div className="stat-value">{apiStatus.overall.stats.online}</div>
                    <div className="stat-desc">/ {apiStatus.overall.stats.total} total</div>
                  </div>

                  <div className="stat">
                    <div className="stat-title">Error Rate</div>
                    <div className="stat-value text-error">{apiStatus.overall.stats.error}</div>
                    <div className="stat-desc">endpoints reporting errors</div>
                  </div>
                </div>
              )}

               <div className="flex justify-between items-center mt-6">
                  <h3 className="text-xl font-semibold">Performance Tuning & System Info</h3>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={fetchPerformanceData}
                    disabled={isPerformanceLoading}
                  >
                    {isPerformanceLoading ? <span className="loading loading-spinner loading-xs"></span> : '🔄 Refresh'}
                  </button>
              </div>

              {systemInfo && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="card bg-base-200">
                    <div className="card-body p-4">
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
                    </div>
                  </div>

                  <div className="card bg-base-200">
                    <div className="card-body p-4">
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
                            {/* Add more DB stats if available */}
                          </>
                        )}
                      </div>
                    </div>

                  </div>
                </div>
              )}


              <div className="card bg-base-200">
                <div className="card-body p-4">
                  <h4 className="card-title text-sm">API Endpoints Status</h4>
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
                              <div className={`badge ${
                                endpoint.status === 'online' ? 'badge-success' :
                                endpoint.status === 'slow' ? 'badge-warning' : 'badge-error'
                              }`}>
                                {endpoint.status}
                              </div>
                            </td>
                            <td>{endpoint.responseTime}ms</td>
                            <td>{endpoint.consecutiveFailures}</td>
                            <td>{new Date(endpoint.lastChecked).toLocaleTimeString()}</td>
                          </tr>
                        ))}
                        {!apiStatus?.endpoints?.length && (
                          <tr>
                            <td colSpan={5} className="text-center">No endpoint data available</td>
                          </tr>
                        )}
                        </tbody>
                    </table>
                </div>
              </div>
             </div>

              <div className="divider"></div>

              <div>
                <h4 className="font-bold mb-4">Environment Configuration (Read-Only)</h4>
                <p className="text-sm text-neutral-content/70 mb-4">
                  These settings are loaded from environment variables and take precedence over database configuration.
                  To change them, update your `.env` file and restart the server.
                </p>

                {envOverrides ? (
                  <div className="overflow-x-auto bg-base-300 rounded-lg p-2">
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
                    <span className="loading loading-dots loading-lg"></span>
                  </div>
                )}

              </div>
            </div>
          )}
        </div>
      </div>

      {/* Backup Creation Modal */}
      <Modal
        isOpen={showBackupModal}
        onClose={() => setShowBackupModal(false)}
        title="Create System Backup"
        actions={[
          {
            label: 'Cancel',
            onClick: () => setShowBackupModal(false),
            variant: 'ghost'
          },
          {
            label: 'Create Backup',
            onClick: confirmCreateBackup,
            variant: 'primary',
            loading: isCreatingBackup
          }
        ]}
      >
        <div className="space-y-4">
          <p>Create a new manual backup of the system configuration.</p>

          <div className="form-control">
            <label className="cursor-pointer label justify-start gap-4">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={useEncryption}
                onChange={(e) => setUseEncryption(e.target.checked)}
              />
              <span className="label-text">Encrypt Backup</span>
            </label>
          </div>

          {useEncryption && (
            <div className="form-control w-full">
              <label className="label">
                <span className="label-text">Encryption Key (Password)</span>
              </label>
              <input
                type="password"
                placeholder="Enter a strong password"
                className="input input-bordered w-full"
                value={encryptionKey}
                onChange={(e) => setEncryptionKey(e.target.value)}
              />
              <label className="label">
                <span className="label-text-alt text-warning">
                  Important: This key will be required to restore the backup. Do not lose it.
                </span>
              </label>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default SystemManagement;