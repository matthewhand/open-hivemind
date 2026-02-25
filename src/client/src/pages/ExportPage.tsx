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
} from '@heroicons/react/24/outline';
import { Modal, ToastNotification } from '../components/DaisyUI';
import { apiService } from '../services/api';

interface Backup {
  id: string;
  name: string;
  description?: string;
  size: number;
  createdAt: string;
  checksum?: string;
}

const ExportPage: React.FC = () => {
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Backup State
  const [backups, setBackups] = useState<Backup[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBackupName, setNewBackupName] = useState('');
  const [newBackupDesc, setNewBackupDesc] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  useEffect(() => {
    fetchBackups();
  }, []);

  const fetchBackups = async () => {
    setIsLoading(true);
    try {
      const data = await apiService.listSystemBackups();
      // Ensure date strings are handled if needed, usually API returns ISO strings
      setBackups(data);
    } catch (error) {
      console.error('Failed to list backups:', error);
      // Optional: show toast on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBackup = async () => {
    if (!newBackupName.trim()) {
      setToast({ message: 'Backup name is required', type: 'error' });
      return;
    }

    setIsCreating(true);
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
      setToast({
        message: error instanceof Error ? error.message : 'Failed to create backup',
        type: 'error'
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!confirm('Are you sure you want to delete this backup?')) return;

    try {
      await apiService.deleteSystemBackup(id);
      setToast({ message: 'Backup deleted successfully', type: 'success' });
      fetchBackups();
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to delete backup',
        type: 'error'
      });
    }
  };

  const handleDownloadBackup = async (backupId: string, backupName: string) => {
    try {
      const blob = await apiService.downloadSystemBackup(backupId);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${backupName}.json.gz`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setToast({ message: 'Backup downloaded successfully', type: 'success' });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to download backup',
        type: 'error'
      });
    }
  };

  const handleRestoreBackup = async (id: string) => {
    if (!confirm('Are you sure you want to restore this backup? Current configuration will be overwritten.')) return;

    try {
      await apiService.restoreSystemBackup(id);
      setToast({ message: 'System restored successfully. Reloading...', type: 'success' });
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to restore backup',
        type: 'error'
      });
    }
  };

  const handleExportConfig = async () => {
    try {
      const blob = await apiService.exportConfig();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `config-export-${new Date().toISOString().split('T')[0]}.json`;
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

  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Export & System Data
        </h1>
        <p className="text-base-content/70">
          Manage system backups, export configurations, and download API documentation.
        </p>
      </div>

      {/* System Backups Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="card-title">System Backups</h2>
              <p className="text-sm text-base-content/70">Create and manage full system configuration backups.</p>
            </div>
            <button
              className="btn btn-primary btn-sm gap-2"
              onClick={() => setShowCreateModal(true)}
            >
              <PlusIcon className="w-4 h-4" />
              Create Backup
            </button>
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
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="text-center py-4">
                      <span className="loading loading-spinner loading-md"></span>
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
                        {backup.description && (
                          <div className="text-xs opacity-50">{backup.description}</div>
                        )}
                      </td>
                      <td>{new Date(backup.createdAt).toLocaleString()}</td>
                      <td>{formatSize(backup.size)}</td>
                      <td>
                        <div className="flex gap-2">
                          <button
                            className="btn btn-ghost btn-xs tooltip"
                            data-tip="Download"
                            onClick={() => handleDownloadBackup(backup.id, backup.name)}
                          >
                            <DownloadIcon className="w-4 h-4" />
                          </button>
                          <button
                            className="btn btn-ghost btn-xs tooltip"
                            data-tip="Restore"
                            onClick={() => handleRestoreBackup(backup.id)}
                          >
                            <ArrowPathIcon className="w-4 h-4" />
                          </button>
                          <button
                            className="btn btn-ghost btn-xs text-error tooltip"
                            data-tip="Delete"
                            onClick={() => handleDeleteBackup(backup.id)}
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

      {/* Configuration Export Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title mb-2">
            Configuration Export
          </h2>
          <p className="text-sm text-base-content/70 mb-4">
            Export the current system configuration as a JSON file.
          </p>

          <div className="flex items-center justify-between p-4 bg-base-200 rounded-lg">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-primary/10 rounded-lg text-primary">
                <ArchiveBoxIcon className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold">Full Configuration</h3>
                <p className="text-sm text-base-content/70">Includes all bots, profiles, and settings</p>
              </div>
            </div>
            <button
              className="btn btn-outline btn-sm"
              onClick={handleExportConfig}
            >
              <DownloadIcon className="w-4 h-4 mr-2" />
              Export JSON
            </button>
          </div>
        </div>
      </div>

      {/* API Specs Section */}
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
          <div className="form-control">
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
          <div className="form-control">
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
            <button className="btn" onClick={() => setShowCreateModal(false)}>Cancel</button>
            <button
              className="btn btn-primary"
              onClick={handleCreateBackup}
              disabled={isCreating || !newBackupName.trim()}
            >
              {isCreating ? <span className="loading loading-spinner"></span> : 'Create'}
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
