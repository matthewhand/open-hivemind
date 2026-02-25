/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowDownTrayIcon as DownloadIcon,
  DocumentTextIcon as DocIcon,
  CodeBracketIcon as ApiIcon,
  TrashIcon,
  ArrowPathIcon as RestoreIcon,
  PlusIcon,
  ArchiveBoxArrowDownIcon as BackupIcon,
  CircleStackIcon as DatabaseIcon,
} from '@heroicons/react/24/outline';
import { Alert, ToastNotification } from '../components/DaisyUI';
import Modal from '../components/DaisyUI/Modal';
import { apiService } from '../services/api';

const ExportPage: React.FC = () => {
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Backups State
  const [backups, setBackups] = useState<any[]>([]);
  const [loadingBackups, setLoadingBackups] = useState(false);

  // Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBackupName, setNewBackupName] = useState('');
  const [newBackupDesc, setNewBackupDesc] = useState('');
  const [creatingBackup, setCreatingBackup] = useState(false);

  // Restore/Delete State
  const [confirmAction, setConfirmAction] = useState<{ type: 'restore' | 'delete', item: any } | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBackups = useCallback(async () => {
    setLoadingBackups(true);
    try {
      const data = await apiService.listSystemBackups();
      setBackups(data);
    } catch (error) {
      console.error('Failed to fetch backups:', error);
      // Don't show toast on load failure to avoid spam if API is down
    } finally {
      setLoadingBackups(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

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
    setCreatingBackup(true);
    try {
      await apiService.createSystemBackup({
        name: newBackupName,
        description: newBackupDesc,
      });
      setToast({ message: 'Backup created successfully', type: 'success' });
      setShowCreateModal(false);
      setNewBackupName('');
      setNewBackupDesc('');
      fetchBackups();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'Failed to create backup', type: 'error' });
    } finally {
      setCreatingBackup(false);
    }
  };

  const handleRestore = async () => {
    if (!confirmAction || confirmAction.type !== 'restore') return;
    setActionLoading(true);
    try {
      await apiService.restoreSystemBackup(confirmAction.item.id);
      setToast({ message: 'System restored successfully', type: 'success' });
      setConfirmAction(null);
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'Failed to restore backup', type: 'error' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirmAction || confirmAction.type !== 'delete') return;
    setActionLoading(true);
    try {
      await apiService.deleteSystemBackup(confirmAction.item.id);
      setToast({ message: 'Backup deleted successfully', type: 'success' });
      setConfirmAction(null);
      fetchBackups();
    } catch (error) {
      setToast({ message: error instanceof Error ? error.message : 'Failed to delete backup', type: 'error' });
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
        setToast({ message: error instanceof Error ? error.message : 'Failed to export config', type: 'error' });
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
    <div className="p-6 space-y-8">
      <div className="flex justify-between items-start">
        <div>
            <h1 className="text-3xl font-bold mb-2">
            Export & System Data
            </h1>
            <p className="text-base-content/70">
            Download API specifications, export configurations, and manage system backups.
            </p>
        </div>
        <div className="flex gap-2">
            <button className="btn btn-outline" onClick={handleExportConfig}>
                <DownloadIcon className="w-4 h-4 mr-2" />
                Export Config
            </button>
            <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Backup
            </button>
        </div>
      </div>

      {/* System Backups Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
            <div className="flex items-center gap-2 mb-4">
                <DatabaseIcon className="w-6 h-6 text-primary" />
                <h2 className="card-title">System Backups</h2>
            </div>

            {loadingBackups ? (
                <div className="flex justify-center py-8">
                    <span className="loading loading-spinner loading-lg text-primary"></span>
                </div>
            ) : backups.length === 0 ? (
                <div className="text-center py-8 text-base-content/50">
                    <BackupIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                    <p>No backups found</p>
                    <button className="btn btn-sm btn-ghost mt-2" onClick={() => setShowCreateModal(true)}>Create one now</button>
                </div>
            ) : (
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
                            {backups.map((backup) => (
                                <tr key={backup.id} className="hover">
                                    <td>
                                        <div className="font-bold">{backup.name}</div>
                                        <div className="text-xs text-base-content/50">{backup.description}</div>
                                    </td>
                                    <td>{new Date(backup.createdAt).toLocaleString()}</td>
                                    <td>{(backup.size / 1024).toFixed(2)} KB</td>
                                    <td className="text-right">
                                        <div className="join">
                                            <a
                                                href={`/api/import-export/backups/${backup.id}/download`}
                                                className="btn btn-sm btn-ghost join-item"
                                                title="Download"
                                                target="_blank"
                                                rel="noopener noreferrer"
                                            >
                                                <DownloadIcon className="w-4 h-4" />
                                            </a>
                                            <button
                                                className="btn btn-sm btn-ghost join-item text-warning"
                                                title="Restore"
                                                onClick={() => setConfirmAction({ type: 'restore', item: backup })}
                                            >
                                                <RestoreIcon className="w-4 h-4" />
                                            </button>
                                            <button
                                                className="btn btn-sm btn-ghost join-item text-error"
                                                title="Delete"
                                                onClick={() => setConfirmAction({ type: 'delete', item: backup })}
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

      {/* Create Backup Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create System Backup"
      >
        <div className="space-y-4">
            <p className="text-sm text-base-content/70">
                Create a snapshot of the current system configuration. This includes all bots, providers, and settings.
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
                <textarea
                    className="textarea textarea-bordered h-24"
                    placeholder="Brief description of this backup..."
                    value={newBackupDesc}
                    onChange={(e) => setNewBackupDesc(e.target.value)}
                ></textarea>
            </div>
            <div className="modal-action">
                <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button
                    className="btn btn-primary"
                    onClick={handleCreateBackup}
                    disabled={!newBackupName.trim() || creatingBackup}
                >
                    {creatingBackup ? <span className="loading loading-spinner loading-xs"></span> : 'Create Backup'}
                </button>
            </div>
        </div>
      </Modal>

      {/* Confirmation Modal */}
      <Modal
        isOpen={!!confirmAction}
        onClose={() => setConfirmAction(null)}
        title={confirmAction?.type === 'restore' ? 'Restore Backup' : 'Delete Backup'}
      >
        <div className="space-y-4">
            <p>
                Are you sure you want to {confirmAction?.type} <strong>{confirmAction?.item?.name}</strong>?
            </p>
            {confirmAction?.type === 'restore' && (
                <div className="alert alert-warning text-sm">
                    <RestoreIcon className="w-4 h-4" />
                    <span>Current configuration will be overwritten. This cannot be undone.</span>
                </div>
            )}
            <div className="modal-action">
                <button className="btn btn-ghost" onClick={() => setConfirmAction(null)}>Cancel</button>
                <button
                    className={`btn ${confirmAction?.type === 'delete' ? 'btn-error' : 'btn-warning'}`}
                    onClick={confirmAction?.type === 'restore' ? handleRestore : handleDelete}
                    disabled={actionLoading}
                >
                    {actionLoading ? <span className="loading loading-spinner loading-xs"></span> : confirmAction?.type === 'restore' ? 'Restore' : 'Delete'}
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
