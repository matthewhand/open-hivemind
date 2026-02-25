/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  ArrowDownTrayIcon as DownloadIcon,
  DocumentTextIcon as DocIcon,
  CodeBracketIcon as ApiIcon,
  TrashIcon,
  ArrowPathIcon,
  PlusIcon,
  ArchiveBoxIcon,
  ArrowUturnLeftIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Alert, ToastNotification } from '../components/DaisyUI';
import Modal from '../components/DaisyUI/Modal';
import { apiService } from '../services/api';

interface Backup {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  size: number;
  fileName: string;
  checksum: string;
}

const ExportPage: React.FC = () => {
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newBackupName, setNewBackupName] = useState('');
  const [newBackupDesc, setNewBackupDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [restoreConfirm, setRestoreConfirm] = useState<string | null>(null);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const data = await apiService.listSystemBackups();
      setBackups(data);
    } catch (error) {
      console.error('Failed to fetch backups:', error);
      setToast({ message: 'Failed to fetch system backups', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    if (!newBackupName.trim()) return;

    setIsCreating(true);
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
        type: 'error'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBackup = async () => {
    if (!deleteConfirm) return;

    try {
      await apiService.deleteSystemBackup(deleteConfirm);
      setToast({ message: 'Backup deleted successfully', type: 'success' });
      setDeleteConfirm(null);
      fetchBackups();
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to delete backup',
        type: 'error'
      });
    }
  };

  const handleRestoreBackup = async () => {
    if (!restoreConfirm) return;

    try {
      await apiService.restoreSystemBackup(restoreConfirm, { overwrite: true });
      setToast({ message: 'System restored successfully. Reloading...', type: 'success' });
      setRestoreConfirm(null);
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to restore backup',
        type: 'error'
      });
    }
  };

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

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const exportOptions = [
    {
      title: 'OpenAPI JSON',
      description: 'Download the complete API specification in JSON format',
      icon: <ApiIcon className="w-6 h-6" />,
      action: () => handleDownloadOpenAPI('json'),
    },
    {
      title: 'OpenAPI YAML',
      description: 'Download the complete API specification in YAML format',
      icon: <DocIcon className="w-6 h-6" />,
      action: () => handleDownloadOpenAPI('yaml'),
    },
    {
      title: 'Export Configuration',
      description: 'Export all bot and system configurations as JSON',
      icon: <ArchiveBoxIcon className="w-6 h-6" />,
      action: handleExportConfig,
    }
  ];

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Export & System Data
        </h1>
        <p className="text-base-content/70">
          Download API specifications, export configurations, and manage system backups.
        </p>
      </div>

      {/* API & Config Exports */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title mb-2">
            Specifications & Exports
          </h2>
          <p className="text-sm text-base-content/70 mb-6">
            Export system specifications and configuration data.
          </p>

          <div className="divide-y divide-base-200">
            {exportOptions.map((option) => (
              <div key={option.title} className="flex items-center justify-between py-4">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-base-200 rounded-lg text-primary">
                    {option.icon}
                  </div>
                  <div>
                    <h3 className="font-bold">{option.title}</h3>
                    <p className="text-sm text-base-content/70">{option.description}</p>
                  </div>
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  onClick={option.action}
                >
                  <DownloadIcon className="w-4 h-4 mr-2" />
                  Download
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* System Backups */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="card-title">System Backups</h2>
              <p className="text-sm text-base-content/70">
                Create and manage full system backups including all configurations.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                className="btn btn-ghost btn-sm"
                onClick={fetchBackups}
                disabled={loading}
              >
                <ArrowPathIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setCreateModalOpen(true)}
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Create Backup
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="table w-full">
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
                      <td className="font-mono text-sm">{formatSize(backup.size)}</td>
                      <td>
                        <div className="flex gap-2">
                          <a
                            href={apiService.getSystemBackupDownloadUrl(backup.id)}
                            className="btn btn-square btn-ghost btn-xs"
                            title="Download"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <DownloadIcon className="w-4 h-4" />
                          </a>
                          <button
                            className="btn btn-square btn-ghost btn-xs text-warning"
                            title="Restore"
                            onClick={() => setRestoreConfirm(backup.id)}
                          >
                            <ArrowUturnLeftIcon className="w-4 h-4" />
                          </button>
                          <button
                            className="btn btn-square btn-ghost btn-xs text-error"
                            title="Delete"
                            onClick={() => setDeleteConfirm(backup.id)}
                          >
                            <TrashIcon className="w-4 h-4" />
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

      {/* Create Backup Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => !isCreating && setCreateModalOpen(false)}
        title="Create System Backup"
      >
        <div className="space-y-4">
          <p className="text-sm text-base-content/70">
            Create a backup of all current bot configurations, settings, and profiles.
          </p>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Backup Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g. pre-deployment-backup"
              value={newBackupName}
              onChange={(e) => setNewBackupName(e.target.value)}
              disabled={isCreating}
            />
          </div>

          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Description (Optional)</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-24"
              placeholder="Brief description of this backup state..."
              value={newBackupDesc}
              onChange={(e) => setNewBackupDesc(e.target.value)}
              disabled={isCreating}
            />
          </div>

          <div className="modal-action">
            <button
              className="btn btn-ghost"
              onClick={() => setCreateModalOpen(false)}
              disabled={isCreating}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateBackup}
              disabled={isCreating || !newBackupName.trim()}
            >
              {isCreating ? <span className="loading loading-spinner loading-xs" /> : 'Create Backup'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        title="Delete Backup"
      >
        <div className="space-y-4">
          <div className="alert alert-warning shadow-sm">
            <ExclamationTriangleIcon className="w-6 h-6" />
            <span>Warning: This action cannot be undone.</span>
          </div>
          <p>Are you sure you want to delete this backup?</p>
          <div className="modal-action">
            <button className="btn btn-ghost" onClick={() => setDeleteConfirm(null)}>Cancel</button>
            <button className="btn btn-error" onClick={handleDeleteBackup}>Delete</button>
          </div>
        </div>
      </Modal>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={!!restoreConfirm}
        onClose={() => setRestoreConfirm(null)}
        title="Restore System"
      >
        <div className="space-y-4">
          <div className="alert alert-error shadow-sm">
            <ExclamationTriangleIcon className="w-6 h-6" />
            <span>Warning: This will overwrite current configurations!</span>
          </div>
          <p>
            Are you sure you want to restore the system from this backup?
            Current settings will be replaced and the system may restart.
          </p>
          <div className="modal-action">
            <button className="btn btn-ghost" onClick={() => setRestoreConfirm(null)}>Cancel</button>
            <button className="btn btn-error" onClick={handleRestoreBackup}>
              Restore System
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
