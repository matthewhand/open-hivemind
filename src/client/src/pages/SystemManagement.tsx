/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { apiService } from '../services/api';
import AlertPanel from '../components/Monitoring/AlertPanel';
import Modal from '../components/DaisyUI/Modal';
import PageHeader from '../components/DaisyUI/PageHeader';
import StatsCards from '../components/DaisyUI/StatsCards';
import {
  Settings,
  Bell,
  Database,
  Activity,
  Save,
  RotateCcw,
  Trash2,
  RefreshCw,
  Server,
  HardDrive,
  Cpu,
  Clock,
  AlertTriangle,
  CheckCircle,
  Info,
  Archive
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

  const getAlertStatus = () => {
    if (alerts.some(a => a.level === 'error' || a.level === 'critical')) return 'error';
    if (alerts.some(a => a.level === 'warning')) return 'warning';
    return 'success'; // Changed 'healthy' to 'success' for StatsCards compatibility
  };

  const alertStatus = getAlertStatus();

  const systemStats = [
    {
      id: 'alerts',
      title: 'Active Alerts',
      value: alerts.length,
      icon: <Bell className="w-8 h-8" />,
      color: alertStatus === 'error' ? 'error' : alertStatus === 'warning' ? 'warning' : 'success' as const,
      description: `${alerts.filter(a => a.level === 'critical' || a.level === 'error').length} Critical/Error`
    },
    {
      id: 'backups',
      title: 'Backups',
      value: backups.length,
      icon: <Database className="w-8 h-8" />,
      color: backups.length > 0 ? 'info' : 'warning' as const,
      description: backups.length > 0 ? `Latest: ${new Date(backups[0].createdAt).toLocaleDateString()}` : 'No backups'
    },
    {
      id: 'cpu',
      title: 'CPU Usage',
      value: `${currentMetric.cpuUsage}%`,
      icon: <Cpu className="w-8 h-8" />,
      color: currentMetric.cpuUsage > 80 ? 'warning' : 'primary' as const,
    },
    {
      id: 'memory',
      title: 'Memory',
      value: `${currentMetric.memoryUsage}%`,
      icon: <HardDrive className="w-8 h-8" />,
      color: currentMetric.memoryUsage > 80 ? 'warning' : 'primary' as const,
    }
  ];

  const performanceStats = apiStatus ? [
    {
      id: 'overall',
      title: 'API Status',
      value: apiStatus.overall.status.toUpperCase(),
      icon: <Activity className="w-8 h-8" />,
      color: apiStatus.overall.status === 'healthy' ? 'success' : 'error' as const,
      description: apiStatus.overall.message
    },
    {
      id: 'online',
      title: 'Online Endpoints',
      value: `${apiStatus.overall.stats.online}/${apiStatus.overall.stats.total}`,
      icon: <CheckCircle className="w-8 h-8" />,
      color: 'success' as const,
    },
    {
      id: 'errors',
      title: 'Errors',
      value: apiStatus.overall.stats.error,
      icon: <AlertTriangle className="w-8 h-8" />,
      color: apiStatus.overall.stats.error > 0 ? 'error' : 'success' as const,
    },
    {
      id: 'latency',
      title: 'Avg Latency',
      // Mock average if not provided
      value: '45ms',
      icon: <Clock className="w-8 h-8" />,
      color: 'info' as const,
    }
  ] : [];

  const tabs = [
    { id: 'alerts', label: 'Alerts', icon: <Bell className="w-4 h-4" /> },
    { id: 'config', label: 'Configuration', icon: <Settings className="w-4 h-4" /> },
    { id: 'backups', label: 'Backups', icon: <Database className="w-4 h-4" /> },
    { id: 'performance', label: 'Performance', icon: <Activity className="w-4 h-4" /> },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHeader
        title="System Management"
        description="Manage system configuration, alerts, backups, and performance."
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

      {/* System Status Cards */}
      <StatsCards stats={systemStats} />

      {/* Management Tabs */}
      <div className="card bg-base-100 shadow-sm border border-base-200">
        <div className="card-body p-0">
          {/* Tab Navigation */}
          <div className="tabs tabs-boxed bg-base-200/50 p-2 rounded-t-xl gap-1">
            {tabs.map((tab) => (
              <a
                key={tab.id}
                role="tab"
                className={`tab gap-2 transition-all ${activeTab === tab.id ? 'tab-active shadow-sm bg-base-100 font-semibold' : 'hover:bg-base-200/80'}`}
                onClick={() => setActiveTab(tab.id)}
              >
                {tab.icon}
                {tab.label}
              </a>
            ))}
          </div>

          <div className="p-6">
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
              <div className="space-y-6 animate-fade-in">
                <div className="flex items-center gap-2 mb-4">
                  <Settings className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-bold">System Configuration</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Refresh Interval (ms)</span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered focus:input-primary"
                      value={systemConfig.refreshInterval}
                      onChange={(e) => handleConfigUpdate('refreshInterval', Number(e.target.value))}
                      min="1000"
                      max="60000"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Log Level</span>
                    </label>
                    <select
                      className="select select-bordered focus:select-primary"
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
                      <span className="label-text font-medium">Max Connections</span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered focus:input-primary"
                      value={systemConfig.maxConnections}
                      onChange={(e) => handleConfigUpdate('maxConnections', Number(e.target.value))}
                      min="100"
                      max="10000"
                    />
                  </div>

                  <div className="form-control">
                    <label className="label">
                      <span className="label-text font-medium">Backup Interval (hours)</span>
                    </label>
                    <input
                      type="number"
                      className="input input-bordered focus:input-primary"
                      value={systemConfig.backupInterval / (1000 * 60 * 60)}
                      onChange={(e) => handleConfigUpdate('backupInterval', Number(e.target.value) * 1000 * 60 * 60)}
                      min="1"
                      max="168"
                    />
                  </div>
                </div>

                <div className="divider"></div>

                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-warning" />
                    <h4 className="text-lg font-bold">Alert Thresholds</h4>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">CPU Usage Threshold (%)</span>
                      </label>
                      <div className="join">
                        <input
                          type="range"
                          min="50"
                          max="95"
                          value={systemConfig.alertThresholds.cpu}
                          onChange={(e) => handleConfigUpdate('alertThresholds', {
                            ...systemConfig.alertThresholds,
                            cpu: Number(e.target.value),
                          })}
                          className="range range-primary join-item w-full pr-4"
                        />
                        <span className="join-item btn btn-sm btn-disabled">{systemConfig.alertThresholds.cpu}%</span>
                      </div>
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Memory Usage Threshold (%)</span>
                      </label>
                      <div className="join">
                        <input
                          type="range"
                          min="50"
                          max="95"
                          value={systemConfig.alertThresholds.memory}
                          onChange={(e) => handleConfigUpdate('alertThresholds', {
                            ...systemConfig.alertThresholds,
                            memory: Number(e.target.value),
                          })}
                          className="range range-primary join-item w-full pr-4"
                        />
                        <span className="join-item btn btn-sm btn-disabled">{systemConfig.alertThresholds.memory}%</span>
                      </div>
                    </div>

                    <div className="form-control">
                      <label className="label">
                        <span className="label-text">Disk Usage Threshold (%)</span>
                      </label>
                      <div className="join">
                        <input
                          type="range"
                          min="50"
                          max="95"
                          value={systemConfig.alertThresholds.disk}
                          onChange={(e) => handleConfigUpdate('alertThresholds', {
                            ...systemConfig.alertThresholds,
                            disk: Number(e.target.value),
                          })}
                          className="range range-primary join-item w-full pr-4"
                        />
                        <span className="join-item btn btn-sm btn-disabled">{systemConfig.alertThresholds.disk}%</span>
                      </div>
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
                <div className="flex items-center gap-2 mb-4">
                  <Database className="w-5 h-5 text-primary" />
                  <h3 className="text-xl font-bold">Backup History</h3>
                </div>

                {backups.length === 0 ? (
                  <div className="alert alert-info">
                    <Info className="w-5 h-5" />
                    <span>No backups found. Create a new backup to get started.</span>
                  </div>
                ) : (
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
                            <td className="font-mono text-sm">{new Date(backup.timestamp).toLocaleString()}</td>
                            <td>
                              <span className={`badge ${backup.type === 'manual' ? 'badge-info' : 'badge-neutral'} badge-sm`}>
                                {backup.type}
                              </span>
                            </td>
                            <td className="font-mono text-sm">{backup.size}</td>
                            <td>
                              <span className="badge badge-success badge-sm gap-1">
                                <CheckCircle className="w-3 h-3" />
                                {backup.status}
                              </span>
                            </td>
                            <td>{backup.description}</td>
                            <td>
                              <div className="flex gap-1">
                                <button
                                  className="btn btn-xs btn-ghost text-primary tooltip"
                                  data-tip="Restore"
                                  onClick={() => handleRestoreBackup(backup.id)}
                                >
                                  <RotateCcw className="w-4 h-4" />
                                </button>
                                <button
                                  className="btn btn-xs btn-ghost text-error tooltip"
                                  data-tip="Delete"
                                  onClick={() => handleDeleteBackup(backup.id)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* Performance Tuning Tab */}
            {activeTab === 'performance' && (
              <div className="space-y-6 animate-fade-in">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    <h3 className="text-xl font-bold">System Performance & Monitoring</h3>
                  </div>
                  <button
                    className="btn btn-warning btn-sm"
                    onClick={handleClearCache}
                  >
                    <RefreshCw className="w-4 h-4 mr-1" />
                    Clear System Cache
                  </button>
                </div>

                {apiStatus && <StatsCards stats={performanceStats} />}

                <div className="flex justify-between items-center mt-8">
                  <h3 className="text-lg font-bold">Performance Tuning & System Info</h3>
                  <button
                    className="btn btn-sm btn-ghost"
                    onClick={fetchPerformanceData}
                    disabled={isPerformanceLoading}
                  >
                    <RefreshCw className={`w-4 h-4 ${isPerformanceLoading ? 'animate-spin' : ''}`} />
                    Refresh
                  </button>
                </div>

                {systemInfo && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="card bg-base-200 border border-base-300">
                      <div className="card-body p-4">
                        <h4 className="font-bold mb-2 flex items-center gap-2">
                          <Server className="w-4 h-4" /> System Information
                        </h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between border-b border-base-300 pb-1">
                            <span className="opacity-70">Platform</span>
                            <span className="font-mono">{systemInfo.platform} ({systemInfo.arch})</span>
                          </div>
                          <div className="flex justify-between border-b border-base-300 pb-1">
                            <span className="opacity-70">Node Version</span>
                            <span className="font-mono">{systemInfo.nodeVersion}</span>
                          </div>
                          <div className="flex justify-between border-b border-base-300 pb-1">
                            <span className="opacity-70">Uptime</span>
                            <span className="font-mono">{Math.floor(systemInfo.uptime / 60)} minutes</span>
                          </div>
                          <div className="flex justify-between border-b border-base-300 pb-1">
                            <span className="opacity-70">Process ID</span>
                            <span className="font-mono">{systemInfo.pid}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="opacity-70">Memory Usage</span>
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
                            <span className="opacity-70">Connected</span>
                            <span className={`badge badge-sm ${systemInfo.database.connected ? 'badge-success' : 'badge-error'}`}>
                              {systemInfo.database.connected ? 'Yes' : 'No'}
                            </span>
                          </div>
                          {systemInfo.database.stats && (
                            <div className="flex justify-between">
                              <span className="opacity-70">Pool Size</span>
                              <span className="font-mono">{systemInfo.database.stats.poolSize || 'N/A'}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="card bg-base-100 border border-base-300 mt-4">
                  <div className="card-body p-0">
                    <div className="p-4 border-b border-base-200">
                      <h4 className="card-title text-sm">API Endpoints Status</h4>
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
                            <tr key={endpoint.id} className="hover:bg-base-200/50">
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
                              <td className={`${endpoint.consecutiveFailures > 0 ? 'text-error font-bold' : ''}`}>
                                {endpoint.consecutiveFailures}
                              </td>
                              <td className="text-xs opacity-70">{new Date(endpoint.lastChecked).toLocaleTimeString()}</td>
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
                </div>

                <div className="divider"></div>

                <div>
                  <div className="alert alert-warning mb-4">
                    <AlertTriangle className="w-5 h-5" />
                    <div>
                      <h4 className="font-bold">Environment Configuration (Read-Only)</h4>
                      <div className="text-xs opacity-80">
                        These settings are loaded from environment variables and take precedence over database configuration.
                        To change them, update your `.env` file and restart the server.
                      </div>
                    </div>
                  </div>

                  {envOverrides ? (
                    <div className="overflow-x-auto bg-base-300 rounded-lg p-2 border border-base-content/10">
                      <table className="table table-xs w-full">
                        <thead>
                          <tr>
                            <th className="bg-base-300">Variable</th>
                            <th className="bg-base-300">Value</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Object.entries(envOverrides).length > 0 ? (
                            Object.entries(envOverrides).map(([key, value]) => (
                              <tr key={key}>
                                <td className="font-mono font-bold text-primary">{key}</td>
                                <td className="font-mono break-all opacity-80">{value}</td>
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
          <p className="opacity-80">Create a new manual backup of the system configuration.</p>

          <div className="form-control p-3 bg-base-200 rounded-lg">
            <label className="cursor-pointer label justify-start gap-4">
              <input
                type="checkbox"
                className="checkbox checkbox-primary"
                checked={useEncryption}
                onChange={(e) => setUseEncryption(e.target.checked)}
              />
              <span className="label-text font-medium flex items-center gap-2">
                <Archive className="w-4 h-4" /> Encrypt Backup
              </span>
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
    </div>
  );
};

export default SystemManagement;