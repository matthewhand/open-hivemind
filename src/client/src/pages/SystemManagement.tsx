/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { apiService } from '../services/api';
import AlertPanel from '../components/Monitoring/AlertPanel';
import Modal from '../components/DaisyUI/Modal';
import {
  PageHeader,
  StatsCards,
  DataTable,
} from '../components/DaisyUI';
import {
  Save,
  Database,
  RefreshCw,
  Trash2,
  Archive,
  Settings,
  AlertTriangle,
  CheckCircle,
  Server,
  HardDrive,
  Cpu,
  Activity,
  Bell,
  Shield,
  Terminal,
  Play,
  RotateCcw,
} from 'lucide-react';

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

  const stats = [
    {
      id: 'alerts',
      title: 'Alerts',
      value: alerts.length,
      description: `${alerts.filter(a => a.level === 'error' || a.level === 'critical').length} Critical/Error`,
      icon: <Bell className="w-8 h-8" />,
      color: alerts.some(a => a.level === 'error' || a.level === 'critical') ? 'error' : 'success' as const,
    },
    {
      id: 'backups',
      title: 'Backups',
      value: backups.length,
      description: backups.length > 0 ? 'Last: ' + new Date(backups[0].createdAt).toLocaleDateString() : 'No backups',
      icon: <Database className="w-8 h-8" />,
      color: 'info' as const,
    },
    {
      id: 'resources',
      title: 'CPU / Memory',
      value: `${currentMetric.cpuUsage}% / ${currentMetric.memoryUsage}%`,
      icon: <Cpu className="w-8 h-8" />,
      color: currentMetric.cpuUsage > 80 || currentMetric.memoryUsage > 85 ? 'warning' : 'primary' as const,
    },
    {
      id: 'connections',
      title: 'Connections',
      value: currentMetric.activeConnections,
      description: `${currentMetric.responseTime}ms Latency`,
      icon: <Activity className="w-8 h-8" />,
      color: 'secondary' as const,
    },
  ];

  const backupColumns = [
    {
      key: 'timestamp' as keyof BackupRecord,
      title: 'Timestamp',
      render: (value: string) => new Date(value).toLocaleString(),
      sortable: true,
    },
    {
      key: 'type' as keyof BackupRecord,
      title: 'Type',
      render: (value: string) => (
        <span className={`badge ${value === 'manual' ? 'badge-info' : 'badge-neutral'}`}>
          {value}
        </span>
      ),
      sortable: true,
    },
    {
      key: 'size' as keyof BackupRecord,
      title: 'Size',
      sortable: true,
    },
    {
      key: 'status' as keyof BackupRecord,
      title: 'Status',
      render: (value: string) => (
        <span className="badge badge-success">
          {value}
        </span>
      ),
    },
    {
      key: 'description' as keyof BackupRecord,
      title: 'Description',
    },
    {
      key: 'id' as keyof BackupRecord,
      title: 'Actions',
      render: (_: string, record: BackupRecord) => (
        <div className="flex gap-2">
          <button
            className="btn btn-xs btn-primary"
            onClick={() => handleRestoreBackup(record.id)}
            title="Restore"
          >
            <RotateCcw className="w-3 h-3" />
          </button>
          <button
            className="btn btn-xs btn-error"
            onClick={() => handleDeleteBackup(record.id)}
            title="Delete"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      ),
    },
  ];

  const envColumns = [
    {
      key: 'key',
      title: 'Variable',
      render: (value: string) => <span className="font-mono font-bold text-primary">{value}</span>,
      sortable: true,
      filterable: true,
    },
    {
      key: 'value',
      title: 'Value',
      render: (value: string) => <span className="font-mono break-all">{value}</span>,
      filterable: true,
    },
  ];

  const envData = envOverrides ? Object.entries(envOverrides).map(([key, value]) => ({ key, value })) : [];

  return (
    <div className="p-6">
      <PageHeader
        title="System Management"
        description="Manage system configuration, alerts, and backups"
        icon={Settings}
        actions={
          <button
            className="btn btn-success gap-2"
            onClick={openBackupModal}
            disabled={isCreatingBackup}
          >
            {isCreatingBackup ? <span className="loading loading-spinner loading-sm"></span> : <Save className="w-4 h-4" />}
            Create Backup
          </button>
        }
      />

      <StatsCards stats={stats} />

      <div className="mt-8">
        <div role="tablist" className="tabs tabs-boxed mb-6">
          <a
            role="tab"
            className={`tab gap-2 ${activeTab === 'alerts' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('alerts')}
          >
            <Bell className="w-4 h-4" /> Alerts
          </a>
          <a
            role="tab"
            className={`tab gap-2 ${activeTab === 'config' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            <Settings className="w-4 h-4" /> Config
          </a>
          <a
            role="tab"
            className={`tab gap-2 ${activeTab === 'backups' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('backups')}
          >
            <Archive className="w-4 h-4" /> Backups
          </a>
          <a
            role="tab"
            className={`tab gap-2 ${activeTab === 'performance' ? 'tab-active' : ''}`}
            onClick={() => setActiveTab('performance')}
          >
            <Activity className="w-4 h-4" /> Performance
          </a>
        </div>

        {activeTab === 'alerts' && (
          <AlertPanel
            onAcknowledge={handleAlertAcknowledge}
            onResolve={handleAlertResolve}
            maxAlerts={20}
          />
        )}

        {activeTab === 'config' && (
          <div className="card bg-base-100 shadow-xl border border-base-200">
            <div className="card-body">
              <h3 className="card-title text-xl mb-4">System Configuration</h3>
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

              <div className="divider">Alert Thresholds</div>

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

        {activeTab === 'backups' && (
          <div className="card bg-base-100 shadow-xl border border-base-200">
            <div className="card-body">
              <h3 className="card-title text-xl mb-4">Backup History</h3>
              <DataTable
                data={backups}
                columns={backupColumns}
                searchable={true}
                pagination={{ pageSize: 5 }}
              />
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-bold">System Performance & Monitoring</h3>
              <button
                className="btn btn-warning btn-sm gap-2"
                onClick={handleClearCache}
              >
                <Trash2 className="w-4 h-4" />
                Clear System Cache
              </button>
            </div>

            {apiStatus && (
              <div className="stats shadow w-full border border-base-200">
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

            <div className="flex justify-between items-center mt-4">
              <h3 className="text-lg font-semibold">System Details</h3>
              <button
                className="btn btn-sm btn-ghost gap-2"
                onClick={fetchPerformanceData}
                disabled={isPerformanceLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isPerformanceLoading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            {systemInfo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="card bg-base-100 border border-base-200">
                  <div className="card-body p-4">
                    <h4 className="font-bold mb-2 flex items-center gap-2"><Server className="w-4 h-4" /> System Information</h4>
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

                <div className="card bg-base-100 border border-base-200">
                  <div className="card-body p-4">
                    <h4 className="font-bold mb-2 flex items-center gap-2"><Database className="w-4 h-4" /> Database Status</h4>
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
                  </div>
                </div>
              </div>
            )}

            <div className="card bg-base-100 border border-base-200">
              <div className="card-body">
                <h4 className="card-title text-lg flex items-center gap-2">
                  <Terminal className="w-5 h-5" /> Environment Configuration (Read-Only)
                </h4>
                <p className="text-sm text-neutral-content/70 mb-4">
                  These settings are loaded from environment variables and take precedence over database configuration.
                </p>

                {isPerformanceLoading && !envOverrides ? (
                  <div className="flex justify-center py-8">
                    <span className="loading loading-dots loading-lg"></span>
                  </div>
                ) : (
                  <DataTable
                    data={envData}
                    columns={envColumns}
                    searchable={true}
                    pagination={{ pageSize: 10 }}
                  />
                )}
              </div>
            </div>
          </div>
        )}
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
