/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars, react-refresh/only-export-components, no-empty, no-case-declarations */
import React, { useState, useEffect, useCallback } from 'react';
import Card from './DaisyUI/Card';
import Badge from './DaisyUI/Badge';
import Button from './DaisyUI/Button';
import Modal from './DaisyUI/Modal';
import Input from './DaisyUI/Input';
import { Alert } from './DaisyUI/Alert';
import { Loading } from './DaisyUI/Loading';
import Toggle from './DaisyUI/Toggle';
import Tooltip from './DaisyUI/Tooltip';
import {
  PlusIcon,
  PencilIcon,
  TrashIcon,
  ShieldCheckIcon,
  LockClosedIcon,
  LockOpenIcon,
  ArrowDownTrayIcon,
  ArrowUpTrayIcon,
} from '@heroicons/react/24/outline';
import { apiService } from '../services/api';
import type { SecureConfig } from '../services/api';

interface SecureConfigManagerProps {
  onRefresh?: () => void;
}

const SecureConfigManager: React.FC<SecureConfigManagerProps> = ({ onRefresh }) => {
  const [configs, setConfigs] = useState<SecureConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SecureConfig | null>(null);
  const [backupDialogOpen, setBackupDialogOpen] = useState(false);
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false);
  const [toast, setToast] = useState<{ show: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    show: false,
    message: '',
    type: 'info',
  });

  const [formData, setFormData] = useState({
    name: '',
    data: {},
    rotationInterval: 0,
    encryptSensitive: true,
  });
  const [backupFile, setBackupFile] = useState('');

  const fetchConfigs = useCallback(async () => {
    try {
      setLoading(true);
      const response = await apiService.getSecureConfigs();
      setConfigs(response.configs || []);
    } catch (error) {
      console.error('Failed to load secure configs:', error);
      showToast('Failed to load secure configurations', 'error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const showToast = (message: string, type: 'success' | 'error' | 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast(prev => ({ ...prev, show: false })), 3000);
  };

  const resetForm = () => {
    setFormData({ name: '', data: {}, rotationInterval: 0, encryptSensitive: true });
    setEditingConfig(null);
  };

  const handleOpenDialog = async (config?: SecureConfig) => {
    if (config) {
      try {
        const response = await apiService.getSecureConfig(config.id);
        const fullConfig = response.config;
        setEditingConfig(fullConfig);
        setFormData({
          name: fullConfig.name,
          data: fullConfig.data || {},
          rotationInterval: fullConfig.rotationInterval || 0,
          encryptSensitive: fullConfig.encrypted ?? true
        });
      } catch (error) {
        showToast('Failed to load configuration details', 'error');
        return;
      }
    } else {
      resetForm();
    }
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!formData.name) {
      showToast('Please enter a configuration name', 'error');
      return;
    }

    try {
      if (editingConfig) {
        await apiService.saveSecureConfig(editingConfig.name, formData.data, formData.encryptSensitive);
        showToast(`Configuration "${formData.name}" updated successfully`, 'success');
      } else {
        await apiService.saveSecureConfig(formData.name, formData.data, formData.encryptSensitive);
        showToast(`Configuration "${formData.name}" created successfully`, 'success');
      }
      handleCloseDialog();
      fetchConfigs();
      onRefresh?.();
    } catch (error) {
      showToast('Failed to save configuration', 'error');
    }
  };

  const handleDeleteConfig = async (configId: string) => {
    const config = configs.find(c => c.id === configId);
    if (!config || !confirm(`Are you sure you want to delete configuration "${config.name}"?`)) {return;}
    try {
      await apiService.deleteSecureConfig(configId);
      showToast(`Configuration "${config.name}" deleted successfully`, 'success');
      fetchConfigs();
      onRefresh?.();
    } catch (error) {
      showToast('Failed to delete configuration', 'error');
    }
  };

  const handleBackup = async () => {
    try {
      const response = await apiService.backupSecureConfigs();
      showToast(response.message || 'Backup created successfully', 'success');
      setBackupDialogOpen(false);
    } catch {
      showToast('Failed to create backup', 'error');
    }
  };

  const handleRestore = async () => {
    if (!backupFile) {
      showToast('Please select a backup file', 'error');
      return;
    }
    try {
      const response = await apiService.restoreSecureConfigs(backupFile);
      showToast(response.message || 'Configuration restored successfully', 'success');
      setRestoreDialogOpen(false);
      setBackupFile('');
      onRefresh?.();
    } catch {
      showToast('Failed to restore configuration', 'error');
    }
  };

  const formatDate = (dateString: string) => new Date(dateString).toLocaleString();
  const formatBytes = (obj: Record<string, unknown>) => new Blob([JSON.stringify(obj)]).size;

  if (loading) {
    return (
      <Card>
        <div className="flex justify-center items-center py-8">
          <span className="loading loading-spinner loading-lg"></span>
          <p className="ml-4">Loading secure configurations...</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheckIcon className="w-6 h-6" />
            <h2 className="text-lg font-semibold">Secure Configuration Manager</h2>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" buttonStyle="outline" onClick={() => setBackupDialogOpen(true)} className="flex items-center gap-2">
              <ArrowDownTrayIcon className="w-4 h-4" />
              Backup
            </Button>
            <Button variant="secondary" buttonStyle="outline" onClick={() => setRestoreDialogOpen(true)} className="flex items-center gap-2">
              <ArrowUpTrayIcon className="w-4 h-4" />
              Restore
            </Button>
            <Button variant="primary" onClick={() => handleOpenDialog()} className="flex items-center gap-2">
              <PlusIcon className="w-4 h-4" />
              Add Config
            </Button>
          </div>
        </div>

        <p className="text-sm text-base-content/70 mb-6">Manage encrypted configuration files and secure data storage.</p>

        <div className="space-y-2">
          {configs.map((config) => (
            <div key={config.id} className="flex items-center gap-3 p-4 bg-base-200 rounded-box hover:bg-base-300 transition-colors">
              <div className="flex-shrink-0">
                {config.encrypted ? <LockClosedIcon className="w-5 h-5 text-error" /> : <LockOpenIcon className="w-5 h-5 text-success" />}
              </div>

              <div className="flex-grow">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium">{config.name}</span>
                  <Badge variant={config.encrypted ? 'error' : 'success'} size="sm" style="outline">
                    {config.encrypted ? 'Encrypted' : 'Plain Text'}
                  </Badge>
                  {config.rotationInterval && config.rotationInterval > 0 && (
                    <Badge variant="info" size="sm" style="outline" className="ml-2">
                      Rotation: {config.rotationInterval}d
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-base-content/70">
                  {config.data ? Object.keys(config.data).length : 0} keys • {config.data ? formatBytes(config.data) : 0} bytes
                </p>
                <p className="text-xs text-base-content/60">Updated: {formatDate(config.updatedAt)}</p>
              </div>

              <div className="flex gap-2">
                <Button variant="ghost" size="sm" className="btn-circle" onClick={() => handleOpenDialog(config)} aria-label="Edit Configuration">
                  <PencilIcon className="w-4 h-4" />
                </Button>
                <Button variant="ghost" size="sm" className="btn-circle text-error" onClick={() => handleDeleteConfig(config.id)} aria-label="Delete Configuration">
                  <TrashIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>

        {configs.length === 0 && (
          <div className="text-center py-8 text-base-content/70">
            No secure configurations found. Create your first configuration to get started.
          </div>
        )}
      </Card>

      {/* Add/Edit Configuration Modal */}
      <Modal isOpen={dialogOpen} onClose={handleCloseDialog} title={editingConfig ? 'Edit Secure Configuration' : 'Add New Secure Configuration'}>
        <div className="space-y-4 py-4">
          <div className="form-control">
            <label className="label"><span className="label-text">Configuration Name *</span></label>
            <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} placeholder="e.g., discord-tokens, api-keys" />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text">Rotation Interval (days)</span>
              <span className="label-text-alt text-base-content/60">Optional</span>
            </label>
            <Input
              type="number"
              min="0"
              value={formData.rotationInterval}
              onChange={(e) => setFormData({ ...formData, rotationInterval: parseInt(e.target.value) || 0 })}
              placeholder="e.g., 30 for monthly rotation"
            />
            <label className="label">
              <span className="label-text-alt">Set to 0 to disable rotation warnings</span>
            </label>
          </div>

          <Toggle label="Encrypt sensitive data" checked={formData.encryptSensitive} onChange={(e) => setFormData({ ...formData, encryptSensitive: e.target.checked })} color="primary" />

          <Alert status="info" message="Configuration data should be provided as JSON. Sensitive values will be automatically encrypted if encryption is enabled." />

          <div className="form-control">
            <label className="label"><span className="label-text">Configuration Data (JSON)</span></label>
            <textarea
              className="textarea textarea-bordered font-mono"
              rows={8}
              value={JSON.stringify(formData.data, null, 2)}
              onChange={(e) => {
                try {
                  const parsed = JSON.parse(e.target.value);
                  setFormData({ ...formData, data: parsed });
                } catch { }
              }}
              placeholder='{"key": "value", "secret": "••••••••"}'
            />
          </div>
        </div>
        <div className="modal-action">
          <Button onClick={handleCloseDialog} variant="ghost">Cancel</Button>
          <Button onClick={handleSubmit} variant="primary" disabled={!formData.name}>
            {editingConfig ? 'Update Configuration' : 'Add Configuration'}
          </Button>
        </div>
      </Modal>

      {/* Backup Modal */}
      <Modal isOpen={backupDialogOpen} onClose={() => setBackupDialogOpen(false)} title="Create Backup">
        <div className="py-4">
          <p className="mb-4 text-sm">Create a backup of all secure configurations. This will download an encrypted backup file.</p>
          <Alert status="warning" message="Store backup files securely and do not share them with unauthorized users." />
        </div>
        <div className="modal-action">
          <Button onClick={() => setBackupDialogOpen(false)} variant="ghost">Cancel</Button>
          <Button onClick={handleBackup} variant="primary" className="flex items-center gap-2">
            <ArrowDownTrayIcon className="w-4 h-4" />
            Create Backup
          </Button>
        </div>
      </Modal>

      {/* Restore Modal */}
      <Modal isOpen={restoreDialogOpen} onClose={() => setRestoreDialogOpen(false)} title="Restore from Backup">
        <div className="space-y-4 py-4">
          <p className="text-sm">Restore configurations from a backup file. This will replace all existing secure configurations.</p>
          <div className="form-control">
            <label className="label"><span className="label-text">Backup File Path</span></label>
            <Input value={backupFile} onChange={(e) => setBackupFile(e.target.value)} placeholder="/path/to/backup.enc" />
          </div>
          <Alert status="error" message="Warning: This will replace all existing secure configurations. Make sure you have a current backup before proceeding." />
        </div>
        <div className="modal-action">
          <Button onClick={() => setRestoreDialogOpen(false)} variant="ghost">Cancel</Button>
          <Button onClick={handleRestore} variant="primary" className="btn-error flex items-center gap-2">
            <ArrowUpTrayIcon className="w-4 h-4" />
            Restore Backup
          </Button>
        </div>
      </Modal>

      {/* Toast */}
      {toast.show && (
        <div className="toast toast-end toast-bottom z-50">
          <div className={`alert ${toast.type === 'success' ? 'alert-success' : toast.type === 'error' ? 'alert-error' : 'alert-info'}`}>
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </>
  );
};

export default SecureConfigManager;