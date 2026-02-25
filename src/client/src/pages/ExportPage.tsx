/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback } from 'react';
import {
  ArrowDownTrayIcon as DownloadIcon,
  DocumentTextIcon as DocIcon,
  CodeBracketIcon as ApiIcon,
  ArchiveBoxIcon as BackupIcon,
  PlusIcon,
  TrashIcon,
  ArrowPathIcon as RestoreIcon,
  CircleStackIcon as DatabaseIcon,
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
  checksum: string;
  createdBy: string;
}

const ExportPage: React.FC = () => {
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBackupName, setNewBackupName] = useState('');
  const [newBackupDesc, setNewBackupDesc] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBackups = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.listSystemBackups();
      setBackups(data);
    } catch (error) {
      console.error('Failed to fetch backups:', error);
      setToast({ message: 'Failed to load backups', type: 'error' });
    } finally {
      setLoading(false);
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
    if (!confirm('Are you sure you want to delete this backup?')) return;

    try {
      setActionLoading(id);
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

  const handleRestoreBackup = async (id: string) => {
    if (!confirm('Are you sure you want to restore this backup? Current configuration will be overwritten.')) return;

    try {
      setActionLoading(id);
      await apiService.restoreSystemBackup(id);
      setToast({ message: 'System restored successfully. Reloading...', type: 'success' });
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

  const handleExportConfig = async () => {
    try {
      setActionLoading('export-config');
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
    } finally {
      setActionLoading(null);
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
  ];

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Export & System Data
        </h1>
        <p className="text-base-content/70">
          Manage system backups, export configurations, and download API specifications.
        </p>
      </div>

      {/* System Backups Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="card-title flex items-center gap-2">
                <BackupIcon className="w-6 h-6 text-primary" />
                System Backups
              </h2>
              <p className="text-sm text-base-content/70">
                Create and manage full system backups including all configurations.
              </p>
            </div>
            <button
              className="btn btn-primary btn-sm"
              onClick={() => setShowCreateModal(true)}
            >
              <PlusIcon className="w-4 h-4 mr-1" />
              Create Backup
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table table-zebra w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Created</th>
                  <th>Size</th>
                  <th>Created By</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8">
                      <span className="loading loading-spinner loading-md"></span>
                    </td>
                  </tr>
                ) : backups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-base-content/50">
                      No backups found. Create one to get started.
                    </td>
                  </tr>
                ) : (
                  backups.map((backup) => (
                    <tr key={backup.id}>
                      <td>
                        <div className="font-bold">{backup.name}</div>
                        <div className="text-xs opacity-50">{backup.description}</div>
                      </td>
                      <td>{new Date(backup.createdAt).toLocaleString()}</td>
                      <td>{formatSize(backup.size)}</td>
                      <td>{backup.createdBy}</td>
                      <td className="text-right space-x-2">
                        <a
                          href={`/api/import-export/backups/${backup.id}/download`}
                          className="btn btn-ghost btn-xs"
                          title="Download Backup"
                          download
                        >
                          <DownloadIcon className="w-4 h-4" />
                        </a>
                        <button
                          className="btn btn-ghost btn-xs text-warning"
                          onClick={() => handleRestoreBackup(backup.id)}
                          disabled={actionLoading === backup.id}
                          title="Restore Backup"
                        >
                          {actionLoading === backup.id ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            <RestoreIcon className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          className="btn btn-ghost btn-xs text-error"
                          onClick={() => handleDeleteBackup(backup.id)}
                          disabled={actionLoading === backup.id}
                          title="Delete Backup"
                        >
                          {actionLoading === backup.id ? (
                            <span className="loading loading-spinner loading-xs"></span>
                          ) : (
                            <TrashIcon className="w-4 h-4" />
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

      {/* Configuration Export Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="card-title flex items-center gap-2">
                <DatabaseIcon className="w-6 h-6 text-secondary" />
                Configuration Export
              </h2>
              <p className="text-sm text-base-content/70">
                Export current bot and system configurations as JSON.
              </p>
            </div>
            <button
              className="btn btn-outline btn-secondary btn-sm"
              onClick={handleExportConfig}
              disabled={actionLoading === 'export-config'}
            >
              {actionLoading === 'export-config' ? (
                <span className="loading loading-spinner loading-xs mr-2"></span>
              ) : (
                <DownloadIcon className="w-4 h-4 mr-2" />
              )}
              Export Config
            </button>
          </div>
        </div>
      </div>

      {/* API Specs Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title mb-2 flex items-center gap-2">
            <ApiIcon className="w-6 h-6 text-accent" />
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
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-base-content/70">
            Create a backup of all system configurations, including bots, personas, and profiles.
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
              placeholder="Backup description..."
              value={newBackupDesc}
              onChange={(e) => setNewBackupDesc(e.target.value)}
            ></textarea>
          </div>
          <div className="flex justify-end gap-2 mt-6">
            <button
              className="btn btn-ghost"
              onClick={() => setShowCreateModal(false)}
            >
              Cancel
            </button>
            <button
              className="btn btn-primary"
              onClick={handleCreateBackup}
              disabled={!newBackupName.trim() || actionLoading === 'create'}
            >
              {actionLoading === 'create' ? (
                <span className="loading loading-spinner loading-xs mr-2"></span>
              ) : null}
              Create Backup
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