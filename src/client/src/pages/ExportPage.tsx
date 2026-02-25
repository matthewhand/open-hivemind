/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  Download,
  FileText,
  FileCode,
  Archive,
  Trash2,
  RefreshCw,
  Plus,
  AlertCircle,
  Database,
  Upload
} from 'lucide-react';
import { Alert, ToastNotification, Modal } from '../components/DaisyUI';
import { apiService } from '../services/api';

interface Backup {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  size: number;
  format: string;
  checksum: string;
}

const ExportPage: React.FC = () => {
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Modal States
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);

  // Form States
  const [newBackupName, setNewBackupName] = useState('');
  const [newBackupDesc, setNewBackupDesc] = useState('');

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const data = await apiService.listSystemBackups();
      setBackups(data || []);
    } catch (error) {
      console.error('Failed to fetch backups:', error);
      setToast({
        message: error instanceof Error ? error.message : 'Failed to fetch backups',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleDownloadOpenAPI = async (format: 'json' | 'yaml') => {
    try {
      const response = await fetch(`/webui/api/openapi.${format}`);
      if (!response.ok) {
        throw new Error('Failed to download OpenAPI spec');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `openapi-spec.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setToast({ message: `OpenAPI ${format.toUpperCase()} spec downloaded successfully`, type: 'success' });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to download OpenAPI spec',
        type: 'error',
      });
    }
  };

  const handleCreateBackup = async () => {
    if (!newBackupName.trim()) return;

    setActionLoading('create');
    try {
      await apiService.createSystemBackup({
        name: newBackupName,
        description: newBackupDesc
      });
      setToast({ message: 'Backup created successfully', type: 'success' });
      setCreateModalOpen(false);
      setNewBackupName('');
      setNewBackupDesc('');
      fetchBackups();
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to create backup',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this backup? This action cannot be undone.')) return;

    setActionLoading(id);
    try {
      await apiService.deleteSystemBackup(id);
      setToast({ message: 'Backup deleted successfully', type: 'success' });
      fetchBackups();
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to delete backup',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;

    setActionLoading('restore');
    try {
      await apiService.restoreSystemBackup(selectedBackup.id);
      setToast({ message: 'System restored successfully. Reloading...', type: 'success' });
      setRestoreModalOpen(false);
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to restore backup',
        type: 'error',
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadBackup = async (backup: Backup) => {
    try {
      setToast({ message: 'Starting download...', type: 'success' });

      const blob = await apiService.downloadSystemBackup(backup.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Use the filename from header if possible, or construct one
      a.download = `backup-${backup.name}-${new Date(backup.createdAt).getTime()}.json.gz`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Download failed',
        type: 'error',
      });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Export & System Data
        </h1>
        <p className="text-base-content/70">
          Manage system backups, export configurations, and access API documentation.
        </p>
      </div>

      {/* System Backups Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="card-title flex items-center gap-2">
                <Database className="w-5 h-5 text-primary" />
                System Backups
              </h2>
              <p className="text-sm text-base-content/70 mt-1">
                Create and manage full system configuration backups.
              </p>
            </div>
            <div className="flex gap-2">
                <button
                    className="btn btn-ghost btn-sm"
                    onClick={fetchBackups}
                    disabled={loading}
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
                <button
                    className="btn btn-primary btn-sm"
                    onClick={() => setCreateModalOpen(true)}
                >
                    <Plus className="w-4 h-4 mr-1" />
                    Create Backup
                </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Created</th>
                  <th>Size</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {backups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-base-content/50">
                      {loading ? 'Loading backups...' : 'No backups found. Create one to get started.'}
                    </td>
                  </tr>
                ) : (
                  backups.map((backup) => (
                    <tr key={backup.id}>
                      <td>
                        <div className="font-bold">{backup.name}</div>
                        {backup.description && (
                            <div className="text-xs opacity-60">{backup.description}</div>
                        )}
                      </td>
                      <td className="text-sm">
                        {new Date(backup.createdAt).toLocaleString()}
                      </td>
                      <td className="font-mono text-sm">
                        {formatSize(backup.size)}
                      </td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-xs btn-outline"
                            onClick={() => handleDownloadBackup(backup)}
                            title="Download Backup"
                          >
                            <Download className="w-3 h-3" />
                          </button>
                          <button
                            className="btn btn-xs btn-outline btn-warning"
                            onClick={() => {
                                setSelectedBackup(backup);
                                setRestoreModalOpen(true);
                            }}
                            title="Restore Backup"
                          >
                            <Upload className="w-3 h-3" />
                          </button>
                          <button
                            className="btn btn-xs btn-outline btn-error"
                            onClick={() => handleDeleteBackup(backup.id)}
                            disabled={actionLoading === backup.id}
                            title="Delete Backup"
                          >
                            {actionLoading === backup.id ? (
                                <span className="loading loading-spinner loading-xs" />
                            ) : (
                                <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* API Specs Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title flex items-center gap-2 mb-2">
            <FileCode className="w-5 h-5 text-secondary" />
            API Specifications
          </h2>
          <p className="text-sm text-base-content/70 mb-6">
            Export the OpenAPI specification for integration and development.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-base-100 rounded text-secondary">
                        <FileCode className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold">OpenAPI JSON</h3>
                        <p className="text-xs opacity-70">JSON Format</p>
                    </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleDownloadOpenAPI('json')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </button>
            </div>

            <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-base-100 rounded text-secondary">
                        <FileText className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold">OpenAPI YAML</h3>
                        <p className="text-xs opacity-70">YAML Format</p>
                    </div>
                </div>
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => handleDownloadOpenAPI('yaml')}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Backup Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create System Backup"
      >
        <div className="space-y-4">
            <p className="text-sm opacity-70">
                This will create a full backup of all configurations (bots, personas, profiles).
            </p>

            <div className="form-control w-full">
                <label className="label">
                    <span className="label-text">Backup Name</span>
                </label>
                <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="e.g. pre-update-backup"
                    value={newBackupName}
                    onChange={(e) => setNewBackupName(e.target.value)}
                />
            </div>

            <div className="form-control w-full">
                <label className="label">
                    <span className="label-text">Description (Optional)</span>
                </label>
                <input
                    type="text"
                    className="input input-bordered w-full"
                    placeholder="Brief description of this backup"
                    value={newBackupDesc}
                    onChange={(e) => setNewBackupDesc(e.target.value)}
                />
            </div>

            <div className="modal-action">
                <button className="btn btn-ghost" onClick={() => setCreateModalOpen(false)}>Cancel</button>
                <button
                    className="btn btn-primary"
                    onClick={handleCreateBackup}
                    disabled={actionLoading === 'create' || !newBackupName.trim()}
                >
                    {actionLoading === 'create' ? <span className="loading loading-spinner" /> : 'Create Backup'}
                </button>
            </div>
        </div>
      </Modal>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={restoreModalOpen}
        onClose={() => setRestoreModalOpen(false)}
        title="Restore System Backup"
      >
        <div className="space-y-4">
            <div className="alert alert-warning">
                <AlertCircle className="w-6 h-6" />
                <span>Warning: This will overwrite your current configuration!</span>
            </div>

            <p>
                Are you sure you want to restore from backup <strong>{selectedBackup?.name}</strong>?
            </p>
            <p className="text-sm opacity-70">
                The system will reload after restoration. Current changes since this backup will be lost.
            </p>

            <div className="modal-action">
                <button className="btn btn-ghost" onClick={() => setRestoreModalOpen(false)}>Cancel</button>
                <button
                    className="btn btn-error"
                    onClick={handleRestoreBackup}
                    disabled={actionLoading === 'restore'}
                >
                    {actionLoading === 'restore' ? <span className="loading loading-spinner" /> : 'Restore System'}
                </button>
            </div>
        </div>
      </Modal>

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

export default ExportPage;
