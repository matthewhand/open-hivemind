/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useWebSocket } from '../contexts/WebSocketContext';
import { apiService } from '../services/api';
import AlertPanel from '../components/Monitoring/AlertPanel';
import { PageHeader, StatsCards, Modal, Alert } from '../components/DaisyUI';
import { Settings, Server, Bell, Activity, Save, HardDrive } from 'lucide-react';

import ConfigTab from '../components/SystemManagement/ConfigTab';
import BackupsTab from '../components/SystemManagement/BackupsTab';
import PerformanceTab from '../components/SystemManagement/PerformanceTab';
import { SystemConfig, BackupRecord } from '../components/SystemManagement/types';

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
  const [error, setError] = useState<string | null>(null);

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
      setError('Failed to load system configuration');
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
    } catch (error) {
      console.error('Failed to update configuration:', error);
      setError('Failed to update configuration');
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
      setError('Encryption key is required when encryption is enabled');
      return;
    }
    if (useEncryption && encryptionKey.length < 8) {
      setError('Encryption key must be at least 8 characters long');
      return;
    }

    setShowBackupModal(false);
    setIsCreatingBackup(true);
    setError(null);
    try {
      await apiService.createSystemBackup({
        name: `backup-${Date.now()}`,
        description: 'Manual backup from System Management',
        encrypt: useEncryption,
        encryptionKey: useEncryption ? encryptionKey : undefined
      });
      await fetchBackupHistory();
    } catch (error) {
      console.error('Failed to create backup:', error);
      setError('Failed to create backup: ' + (error as Error).message);
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
        setError('Failed to restore backup: ' + (error as Error).message);
      }
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (confirm('Are you sure you want to delete this backup?')) {
      try {
        await apiService.deleteSystemBackup(backupId);
        setBackups(prev => prev.filter(backup => backup.id !== backupId));
      } catch (error) {
        console.error('Failed to delete backup:', error);
        setError('Failed to delete backup: ' + (error as Error).message);
      }
    }
  };

  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear the system cache? This may temporarily impact performance.')) {
      try {
        await apiService.clearCache();
        alert('Cache cleared successfully');
      } catch (error) {
        setError('Failed to clear cache: ' + (error as Error).message);
      }
    }
  };

  const currentMetric = performanceMetrics[performanceMetrics.length - 1] || {
    cpuUsage: 0, memoryUsage: 0, activeConnections: 0, messageRate: 0, errorRate: 0, responseTime: 0
  };

  const stats = [
    {
      id: 'alerts',
      title: 'Active Alerts',
      value: alerts.length,
      icon: <Bell className="w-8 h-8" />,
      description: `${alerts.filter(a => a.level === 'critical').length} Critical`,
      color: alerts.some(a => a.level === 'error') ? 'error' : alerts.some(a => a.level === 'warning') ? 'warning' : 'success'
    },
    {
      id: 'backups',
      title: 'Backups',
      value: backups.length,
      icon: <HardDrive className="w-8 h-8" />,
      description: systemConfig.enableAutoBackup ? 'Auto-backup ON' : 'Auto-backup OFF',
      color: 'info' as const
    },
    {
      id: 'cpu',
      title: 'CPU Usage',
      value: `${Math.round(currentMetric.cpuUsage)}%`,
      icon: <Activity className="w-8 h-8" />,
      color: currentMetric.cpuUsage > 80 ? 'warning' : 'success' as const
    },
    {
      id: 'memory',
      title: 'Memory',
      value: `${Math.round(currentMetric.memoryUsage)}%`,
      icon: <Server className="w-8 h-8" />,
      color: currentMetric.memoryUsage > 85 ? 'warning' : 'success' as const
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="System Management"
        description="Manage system configuration, alerts, and backups"
        icon={Settings}
        actions={
          <button
            className="btn btn-primary btn-sm gap-2"
            onClick={openBackupModal}
            disabled={isCreatingBackup}
          >
            {isCreatingBackup ? <span className="loading loading-spinner loading-xs"></span> : <Save className="w-4 h-4"/>}
            Create Backup
          </button>
        }
      />

      {error && (
        <Alert
          status="error"
          message={error}
          onClose={() => setError(null)}
        />
      )}

      <StatsCards stats={stats as any} />

      <div className="card bg-base-100 shadow-xl border border-base-200">
        <div className="card-body p-4">
          <div role="tablist" className="tabs tabs-boxed w-full sm:w-auto bg-base-200/50 p-1 rounded-xl mb-6">
            <button
              role="tab"
              className={`tab h-10 gap-2 ${activeTab === 'alerts' ? 'tab-active shadow-sm font-medium' : ''}`}
              onClick={() => setActiveTab('alerts')}
            >
              <Bell className="w-4 h-4"/> Alert Management
            </button>
            <button
              role="tab"
              className={`tab h-10 gap-2 ${activeTab === 'config' ? 'tab-active shadow-sm font-medium' : ''}`}
              onClick={() => setActiveTab('config')}
            >
              <Settings className="w-4 h-4"/> Configuration
            </button>
            <button
              role="tab"
              className={`tab h-10 gap-2 ${activeTab === 'backups' ? 'tab-active shadow-sm font-medium' : ''}`}
              onClick={() => setActiveTab('backups')}
            >
              <HardDrive className="w-4 h-4"/> Backups
            </button>
            <button
              role="tab"
              className={`tab h-10 gap-2 ${activeTab === 'performance' ? 'tab-active shadow-sm font-medium' : ''}`}
              onClick={() => setActiveTab('performance')}
            >
              <Activity className="w-4 h-4"/> Performance
            </button>
          </div>

          <div className="animate-fade-in">
            {activeTab === 'alerts' && (
                <AlertPanel
                onAcknowledge={handleAlertAcknowledge}
                onResolve={handleAlertResolve}
                maxAlerts={20}
                className="border-none shadow-none"
                />
            )}

            {activeTab === 'config' && (
                <ConfigTab
                    config={systemConfig}
                    onUpdate={handleConfigUpdate}
                    loading={isLoading}
                />
            )}

            {activeTab === 'backups' && (
                <BackupsTab
                    backups={backups}
                    onRestore={handleRestoreBackup}
                    onDelete={handleDeleteBackup}
                />
            )}

            {activeTab === 'performance' && (
                <PerformanceTab
                    apiStatus={apiStatus}
                    systemInfo={systemInfo}
                    envOverrides={envOverrides}
                    isLoading={isPerformanceLoading}
                    onRefresh={fetchPerformanceData}
                    onClearCache={handleClearCache}
                />
            )}
          </div>
        </div>
      </div>

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
          <p className="text-base-content/70">Create a new manual backup of the system configuration.</p>

          <div className="form-control">
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
                <span className="label-text-alt text-warning flex items-center gap-1">
                  <Activity className="w-3 h-3"/> Important: This key is required to restore.
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
