/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  ArrowDownTrayIcon as DownloadIcon,
  DocumentTextIcon as DocIcon,
  CodeBracketIcon as ApiIcon,
  ArchiveBoxIcon as BackupIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon as RestoreIcon,
  CogIcon,
} from '@heroicons/react/24/outline';
import { Alert, ToastNotification } from '../components/DaisyUI';
import Modal from '../components/DaisyUI/Modal';
import EmptyState from '../components/DaisyUI/EmptyState';
import { apiService } from '../services/api';

const ExportPage: React.FC = () => {
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);

  // Modal states
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; backup: any | null }>({ isOpen: false, backup: null });
  const [restoreModal, setRestoreModal] = useState<{ isOpen: boolean; backup: any | null }>({ isOpen: false, backup: null });
  const [createModal, setCreateModal] = useState({ isOpen: false, name: '', description: '' });
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    setLoadingBackups(true);
    try {
      const data = await apiService.listSystemBackups();
      setBackups(data);
    } catch (error) {
      console.error('Failed to fetch backups', error);
      // Fails silently on initial load or shows a subtle error if needed
    } finally {
      setLoadingBackups(false);
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

  const handleDownloadBackup = async (backup: any) => {
    try {
      const blob = await apiService.downloadSystemBackup(backup.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${backup.name}-${new Date(backup.createdAt).getTime()}.json.gz`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setToast({ message: 'Backup download started', type: 'success' });
    } catch (error) {
      console.error('Download error:', error);
      setToast({ message: 'Failed to download backup', type: 'error' });
    }
  };

  const handleDeleteConfirm = async () => {
    if (!deleteModal.backup) return;

    setActionLoading(true);
    try {
      await apiService.deleteSystemBackup(deleteModal.backup.id);
      setToast({ message: 'Backup deleted successfully', type: 'success' });
      setDeleteModal({ isOpen: false, backup: null });
      fetchBackups();
    } catch (error) {
      setToast({ message: 'Failed to delete backup', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRestoreConfirm = async () => {
    if (!restoreModal.backup) return;

    setActionLoading(true);
    try {
      await apiService.restoreSystemBackup(restoreModal.backup.id, { overwrite: true });
      setToast({ message: 'System restored successfully. Reloading configuration...', type: 'success' });
      setRestoreModal({ isOpen: false, backup: null });
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      setToast({ message: 'Failed to restore system', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!createModal.name.trim()) return;

    setActionLoading(true);
    try {
      await apiService.createSystemBackup({
        name: createModal.name,
        description: createModal.description
      });
      setToast({ message: 'Backup created successfully', type: 'success' });
      setCreateModal({ isOpen: false, name: '', description: '' });
      fetchBackups();
    } catch (error) {
      setToast({ message: 'Failed to create backup', type: 'error' });
    } finally {
      setActionLoading(false);
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
      setToast({ message: 'Failed to export configuration', type: 'error' });
    }
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
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Export & System Data
        </h1>
        <p className="text-base-content/70">
          Download API specifications, manage system backups, and export configurations.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {/* API Specifications Section */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-2">
              API Specifications
            </h2>
            <p className="text-sm text-base-content/70 mb-6">
              Export the OpenAPI specification for the Open-Hivemind WebUI API endpoints.
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

        {/* System Backups Section */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="card-title">System Backups</h2>
                <p className="text-sm text-base-content/70 mt-1">
                  Create and manage full system configuration backups.
                </p>
              </div>
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setCreateModal({ isOpen: true, name: '', description: '' })}
              >
                <PlusIcon className="w-4 h-4 mr-1" />
                Create Backup
              </button>
            </div>

            {loadingBackups ? (
              <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg text-primary"></span>
              </div>
            ) : backups.length === 0 ? (
              <EmptyState
                icon={BackupIcon}
                title="No backups found"
                description="Create a backup to protect your configuration."
                actionLabel="Create Backup"
                onAction={() => setCreateModal({ isOpen: true, name: '', description: '' })}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="table w-full">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Created At</th>
                      <th>Size</th>
                      <th className="text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {backups.map((backup) => (
                      <tr key={backup.id} className="hover">
                        <td className="font-medium">
                          <div className="flex items-center gap-3">
                            <div className="p-2 bg-base-200 rounded-lg text-secondary">
                              <BackupIcon className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="font-bold">{backup.name}</div>
                              <div className="text-xs opacity-50">{backup.description || 'No description'}</div>
                            </div>
                          </div>
                        </td>
                        <td className="text-sm">
                          {new Date(backup.createdAt).toLocaleString()}
                        </td>
                        <td className="text-sm font-mono">
                          {(backup.size / 1024).toFixed(1)} KB
                        </td>
                        <td className="text-right">
                          <div className="join">
                            <button
                              className="btn btn-ghost btn-xs join-item tooltip"
                              data-tip="Download"
                              onClick={() => handleDownloadBackup(backup)}
                            >
                              <DownloadIcon className="w-4 h-4" />
                            </button>
                            <button
                              className="btn btn-ghost btn-xs join-item tooltip"
                              data-tip="Restore"
                              onClick={() => setRestoreModal({ isOpen: true, backup })}
                            >
                              <RestoreIcon className="w-4 h-4" />
                            </button>
                            <button
                              className="btn btn-ghost btn-xs join-item tooltip text-error"
                              data-tip="Delete"
                              onClick={() => setDeleteModal({ isOpen: true, backup })}
                            >
                              <TrashIcon className="w-4 h-4" />
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
        </div>

        {/* Configuration Export Section */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title mb-2">
              Configuration Export
            </h2>
            <p className="text-sm text-base-content/70 mb-4">
              Export the current bot and system configuration as a JSON file. This is useful for migrating to another instance or keeping a snapshot.
            </p>
            <div className="flex justify-end">
              <button className="btn btn-outline" onClick={handleExportConfig}>
                <CogIcon className="w-4 h-4 mr-2" />
                Export Configuration
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Create Backup Modal */}
      <Modal
        isOpen={createModal.isOpen}
        onClose={() => setCreateModal({ ...createModal, isOpen: false })}
        title="Create System Backup"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-base-content/70">
            Create a full backup of all configurations, including bots, personas, and system settings.
          </p>
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Backup Name</span>
            </label>
            <input
              type="text"
              className="input input-bordered w-full"
              placeholder="e.g. pre-upgrade-backup"
              value={createModal.name}
              onChange={(e) => setCreateModal({ ...createModal, name: e.target.value })}
              onKeyDown={(e) => e.key === 'Enter' && handleCreateBackup()}
            />
          </div>
          <div className="form-control w-full">
            <label className="label">
              <span className="label-text">Description (Optional)</span>
            </label>
            <textarea
              className="textarea textarea-bordered w-full"
              placeholder="e.g. Backup taken before updating bots"
              value={createModal.description}
              onChange={(e) => setCreateModal({ ...createModal, description: e.target.value })}
            />
          </div>
        </div>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={() => setCreateModal({ ...createModal, isOpen: false })}>Cancel</button>
          <button
            className="btn btn-primary"
            onClick={handleCreateBackup}
            disabled={actionLoading || !createModal.name.trim()}
          >
            {actionLoading ? <span className="loading loading-spinner loading-xs"></span> : 'Create Backup'}
          </button>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, backup: null })}
        title="Delete Backup"
        size="sm"
      >
        <div className="py-4">
          <p>Are you sure you want to delete the backup <strong>{deleteModal.backup?.name}</strong>?</p>
          <p className="text-sm text-error mt-2">This action cannot be undone.</p>
        </div>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={() => setDeleteModal({ isOpen: false, backup: null })}>Cancel</button>
          <button
            className="btn btn-error"
            onClick={handleDeleteConfirm}
            disabled={actionLoading}
          >
            {actionLoading ? <span className="loading loading-spinner loading-xs"></span> : 'Delete'}
          </button>
        </div>
      </Modal>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={restoreModal.isOpen}
        onClose={() => setRestoreModal({ isOpen: false, backup: null })}
        title="Restore System Backup"
        size="sm"
      >
        <div className="py-4">
          <div className="alert alert-warning mb-4">
            <span className="text-xs">Warning: This will overwrite your current configuration.</span>
          </div>
          <p>Are you sure you want to restore from <strong>{restoreModal.backup?.name}</strong>?</p>
          <p className="text-sm mt-2">The system will reload after restoration.</p>
        </div>
        <div className="modal-action">
          <button className="btn btn-ghost" onClick={() => setRestoreModal({ isOpen: false, backup: null })}>Cancel</button>
          <button
            className="btn btn-warning"
            onClick={handleRestoreConfirm}
            disabled={actionLoading}
          >
            {actionLoading ? <span className="loading loading-spinner loading-xs"></span> : 'Restore & Reload'}
          </button>
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
