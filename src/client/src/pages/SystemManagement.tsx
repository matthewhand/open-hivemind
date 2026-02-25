/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { apiService } from '../services/api';
import AlertPanel from '../components/Monitoring/AlertPanel';
import Modal, { ConfirmModal } from '../components/DaisyUI/Modal';
import PageHeader from '../components/DaisyUI/PageHeader';
import StatsCards from '../components/DaisyUI/StatsCards';
import { useSuccessToast, useErrorToast } from '../components/DaisyUI/ToastNotification';
import {
  Settings,
  Save,
  Trash2,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Server,
  HardDrive,
  Activity,
  Database,
  Cpu,
  Archive,
  Download,
  RotateCcw,
  Shield,
  Clock,
  Info
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
  const showSuccess = useSuccessToast();
  const showError = useErrorToast();

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

  // Delete/Restore Confirmations
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmRestoreId, setConfirmRestoreId] = useState<string | null>(null);
  const [confirmClearCache, setConfirmClearCache] = useState(false);

  // Performance Tab State
  const [apiStatus, setApiStatus] = useState<any>(null);
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
      await fetchApiStatus(); // Also refresh API status
      setSystemInfo(info.systemInfo);
      setEnvOverrides(overrides.data?.envVars || overrides.envVars);
    } catch (error) {
      console.error('Failed to fetch performance data:', error);
      showError('Failed to fetch performance data');
    } finally {
      setIsPerformanceLoading(false);
    }
  };

  const fetchSystemConfig = async () => {
    try {
      const globalConfig = await apiService.getGlobalConfig();
      const userSettings = globalConfig._userSettings?.values || {};

      setSystemConfig(prev => ({
        ...prev,
        ...userSettings,
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
      const mappedBackups: BackupRecord[] = backupList.map((b: any) => ({
        id: b.id,
        name: b.name,
        timestamp: b.createdAt,
        size: b.size ? `${(b.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown',
        type: b.description?.includes('automatic') ? 'automatic' : 'manual',
        status: 'success',
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
      await apiService.updateGlobalConfig({ [key]: value });
      showSuccess('Configuration updated');
    } catch (error) {
      console.error('Failed to update configuration:', error);
      showError('Failed to update configuration');
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
      showError('Encryption key is required when encryption is enabled');
      return;
    }
    if (useEncryption && encryptionKey.length < 8) {
      showError('Encryption key must be at least 8 characters long');
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
      showSuccess('Backup created successfully');
      await fetchBackupHistory();
    } catch (error) {
      console.error('Failed to create backup:', error);
      showError('Failed to create backup: ' + (error as Error).message);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async () => {
    if (!confirmRestoreId) return;
    try {
      await apiService.restoreSystemBackup(confirmRestoreId);
      showSuccess('System restored successfully. Reloading...');
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      console.error('Failed to restore backup:', error);
      showError('Failed to restore backup: ' + (error as Error).message);
    } finally {
      setConfirmRestoreId(null);
    }
  };

  const handleDeleteBackup = async () => {
    if (!confirmDeleteId) return;
    try {
      await apiService.deleteSystemBackup(confirmDeleteId);
      showSuccess('Backup deleted');
      setBackups(prev => prev.filter(backup => backup.id !== confirmDeleteId));
    } catch (error) {
      console.error('Failed to delete backup:', error);
      showError('Failed to delete backup: ' + (error as Error).message);
    } finally {
      setConfirmDeleteId(null);
    }
  };

  const handleClearCache = async () => {
    try {
      await apiService.clearCache();
      showSuccess('Cache cleared successfully');
    } catch (error) {
      showError('Failed to clear cache: ' + (error as Error).message);
    } finally {
      setConfirmClearCache(false);
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
      icon: <AlertTriangle className="w-8 h-8" />,
      color: alerts.some(a => a.level === 'error') ? 'error' : alerts.some(a => a.level === 'warning') ? 'warning' : 'success',
      description: `${alerts.filter(a => a.level === 'error').length} Critical, ${alerts.filter(a => a.level === 'warning').length} Warning`
    },
    {
      id: 'backups',
      title: 'Latest Backup',
      value: backups.length > 0 ? new Date(backups[0].createdAt).toLocaleDateString() : 'None',
      icon: <Archive className="w-8 h-8" />,
      color: backups.length > 0 ? 'primary' : 'warning',
      description: `${backups.length} total backups`
    },
    {
      id: 'cpu',
      title: 'CPU Usage',
      value: `${currentMetric.cpuUsage}%`,
      icon: <Cpu className="w-8 h-8" />,
      color: currentMetric.cpuUsage > 80 ? 'warning' : 'success'
    },
    {
      id: 'memory',
      title: 'Memory',
      value: `${currentMetric.memoryUsage}%`,
      icon: <HardDrive className="w-8 h-8" />,
      color: currentMetric.memoryUsage > 85 ? 'warning' : 'success'
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Management"
        description="Manage system configuration, alerts, backups and performance"
        icon={Settings}
        actions={
          <button
            className="btn btn-primary btn-sm"
            onClick={openBackupModal}
            disabled={isCreatingBackup}
          >
            {isCreatingBackup ? <span className="loading loading-spinner loading-xs"></span> : <Save className="w-4 h-4" />}
            Create Backup
          </button>
        }
      />

      {/* Stats Cards */}
      <StatsCards stats={stats} />

      {/* Management Tabs */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="border-b border-base-200">
          <div role="tablist" className="tabs tabs-lifted tabs-lg pt-2 px-2">
            <a
              role="tab"
              className={`tab ${activeTab === 'alerts' ? 'tab-active font-bold' : ''}`}
              onClick={() => setActiveTab('alerts')}
            >
              <AlertTriangle className="w-4 h-4 mr-2" /> Alerts
            </a>
            <a
              role="tab"
              className={`tab ${activeTab === 'config' ? 'tab-active font-bold' : ''}`}
              onClick={() => setActiveTab('config')}
            >
              <Settings className="w-4 h-4 mr-2" /> Configuration
            </a>
            <a
              role="tab"
              className={`tab ${activeTab === 'backups' ? 'tab-active font-bold' : ''}`}
              onClick={() => setActiveTab('backups')}
            >
              <Archive className="w-4 h-4 mr-2" /> Backups
            </a>
            <a
              role="tab"
              className={`tab ${activeTab === 'performance' ? 'tab-active font-bold' : ''}`}
              onClick={() => setActiveTab('performance')}
            >
              <Activity className="w-4 h-4 mr-2" /> Performance
            </a>
          </div>
        </div>

        <div className="card-body p-6 bg-base-100 rounded-b-box">
          {/* Alert Management Tab */}
          {activeTab === 'alerts' && (
            <AlertPanel
              onAcknowledge={handleAlertAcknowledge}
              onResolve={handleAlertResolve}
              maxAlerts={20}
              className="shadow-none border border-base-200"
            />
          )}

          {/* System Configuration Tab */}
          {activeTab === 'config' && (
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Settings className="w-5 h-5" /> System Configuration
              </h3>

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

              <div className="divider"></div>

              <div className="space-y-4">
                <h4 className="text-lg font-semibold flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" /> Alert Thresholds
                </h4>
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
            <div className="space-y-6 animate-fade-in">
              <h3 className="text-xl font-semibold flex items-center gap-2">
                <Archive className="w-5 h-5" /> Backup History
              </h3>

              <div className="overflow-x-auto border border-base-200 rounded-lg">
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
                        <td className="font-mono">{backup.size}</td>
                        <td>
                          <span className="badge badge-success gap-1">
                            <CheckCircle className="w-3 h-3" /> {backup.status}
                          </span>
                        </td>
                        <td>{backup.description}</td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              className="btn btn-xs btn-outline btn-primary"
                              onClick={() => setConfirmRestoreId(backup.id)}
                              title="Restore"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                            <button
                              className="btn btn-xs btn-outline btn-error"
                              onClick={() => setConfirmDeleteId(backup.id)}
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {backups.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-base-content/60">
                          <Archive className="w-8 h-8 mx-auto mb-2 opacity-50" />
                          No backups found. Create one to get started.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Performance Tuning Tab */}
          {activeTab === 'performance' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold flex items-center gap-2">
                  <Activity className="w-5 h-5" /> System Performance
                </h3>
                <button
                  className="btn btn-warning btn-sm"
                  onClick={() => setConfirmClearCache(true)}
                >
                  <Trash2 className="w-4 h-4 mr-2" /> Clear System Cache
                </button>
              </div>

              {apiStatus && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="stat bg-base-200 rounded-box">
                    <div className="stat-title">Overall Status</div>
                    <div className={`stat-value text-2xl ${apiStatus.overall.status === 'healthy' ? 'text-success' : 'text-error'}`}>
                      {apiStatus.overall.status.toUpperCase()}
                    </div>
                    <div className="stat-desc">{apiStatus.overall.message}</div>
                  </div>

                  <div className="stat bg-base-200 rounded-box">
                    <div className="stat-title">Online Endpoints</div>
                    <div className="stat-value text-2xl">{apiStatus.overall.stats.online}</div>
                    <div className="stat-desc">/ {apiStatus.overall.stats.total} total</div>
                  </div>

                  <div className="stat bg-base-200 rounded-box">
                    <div className="stat-title">Error Rate</div>
                    <div className="stat-value text-2xl text-error">{apiStatus.overall.stats.error}</div>
                    <div className="stat-desc">endpoints reporting errors</div>
                  </div>
                </div>
              )}

              <div className="flex justify-between items-center mt-8">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Info className="w-5 h-5" /> System Details
                </h3>
                <button
                  className="btn btn-sm btn-ghost"
                  onClick={fetchPerformanceData}
                  disabled={isPerformanceLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isPerformanceLoading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>

              {systemInfo && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="card bg-base-200 border border-base-300">
                    <div className="card-body p-4">
                      <h4 className="font-bold mb-2 flex items-center gap-2">
                        <Server className="w-4 h-4" /> Server Info
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between border-b border-base-300 pb-1">
                          <span className="opacity-70">Platform:</span>
                          <span className="font-mono">{systemInfo.platform} ({systemInfo.arch})</span>
                        </div>
                        <div className="flex justify-between border-b border-base-300 pb-1">
                          <span className="opacity-70">Node Version:</span>
                          <span className="font-mono">{systemInfo.nodeVersion}</span>
                        </div>
                        <div className="flex justify-between border-b border-base-300 pb-1">
                          <span className="opacity-70">Uptime:</span>
                          <span className="font-mono">{Math.floor(systemInfo.uptime / 60)} minutes</span>
                        </div>
                        <div className="flex justify-between border-b border-base-300 pb-1">
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

                  <div className="card bg-base-200 border border-base-300">
                    <div className="card-body p-4">
                      <h4 className="font-bold mb-2 flex items-center gap-2">
                        <Database className="w-4 h-4" /> Database Status
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between border-b border-base-300 pb-1">
                          <span className="opacity-70">Connected:</span>
                          <span className={`font-bold ${systemInfo.database.connected ? 'text-success' : 'text-error'}`}>
                            {systemInfo.database.connected ? 'Yes' : 'No'}
                          </span>
                        </div>
                        {systemInfo.database.stats && (
                          <div className="flex justify-between">
                            <span className="opacity-70">Pool Size:</span>
                            <span className="font-mono">{systemInfo.database.stats.poolSize || 'N/A'}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="card border border-base-200 overflow-hidden">
                <div className="card-body p-0">
                  <div className="p-4 border-b border-base-200 bg-base-200/50">
                    <h4 className="font-bold text-sm">API Endpoints Status</h4>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="table table-sm w-full">
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
                              <div className="text-xs opacity-50 font-mono">{endpoint.url}</div>
                            </td>
                            <td>
                              <div className={`badge badge-sm ${
                                endpoint.status === 'online' ? 'badge-success' :
                                endpoint.status === 'slow' ? 'badge-warning' : 'badge-error'
                              }`}>
                                {endpoint.status}
                              </div>
                            </td>
                            <td className="font-mono">{endpoint.responseTime}ms</td>
                            <td>{endpoint.consecutiveFailures}</td>
                            <td className="text-xs">{new Date(endpoint.lastChecked).toLocaleTimeString()}</td>
                          </tr>
                        ))}
                        {!apiStatus?.endpoints?.length && (
                          <tr>
                            <td colSpan={5} className="text-center py-4">No endpoint data available</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="divider"></div>

              <div>
                <h4 className="font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-5 h-5" /> Environment Configuration (Read-Only)
                </h4>
                <div className="alert alert-info shadow-sm mb-4">
                  <Info className="w-5 h-5" />
                  <span className="text-sm">These settings are loaded from environment variables and take precedence. To change them, update your .env file and restart.</span>
                </div>

                {envOverrides ? (
                  <div className="overflow-x-auto bg-base-300 rounded-lg p-2 border border-base-content/10">
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
                    <span className="loading loading-dots loading-lg text-primary"></span>
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
          <p className="text-base-content/80">Create a new manual backup of the system configuration.</p>

          <div className="form-control bg-base-200 p-3 rounded-lg">
            <label className="cursor-pointer label justify-start gap-4">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={useEncryption}
                onChange={(e) => setUseEncryption(e.target.checked)}
              />
              <span className="label-text font-medium">Encrypt Backup</span>
            </label>
          </div>

          {useEncryption && (
            <div className="form-control w-full animate-fade-in">
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
                <span className="label-text-alt text-warning flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  Important: This key will be required to restore the backup.
                </span>
              </label>
            </div>
          )}
        </div>
      </Modal>

      {/* Confirmation Modals */}
      <ConfirmModal
        isOpen={!!confirmDeleteId}
        title="Delete Backup"
        message="Are you sure you want to delete this backup? This action cannot be undone."
        confirmText="Delete"
        confirmVariant="error"
        onConfirm={handleDeleteBackup}
        onClose={() => setConfirmDeleteId(null)}
      />

      <ConfirmModal
        isOpen={!!confirmRestoreId}
        title="Restore System"
        message="Are you sure you want to restore this backup? This will overwrite the current system configuration and may require a reload."
        confirmText="Restore"
        confirmVariant="primary"
        onConfirm={handleRestoreBackup}
        onClose={() => setConfirmRestoreId(null)}
      />

      <ConfirmModal
        isOpen={confirmClearCache}
        title="Clear Cache"
        message="Are you sure you want to clear the system cache? This may temporarily impact performance as caches are rebuilt."
        confirmText="Clear Cache"
        confirmVariant="warning"
        onConfirm={handleClearCache}
        onClose={() => setConfirmClearCache(false)}
      />
    </div>
  );
};

export default SystemManagement;
