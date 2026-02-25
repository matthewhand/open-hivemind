/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  ArrowDownTrayIcon as DownloadIcon,
  DocumentTextIcon as DocIcon,
  CodeBracketIcon as ApiIcon,
  ArchiveBoxIcon as ArchiveIcon,
  TrashIcon,
  ArrowPathIcon as RestoreIcon,
  PlusIcon,
  ExclamationTriangleIcon as AlertIcon
} from '@heroicons/react/24/outline';
import { ToastNotification } from '../components/DaisyUI';
import Modal from '../components/DaisyUI/Modal';
import { apiService } from '../services/api';

interface Backup {
  id: string;
  name: string;
  description: string;
  size: number;
  createdAt: string;
  createdBy: string;
}

const ExportPage: React.FC = () => {
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newBackupName, setNewBackupName] = useState('');
  const [newBackupDesc, setNewBackupDesc] = useState('');
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const data = await apiService.listSystemBackups();
      setBackups(data);
    } catch (error) {
      console.error('Failed to fetch backups:', error);
      setToast({ message: 'Failed to fetch backups list', type: 'error' });
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

  const handleExportConfig = async () => {
    try {
      const blob = await apiService.exportConfig();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `hivemind-config-${new Date().toISOString()}.json`;
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

  const handleCreateBackup = async () => {
    if (!newBackupName.trim()) return;
    try {
      await apiService.createSystemBackup({
        name: newBackupName,
        description: newBackupDesc,
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
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this backup?')) return;
    try {
      await apiService.deleteSystemBackup(id);
      setToast({ message: 'Backup deleted successfully', type: 'success' });
      fetchBackups();
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to delete backup',
        type: 'error',
      });
    }
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackup) return;
    try {
      await apiService.restoreSystemBackup(selectedBackup.id);
      setToast({ message: 'System restored successfully', type: 'success' });
      setRestoreModalOpen(false);
      setSelectedBackup(null);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to restore backup',
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
      description: 'Export all bot and system settings as a JSON file',
      icon: <ArchiveIcon className="w-6 h-6" />,
      action: handleExportConfig,
    },
  ];

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

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title mb-4">
            Exports & Specifications
          </h2>
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

      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-6">
            <div>
                <h2 className="card-title">System Backups</h2>
                <p className="text-sm text-base-content/70">Create and manage full system snapshots.</p>
            </div>
            <button
                className="btn btn-primary btn-sm"
                onClick={() => setCreateModalOpen(true)}
            >
                <PlusIcon className="w-4 h-4 mr-2" />
                Create Backup
            </button>
          </div>

          {loading ? (
             <div className="flex justify-center py-8">
                <span className="loading loading-spinner loading-lg"></span>
             </div>
          ) : backups.length === 0 ? (
            <div className="text-center py-8 text-base-content/50">
                <ArchiveIcon className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p>No backups found. Create one to get started.</p>
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
                        <div className="text-xs opacity-50">{backup.description}</div>
                      </td>
                      <td>{new Date(backup.createdAt).toLocaleString()}</td>
                      <td>{formatSize(backup.size)}</td>
                      <td className="text-right space-x-2">
                         <a
                            href={apiService.getBackupDownloadUrl(backup.id)}
                            className="btn btn-ghost btn-xs tooltip"
                            data-tip="Download"
                            target="_blank"
                            rel="noopener noreferrer"
                         >
                            <DownloadIcon className="w-4 h-4" />
                         </a>
                         <button
                            className="btn btn-ghost btn-xs text-warning tooltip"
                            data-tip="Restore"
                            onClick={() => {
                                setSelectedBackup(backup);
                                setRestoreModalOpen(true);
                            }}
                         >
                            <RestoreIcon className="w-4 h-4" />
                         </button>
                         <button
                            className="btn btn-ghost btn-xs text-error tooltip"
                            data-tip="Delete"
                            onClick={() => handleDeleteBackup(backup.id)}
                         >
                            <TrashIcon className="w-4 h-4" />
                         </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Create System Backup"
      >
        <div className="form-control w-full">
          <label className="label">
            <span className="label-text">Backup Name</span>
          </label>
          <input
            type="text"
            placeholder="e.g. pre-update-backup"
            className="input input-bordered w-full"
            value={newBackupName}
            onChange={(e) => setNewBackupName(e.target.value)}
          />
        </div>
        <div className="form-control w-full mt-4">
          <label className="label">
            <span className="label-text">Description (Optional)</span>
          </label>
          <input
            type="text"
            placeholder="Brief description"
            className="input input-bordered w-full"
            value={newBackupDesc}
            onChange={(e) => setNewBackupDesc(e.target.value)}
          />
        </div>
        <div className="modal-action">
             <button className="btn" onClick={() => setCreateModalOpen(false)}>Cancel</button>
             <button
                className="btn btn-primary"
                onClick={handleCreateBackup}
                disabled={!newBackupName.trim()}
             >
                Create
             </button>
        </div>
      </Modal>

      <Modal
        isOpen={restoreModalOpen}
        onClose={() => setRestoreModalOpen(false)}
        title="Restore System Backup"
      >
        <div className="alert alert-warning shadow-lg mb-4">
            <div>
                <AlertIcon className="stroke-current flex-shrink-0 h-6 w-6" />
                <span>Warning: Restoring will overwrite current configuration!</span>
            </div>
        </div>
        <p>Are you sure you want to restore <strong>{selectedBackup?.name}</strong>?</p>
        <p className="text-sm opacity-70 mt-2">This action cannot be undone.</p>
        <div className="modal-action">
             <button className="btn" onClick={() => setRestoreModalOpen(false)}>Cancel</button>
             <button className="btn btn-warning" onClick={handleRestoreBackup}>
                Confirm Restore
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
