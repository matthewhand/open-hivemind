import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { apiService } from '../services/api';
import AlertPanel from '../components/Monitoring/AlertPanel';
import StatusCard from '../components/Monitoring/StatusCard';

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
  timestamp: string;
  size: string;
  type: 'manual' | 'automatic';
  status: 'success' | 'failed' | 'in_progress';
  description: string;
}

const SystemManagement: React.FC = () => {
  const { alerts, performanceMetrics } = useWebSocket();
  const [systemConfig, setSystemConfig] = useState<SystemConfig>({
    refreshInterval: 5000,
    logLevel: 'info',
    maxConnections: 1000,
    enableDebugMode: false,
    enableAutoBackup: true,
    backupInterval: 24 * 60 * 60 * 1000, // 24 hours
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

  useEffect(() => {
    fetchSystemConfig();
    fetchBackupHistory();
  }, []);

  const fetchSystemConfig = async () => {
    try {
      // Mock config data for demonstration
      const mockConfig: SystemConfig = {
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
      };
      setSystemConfig(mockConfig);
    } catch (error) {
      console.error('Failed to fetch system config:', error);
    }
  };

  const fetchBackupHistory = async () => {
    try {
      // Mock backup data
      const mockBackups: BackupRecord[] = [
        {
          id: '1',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          size: '245 MB',
          type: 'automatic',
          status: 'success',
          description: 'Scheduled daily backup',
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 25 * 3600000).toISOString(),
          size: '238 MB',
          type: 'automatic',
          status: 'success',
          description: 'Scheduled daily backup',
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 49 * 3600000).toISOString(),
          size: '231 MB',
          type: 'manual',
          status: 'success',
          description: 'Manual backup before update',
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 73 * 3600000).toISOString(),
          size: '226 MB',
          type: 'automatic',
          status: 'failed',
          description: 'Scheduled daily backup - insufficient space',
        },
      ];
      setBackups(mockBackups);
    } catch (error) {
      console.error('Failed to fetch backup history:', error);
    }
  };

  const handleConfigUpdate = async (key: keyof SystemConfig, value: any) => {
    setIsLoading(true);
    try {
      const updatedConfig = { ...systemConfig, [key]: value };
      setSystemConfig(updatedConfig);
      // Here you would make an API call to save the configuration
    } catch (error) {
      console.error('Failed to update configuration:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAlertAcknowledge = (alertId: string) => {
    // API call to acknowledge alert
  };

  const handleAlertResolve = (alertId: string) => {
    // API call to resolve alert
  };

  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    try {
      // Simulate backup creation
      const newBackup: BackupRecord = {
        id: Date.now().toString(),
        timestamp: new Date().toISOString(),
        size: 'Calculating...',
        type: 'manual',
        status: 'in_progress',
        description: 'Manual backup started',
      };
      setBackups(prev => [newBackup, ...prev]);

      // Simulate backup completion
      setTimeout(() => {
        setBackups(prev => prev.map(backup =>
          backup.id === newBackup.id
            ? { ...backup, size: '250 MB', status: 'success' }
            : backup,
        ));
        setIsCreatingBackup(false);
      }, 3000);
    } catch (error) {
      console.error('Failed to create backup:', error);
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    if (confirm('Are you sure you want to restore this backup? This will overwrite current configuration.')) {
      // API call to restore backup
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (confirm('Are you sure you want to delete this backup?')) {
      setBackups(prev => prev.filter(backup => backup.id !== backupId));
      // API call to delete backup
    }
  };

  const systemMetrics = [
    {
      title: 'Alert Management',
      subtitle: 'Active system alerts and notifications',
      status: alerts.some(a => a.severity === 'error') ? 'error' :
        alerts.some(a => a.severity === 'warning') ? 'warning' : 'healthy',
      metrics: [
        { label: 'Critical', value: alerts.filter(a => a.severity === 'error').length, icon: '🚨' },
        { label: 'Warnings', value: alerts.filter(a => a.severity === 'warning').length, icon: '⚠️' },
        { label: 'Info', value: alerts.filter(a => a.severity === 'info').length, icon: 'ℹ️' },
        { label: 'Acknowledged', value: alerts.filter(a => a.acknowledged).length, icon: '✅' },
      ],
    },
    {
      title: 'Backup Status',
      subtitle: 'System backup and recovery',
      status: backups.some(b => b.status === 'failed') ? 'warning' : 'healthy',
      metrics: [
        { label: 'Total Backups', value: backups.length, icon: '💾' },
        { label: 'Successful', value: backups.filter(b => b.status === 'success').length, icon: '✅' },
        { label: 'Failed', value: backups.filter(b => b.status === 'failed').length, icon: '❌' },
        { label: 'Last Backup', value: backups.length > 0 ? '1h ago' : 'Never', icon: '⏰' },
      ],
    },
    {
      title: 'System Resources',
      subtitle: 'Current resource utilization',
      status: performanceMetrics.some(m => m.cpu > 80) ? 'warning' : 'healthy',
      metrics: [
        { label: 'CPU Usage', value: performanceMetrics[0]?.cpu || 0, unit: '%' },
        { label: 'Memory', value: performanceMetrics[0]?.memory || 0, unit: '%' },
        { label: 'Connections', value: 156, icon: '🔗' },
        { label: 'Queue Size', value: 42, icon: '📋' },
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
              onClick={handleCreateBackup}
              disabled={isCreatingBackup}
            >
              {isCreatingBackup ? <span className="loading loading-spinner loading-sm"></span> : '💾'} Create Backup
            </button>
          </div>
        </div>
      </div>

      {/* System Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {systemMetrics.map((card, index) => (
          <StatusCard
            key={index}
            title={card.title}
            subtitle={card.subtitle}
            status={card.status}
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
              alerts={alerts.map((alert, index) => ({
                id: alert.id || `alert-${index}`,
                type: alert.severity as any || 'info',
                title: alert.title || 'System Alert',
                message: alert.message || '',
                timestamp: alert.timestamp || new Date().toISOString(),
                source: alert.source || 'System',
                acknowledged: alert.acknowledged,
                metadata: alert.metadata,
              }))}
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

              <div className="flex gap-4">
                <button className="btn btn-primary" disabled={isLoading}>
                  {isLoading ? <span className="loading loading-spinner loading-sm"></span> : '💾'} Save Configuration
                </button>
                <button className="btn btn-ghost" onClick={fetchSystemConfig}>
                  🔄 Reset
                </button>
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
                          <span className={`badge ${
                            backup.status === 'success' ? 'badge-success' :
                              backup.status === 'failed' ? 'badge-error' : 'badge-warning'
                          }`}>
                            {backup.status}
                          </span>
                        </td>
                        <td>{backup.description}</td>
                        <td>
                          <div className="flex gap-2">
                            <button
                              className="btn btn-xs btn-primary"
                              onClick={() => handleRestoreBackup(backup.id)}
                              disabled={backup.status !== 'success'}
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
              <h3 className="text-xl font-semibold">Performance Tuning</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Cache TTL (seconds)</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    defaultValue="300"
                    min="60"
                    max="3600"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Max Cache Size (MB)</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    defaultValue="512"
                    min="64"
                    max="2048"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Connection Pool Size</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    defaultValue="20"
                    min="5"
                    max="100"
                  />
                </div>

                <div className="form-control">
                  <label className="label">
                    <span className="label-text">Request Timeout (seconds)</span>
                  </label>
                  <input
                    type="number"
                    className="input input-bordered"
                    defaultValue="30"
                    min="5"
                    max="300"
                  />
                </div>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Enable Performance Monitoring</span>
                  <input type="checkbox" className="toggle toggle-primary" defaultChecked />
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Enable Query Optimization</span>
                  <input type="checkbox" className="toggle toggle-primary" defaultChecked />
                </label>
              </div>

              <div className="form-control">
                <label className="label cursor-pointer">
                  <span className="label-text">Enable Response Compression</span>
                  <input type="checkbox" className="toggle toggle-primary" defaultChecked />
                </label>
              </div>

              <div className="flex gap-4">
                <button className="btn btn-primary">
                  ⚙️ Apply Performance Settings
                </button>
                <button className="btn btn-ghost">
                  🔄 Reset to Defaults
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SystemManagement;