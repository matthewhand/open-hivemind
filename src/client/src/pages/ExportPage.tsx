/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  ArrowDownTrayIcon as DownloadIcon,
  DocumentTextIcon as DocIcon,
  CodeBracketIcon as ApiIcon,
  ArchiveBoxIcon,
  TrashIcon,
  ArrowPathIcon,
  PlusIcon,
  CpuChipIcon,
} from '@heroicons/react/24/outline';
import { Alert, ToastNotification } from '../components/DaisyUI';
import Modal from '../components/DaisyUI/Modal';
import { apiService } from '../services/api';

const ExportPage: React.FC = () => {
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Create Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBackupName, setNewBackupName] = useState('');
  const [newBackupDesc, setNewBackupDesc] = useState('');

  // Delete Modal State
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [backupToDelete, setBackupToDelete] = useState<any>(null);

  // Restore Modal State
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [backupToRestore, setBackupToRestore] = useState<any>(null);

  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBackups = async () => {
    setLoading(true);
    try {
      const data = await apiService.listSystemBackups();
      // Sort by createdAt descending
      const sorted = data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setBackups(sorted);
    } catch (error) {
      console.error('Failed to list backups', error);
      // Don't toast on initial load failure to avoid spam if API is down
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBackups();
  }, []);

  const handleCreateBackup = async () => {
    if (!newBackupName.trim()) {
        setToast({ message: 'Backup name is required', type: 'error' });
        return;
    }

    try {
        setActionLoading('create');
        await apiService.createSystemBackup({
            name: newBackupName,
            description: newBackupDesc,
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
        setActionLoading(null);
    }
  };

  const handleDeleteBackup = async () => {
    if (!backupToDelete) return;

    try {
        setActionLoading('delete');
        await apiService.deleteSystemBackup(backupToDelete.id);
        setToast({ message: 'Backup deleted successfully', type: 'success' });
        setShowDeleteModal(false);
        setBackupToDelete(null);
        await fetchBackups();
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
    if (!backupToRestore) return;

    try {
        setActionLoading('restore');
        await apiService.restoreSystemBackup(backupToRestore.id);
        setToast({ message: 'System restored successfully. Reloading...', type: 'success' });
        setShowRestoreModal(false);
        setBackupToRestore(null);
        // Reload page after a short delay to reflect restored state
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
        a.download = `hivemind-config-${new Date().toISOString().split('T')[0]}.json`;
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
      title: 'System Configuration',
      description: 'Export all bot and system configurations as a JSON file',
      icon: <CpuChipIcon className="w-6 h-6" />,
      action: handleExportConfig,
    }
  ];

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Export & System Data
        </h1>
        <p className="text-base-content/70">
          Download API specifications, export configurations, and manage system backups.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Exports */}
        <div className="lg:col-span-1 space-y-6">
             <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                <h2 className="card-title mb-2">
                    Exports
                </h2>
                <p className="text-sm text-base-content/70 mb-6">
                    Download specifications and configuration files.
                </p>

                <div className="divide-y divide-base-200">
                    {exportOptions.map((option) => (
                    <div key={option.title} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-base-200 rounded-lg text-primary">
                                {option.icon}
                            </div>
                            <div>
                                <h3 className="font-bold text-sm">{option.title}</h3>
                            </div>
                        </div>
                        <p className="text-xs text-base-content/70">{option.description}</p>
                        <button
                        className="btn btn-outline btn-sm w-full"
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
        </div>

        {/* Right Column: Backups */}
        <div className="lg:col-span-2">
            <div className="card bg-base-100 shadow-xl h-full">
                <div className="card-body">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="card-title">System Backups</h2>
                            <p className="text-sm text-base-content/70">
                                Create and manage full system backups.
                            </p>
                        </div>
                        <button
                            className="btn btn-primary btn-sm"
                            onClick={() => setShowCreateModal(true)}
                        >
                            <PlusIcon className="w-4 h-4 mr-2" />
                            Create Backup
                        </button>
                    </div>

                    {loading && backups.length === 0 ? (
                         <div className="flex justify-center py-8">
                            <span className="loading loading-spinner loading-md"></span>
                         </div>
                    ) : backups.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 border-2 border-dashed border-base-200 rounded-lg">
                            <ArchiveBoxIcon className="w-12 h-12 text-base-content/20 mb-2" />
                            <p className="text-base-content/50">No backups found</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="table table-zebra w-full">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Created</th>
                                        <th>Size</th>
                                        <th className="text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {backups.map((backup) => (
                                        <tr key={backup.id}>
                                            <td>
                                                <div className="font-bold">{backup.name}</div>
                                                <div className="text-xs opacity-50">{backup.description}</div>
                                            </td>
                                            <td className="text-sm">
                                                {new Date(backup.createdAt).toLocaleDateString()}
                                                <br/>
                                                <span className="text-xs opacity-50">{new Date(backup.createdAt).toLocaleTimeString()}</span>
                                            </td>
                                            <td className="font-mono text-xs">
                                                {(backup.size / 1024).toFixed(2)} KB
                                            </td>
                                            <td className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <a
                                                        href={apiService.getBackupDownloadUrl(backup.id)}
                                                        className="btn btn-ghost btn-xs tooltip tooltip-left"
                                                        data-tip="Download"
                                                        download
                                                    >
                                                        <DownloadIcon className="w-4 h-4" />
                                                    </a>
                                                    <button
                                                        className="btn btn-ghost btn-xs tooltip tooltip-left text-warning"
                                                        data-tip="Restore"
                                                        onClick={() => {
                                                            setBackupToRestore(backup);
                                                            setShowRestoreModal(true);
                                                        }}
                                                    >
                                                        <ArrowPathIcon className="w-4 h-4" />
                                                    </button>
                                                    <button
                                                        className="btn btn-ghost btn-xs tooltip tooltip-left text-error"
                                                        data-tip="Delete"
                                                        onClick={() => {
                                                            setBackupToDelete(backup);
                                                            setShowDeleteModal(true);
                                                        }}
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
        </div>
      </div>

      {/* Create Backup Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create System Backup"
        size="sm"
      >
        <div className="space-y-4">
            <p className="text-sm text-base-content/70">
                This will create a backup of all bot configurations, system settings, and profiles.
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
                    placeholder="Brief description"
                    value={newBackupDesc}
                    onChange={(e) => setNewBackupDesc(e.target.value)}
                />
            </div>
            <div className="flex justify-end gap-2 mt-6">
                <button className="btn btn-ghost" onClick={() => setShowCreateModal(false)}>Cancel</button>
                <button
                    className="btn btn-primary"
                    onClick={handleCreateBackup}
                    disabled={actionLoading === 'create' || !newBackupName.trim()}
                >
                    {actionLoading === 'create' ? <span className="loading loading-spinner loading-xs" /> : 'Create Backup'}
                </button>
            </div>
        </div>
      </Modal>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={showRestoreModal}
        onClose={() => setShowRestoreModal(false)}
        title="Restore System Backup"
        size="sm"
      >
        <div className="space-y-4">
            <div className="alert alert-warning">
                <span className="font-bold">Warning:</span>
                <span className="text-sm">This will overwrite all current configurations with the backup data. This action cannot be undone.</span>
            </div>
            <p>
                Are you sure you want to restore from <strong>{backupToRestore?.name}</strong>?
            </p>
            <div className="flex justify-end gap-2 mt-6">
                <button className="btn btn-ghost" onClick={() => setShowRestoreModal(false)}>Cancel</button>
                <button
                    className="btn btn-warning"
                    onClick={handleRestoreBackup}
                    disabled={actionLoading === 'restore'}
                >
                    {actionLoading === 'restore' ? <span className="loading loading-spinner loading-xs" /> : 'Restore System'}
                </button>
            </div>
        </div>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Backup"
        size="sm"
      >
        <div className="space-y-4">
            <p>
                Are you sure you want to delete the backup <strong>{backupToDelete?.name}</strong>?
            </p>
            <p className="text-sm text-base-content/70">This action cannot be undone.</p>
            <div className="flex justify-end gap-2 mt-6">
                <button className="btn btn-ghost" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button
                    className="btn btn-error"
                    onClick={handleDeleteBackup}
                    disabled={actionLoading === 'delete'}
                >
                    {actionLoading === 'delete' ? <span className="loading loading-spinner loading-xs" /> : 'Delete Backup'}
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
