import React, { useState, useEffect, useCallback } from 'react';
import { useWebSocket } from '../../contexts/WebSocketContext';
import { apiService } from '../../services/api';
import StatusCard from '../../components/Monitoring/StatusCard';
import Modal, { ConfirmModal } from '../../components/DaisyUI/Modal';
import { useSuccessToast, useErrorToast, useWarningToast } from '../../components/DaisyUI/ToastNotification';
import Checkbox from '../../components/DaisyUI/Checkbox';
import Tabs from '../../components/DaisyUI/Tabs';
import AlertsTab from './AlertsTab';
import ConfigTab from './ConfigTab';
import BackupsTab from './BackupsTab';
import PerformanceTab from './PerformanceTab';
import type { SystemConfig, BackupRecord } from './types';
import { LoadingSpinner } from '../../components/DaisyUI/Loading';

const SystemManagement: React.FC = () => {
  const { alerts, performanceMetrics } = useWebSocket();
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();
  const warningToast = useWarningToast();

  // Confirm modal state
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmVariant?: 'primary' | 'error' | 'warning';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const closeConfirmModal = useCallback(() => {
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
  }, []);

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

  const fetchSystemConfig = useCallback(async () => {
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
      errorToast('System Config', 'Failed to fetch system configuration');
    }
  }, []);

  const fetchBackupHistory = useCallback(async () => {
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
      errorToast('Backup History', 'Failed to fetch backup history');
    }
  }, []);

  useEffect(() => {
    fetchSystemConfig();
    fetchBackupHistory();
  }, [fetchSystemConfig, fetchBackupHistory]);

  const handleConfigUpdate = async (key: keyof SystemConfig, value: any) => {
    setIsLoading(true);
    try {
      const updatedConfig = { ...systemConfig, [key]: value };
      setSystemConfig(updatedConfig);
      await apiService.updateGlobalConfig({ [key]: value });
    } catch (error) {
      errorToast('Config Update', 'Failed to update configuration');
    } finally {
      setIsLoading(false);
    }
  };

  const openBackupModal = () => {
    setUseEncryption(false);
    setEncryptionKey('');
    setShowBackupModal(true);
  };

  const confirmCreateBackup = async () => {
    if (useEncryption && !encryptionKey) {
      warningToast('Validation Error', 'Encryption key is required when encryption is enabled');
      return;
    }
    if (useEncryption && encryptionKey.length < 8) {
      warningToast('Validation Error', 'Encryption key must be at least 8 characters long');
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
      successToast('Backup Created', 'Backup created successfully');
      await fetchBackupHistory();
    } catch (error) {
      errorToast('Backup Failed', 'Failed to create backup: ' + (error as Error).message);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Restore Backup',
      message: 'Are you sure you want to restore this backup? This will overwrite current configuration.',
      confirmVariant: 'warning',
      onConfirm: async () => {
        closeConfirmModal();
        try {
          await apiService.restoreSystemBackup(backupId);
          successToast('System Restored', 'System restored successfully. Reloading...');
          setTimeout(() => window.location.reload(), 2000);
        } catch (error) {
          errorToast('Restore Failed', 'Failed to restore backup: ' + (error as Error).message);
        }
      },
    });
  };

  const handleDeleteBackup = async (backupId: string) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Backup',
      message: 'Are you sure you want to delete this backup?',
      confirmVariant: 'error',
      onConfirm: async () => {
        closeConfirmModal();
        try {
          await apiService.deleteSystemBackup(backupId);
          successToast('Backup Deleted', 'Backup deleted');
          setBackups(prev => prev.filter(backup => backup.id !== backupId));
        } catch (error) {
          errorToast('Delete Failed', 'Failed to delete backup: ' + (error as Error).message);
        }
      },
    });
  };

  const handleClearCache = async () => {
    setConfirmModal({
      isOpen: true,
      title: 'Clear Cache',
      message: 'Are you sure you want to clear the system cache? This may temporarily impact performance.',
      confirmVariant: 'warning',
      onConfirm: async () => {
        closeConfirmModal();
        try {
          await apiService.clearCache();
          successToast('Cache Cleared', 'Cache cleared successfully');
        } catch (error) {
          errorToast('Cache Error', 'Failed to clear cache: ' + (error as Error).message);
        }
      },
    });
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
              {isCreatingBackup ? <LoadingSpinner size="sm" /> : '💾'} Create Backup
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
          <Tabs
            tabs={[
              { key: 'alerts', label: 'Alert Management' },
              { key: 'config', label: 'System Configuration' },
              { key: 'backups', label: 'Backup Management' },
              { key: 'performance', label: 'Performance Tuning' },
            ]}
            activeTab={activeTab}
            onChange={setActiveTab}
            className="mb-6"
          />

          {activeTab === 'alerts' && <AlertsTab />}
          {activeTab === 'config' && (
            <ConfigTab systemConfig={systemConfig} onConfigUpdate={handleConfigUpdate} />
          )}
          {activeTab === 'backups' && (
            <BackupsTab
              backups={backups}
              onRestoreBackup={handleRestoreBackup}
              onDeleteBackup={handleDeleteBackup}
            />
          )}
          {activeTab === 'performance' && (
            <PerformanceTab onClearCache={handleClearCache} />
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
              <Checkbox
                variant="primary"
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

      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={closeConfirmModal}
        title={confirmModal.title}
        message={confirmModal.message}
        onConfirm={confirmModal.onConfirm}
        confirmVariant={confirmModal.confirmVariant}
        confirmText="Confirm"
        cancelText="Cancel"
      />
    </div>
  );
};

export default SystemManagement;
