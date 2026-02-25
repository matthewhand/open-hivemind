/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  Download, FileJson, FileCode, Archive, Trash2, RotateCcw, Plus, AlertCircle, CheckCircle, Server, RefreshCw
} from 'lucide-react';
import { apiService } from '../services/api';
import { Alert, ToastNotification } from '../components/DaisyUI';
import Modal from '../components/DaisyUI/Modal';

interface Backup {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  size: number;
  format: string;
}

const ExportPage: React.FC = () => {
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBackupName, setNewBackupName] = useState('');
  const [newBackupDesc, setNewBackupDesc] = useState('');

  // Restore Modal State
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);

  const fetchBackups = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.listSystemBackups();
      // Ensure date strings are parsed correctly for sorting if needed
      setBackups(data.map(b => ({
        ...b,
        createdAt: b.createdAt || b.timestamp // Handle potential API inconsistencies
      })));
    } catch (error) {
      console.error('Failed to fetch backups:', error);
      setToast({ message: 'Failed to load system backups', type: 'error' });
    } finally {
      setIsLoading(false);
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

    setIsActionLoading('create');
    try {
      await apiService.createSystemBackup({
        name: newBackupName,
        description: newBackupDesc
      });
      setToast({ message: 'Backup created successfully', type: 'success' });
      setShowCreateModal(false);
      setNewBackupName('');
      setNewBackupDesc('');
      await fetchBackups();
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to create backup',
        type: 'error',
      });
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) return;

    setIsActionLoading(id);
    try {
      await apiService.deleteSystemBackup(id);
      setToast({ message: 'Backup deleted successfully', type: 'success' });
      await fetchBackups();
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to delete backup',
        type: 'error',
      });
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;

    setIsActionLoading('restore');
    try {
      await apiService.restoreSystemBackup(selectedBackup.id);
      setToast({ message: 'System restored successfully. Reloading...', type: 'success' });
      setShowRestoreModal(false);
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to restore backup',
        type: 'error',
      });
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleDownloadBackup = async (backup: Backup) => {
    try {
      const blob = await apiService.downloadSystemBackup(backup.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${backup.name}.json.gz`; // Assuming format
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to download backup',
        type: 'error',
      });
    }
  };

  const handleExportConfig = async () => {
    try {
      const blob = await apiService.exportConfig();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `config-export-${new Date().toISOString()}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setToast({ message: 'Configuration exported successfully', type: 'success' });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to export configuration',
        type: 'error',
      });
    }
  };

  const formatBytes = (bytes: number, decimals = 2) => {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
  };

  return (
    <div className="p-6 space-y-8">
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
                <Archive className="w-6 h-6 text-primary" />
                System Backups
              </h2>
              <p className="text-sm text-base-content/70">
                Create and manage full system snapshots.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-ghost btn-sm"
                onClick={fetchBackups}
                disabled={isLoading}
              >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setShowCreateModal(true)}
              >
                <Plus className="w-4 h-4 mr-1" />
                Create Backup
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Date</th>
                  <th>Size</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && backups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-base-content/50">
                      Loading backups...
                    </td>
                  </tr>
                ) : backups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="text-center py-8 text-base-content/50">
                      No backups found. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  backups.map((backup) => (
                    <tr key={backup.id} className="hover">
                      <td>
                        <div className="font-bold">{backup.name}</div>
                        <div className="text-xs opacity-50">{backup.description}</div>
                      </td>
                      <td className="font-mono text-sm">
                        {new Date(backup.createdAt).toLocaleString()}
                      </td>
                      <td className="font-mono text-sm">
                        {formatBytes(backup.size)}
                      </td>
                      <td className="text-right space-x-2">
                        <button
                          className="btn btn-ghost btn-xs"
                          onClick={() => handleDownloadBackup(backup)}
                          title="Download Backup"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          className="btn btn-ghost btn-xs text-warning"
                          onClick={() => { setSelectedBackup(backup); setShowRestoreModal(true); }}
                          title="Restore Backup"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => handleDeleteBackup(backup.id)}
                          disabled={isActionLoading === backup.id}
                          title="Delete Backup"
                        >
                          {isActionLoading === backup.id ? (
                            <span className="loading loading-spinner loading-xs" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Configuration Export */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title flex items-center gap-2">
              <Server className="w-6 h-6 text-secondary" />
              Configuration
            </h2>
            <p className="text-sm text-base-content/70 mb-4">
              Export the current bot and system configuration as a JSON file.
            </p>
            <div className="card-actions justify-end mt-auto">
              <button
                className="btn btn-secondary btn-sm"
                onClick={handleExportConfig}
              >
                <Download className="w-4 h-4 mr-2" />
                Export Config
              </button>
            </div>
          </div>
        </div>

        {/* API Specs */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title flex items-center gap-2">
              <FileCode className="w-6 h-6 text-accent" />
              API Specifications
            </h2>
            <p className="text-sm text-base-content/70 mb-4">
              Download OpenAPI specifications for integration.
            </p>
            <div className="card-actions justify-end gap-2 mt-auto">
              <button
                className="btn btn-outline btn-accent btn-sm"
                onClick={() => handleDownloadOpenAPI('json')}
              >
                <FileJson className="w-4 h-4 mr-2" />
                JSON
              </button>
              <button
                className="btn btn-outline btn-accent btn-sm"
                onClick={() => handleDownloadOpenAPI('yaml')}
              >
                <FileCode className="w-4 h-4 mr-2" />
                YAML
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Backup Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create System Backup"
      >
        <div className="space-y-4">
          <p className="text-sm text-base-content/70">
            Create a full snapshot of the current system configuration.
          </p>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Backup Name</span>
            </label>
            <input
              type="text"
              placeholder="e.g. pre-deployment-backup"
              className="input input-bordered w-full"
              value={newBackupName}
              onChange={(e) => setNewBackupName(e.target.value)}
            />
          </div>
          <div className="form-control">
            <label className="label">
              <span className="label-text">Description (Optional)</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-24"
              placeholder="Backup details..."
              value={newBackupDesc}
              onChange={(e) => setNewBackupDesc(e.target.value)}
            />
          </div>
          <div className="modal-action">
            <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleCreateBackup}
              disabled={!newBackupName.trim() || isActionLoading === 'create'}
            >
              {isActionLoading === 'create' ? <span className="loading loading-spinner" /> : 'Create Backup'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        title="Restore System Backup"
      >
        <div className="space-y-4">
          <div className="alert alert-warning">
            <AlertCircle className="w-6 h-6" />
            <div>
              <h3 className="font-bold">Warning: Irreversible Action</h3>
              <div className="text-xs">Restoring will overwrite current configuration.</div>
            </div>
          </div>
          <p>
            Are you sure you want to restore <strong>{selectedBackup?.name}</strong>?
          </p>
          <div className="modal-action">
            <button className="btn btn-ghost" onClick={() => setShowRestoreModal(false)}>Cancel</button>
            <button
              className="btn btn-error"
              onClick={handleRestoreBackup}
              disabled={isActionLoading === 'restore'}
            >
              {isActionLoading === 'restore' ? <span className="loading loading-spinner" /> : 'Confirm Restore'}
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
