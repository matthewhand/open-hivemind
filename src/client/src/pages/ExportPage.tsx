/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect } from 'react';
import {
  ArrowDownTrayIcon as DownloadIcon,
  DocumentTextIcon as DocIcon,
  CodeBracketIcon as ApiIcon,
  TrashIcon,
  ArrowPathIcon as RestoreIcon,
  ArchiveBoxIcon,
  PlusIcon,
} from '@heroicons/react/24/outline';
import { Alert, ToastNotification } from '../components/DaisyUI';
import { apiService } from '../services/api';

const ExportPage: React.FC = () => {
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchBackups = async () => {
    try {
      setLoading(true);
      const data = await apiService.listSystemBackups();
      setBackups(data);
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

  const handleDownloadBackup = async (backup: any) => {
    try {
      const blob = await apiService.downloadSystemBackup(backup.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      // Construct filename from backup metadata or default
      const filename = `backup-${backup.name}-${new Date(backup.createdAt).getTime()}.json.gz`;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setToast({ message: 'Backup downloaded successfully', type: 'success' });
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to download backup',
        type: 'error',
      });
    }
  };

  const handleDeleteBackup = async (backupId: string) => {
    if (!window.confirm('Are you sure you want to delete this backup?')) return;

    try {
      await apiService.deleteSystemBackup(backupId);
      setToast({ message: 'Backup deleted successfully', type: 'success' });
      fetchBackups();
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to delete backup',
        type: 'error',
      });
    }
  };

  const handleRestoreBackup = async (backupId: string) => {
    if (!window.confirm('Are you sure you want to restore this backup? This will overwrite current configurations.')) return;

    try {
      await apiService.restoreSystemBackup(backupId);
      setToast({ message: 'System restored successfully. Reloading...', type: 'success' });
      setTimeout(() => window.location.reload(), 2000);
    } catch (error) {
      setToast({
        message: error instanceof Error ? error.message : 'Failed to restore backup',
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

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">
          Export & System Data
        </h1>
        <p className="text-base-content/70">
          Manage system backups, export configurations, and access API documentation.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content: Backups List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="card-title">System Backups</h2>
                  <p className="text-sm text-base-content/70">Manage configuration snapshots and system backups.</p>
                </div>
                <button
                  className="btn btn-primary btn-sm gap-2"
                  onClick={() => (document.getElementById('create_backup_modal') as HTMLDialogElement)?.showModal()}
                >
                  <PlusIcon className="w-4 h-4" />
                  Create Backup
                </button>
              </div>

              {loading ? (
                 <div className="flex justify-center py-8">
                   <span className="loading loading-spinner loading-md"></span>
                 </div>
              ) : backups.length === 0 ? (
                <div className="text-center py-8 bg-base-200 rounded-lg">
                  <ArchiveBoxIcon className="w-12 h-12 mx-auto text-base-content/30 mb-2" />
                  <p className="text-base-content/60">No backups found.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="table w-full">
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
                        <tr key={backup.id} className="hover">
                          <td>
                            <div className="font-bold">{backup.name}</div>
                            <div className="text-xs text-base-content/50">{backup.description}</div>
                          </td>
                          <td className="text-sm">
                            {new Date(backup.createdAt).toLocaleDateString()}
                            <div className="text-xs text-base-content/50">
                              {new Date(backup.createdAt).toLocaleTimeString()}
                            </div>
                          </td>
                          <td className="font-mono text-sm">{formatBytes(backup.size)}</td>
                          <td className="text-right">
                            <div className="flex justify-end gap-2">
                              <button
                                className="btn btn-ghost btn-xs tooltip tooltip-left"
                                data-tip="Download"
                                onClick={() => handleDownloadBackup(backup)}
                              >
                                <DownloadIcon className="w-4 h-4" />
                              </button>
                              <button
                                className="btn btn-ghost btn-xs text-warning tooltip tooltip-left"
                                data-tip="Restore"
                                onClick={() => handleRestoreBackup(backup.id)}
                              >
                                <RestoreIcon className="w-4 h-4" />
                              </button>
                              <button
                                className="btn btn-ghost btn-xs text-error tooltip tooltip-left"
                                data-tip="Delete"
                                onClick={() => handleDeleteBackup(backup.id)}
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

        {/* Sidebar: API Specs & Tools */}
        <div className="space-y-6">
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
                  <div key={option.title} className="flex flex-col gap-2 py-4">
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
                      className="btn btn-outline btn-sm w-full mt-2"
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
      </div>

      {/* Create Backup Modal */}
      <dialog id="create_backup_modal" className="modal">
        <div className="modal-box">
          <form method="dialog">
            <button className="btn btn-sm btn-circle btn-ghost absolute right-2 top-2">✕</button>
          </form>
          <CreateBackupForm onSuccess={() => {
            (document.getElementById('create_backup_modal') as HTMLDialogElement)?.close();
            fetchBackups();
          }} />
        </div>
      </dialog>

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

// Subcomponent for Create Backup Form
const CreateBackupForm: React.FC<{ onSuccess: () => void }> = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setLoading(true);
      setError(null);
      await apiService.createSystemBackup({ name, description });
      setName('');
      setDescription('');
      onSuccess();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h3 className="font-bold text-lg mb-4">Create System Backup</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-control">
          <label className="label">
            <span className="label-text">Backup Name</span>
          </label>
          <input
            type="text"
            placeholder="e.g. pre-deployment-backup"
            className="input input-bordered w-full"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            pattern="[a-zA-Z0-9_\-]+"
            title="Only letters, numbers, underscores, and hyphens allowed"
          />
        </div>
        <div className="form-control">
          <label className="label">
            <span className="label-text">Description (Optional)</span>
          </label>
          <textarea
            className="textarea textarea-bordered"
            placeholder="Brief description of this backup..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          ></textarea>
        </div>

        {error && (
          <div className="alert alert-error text-sm py-2">
            <span>{error}</span>
          </div>
        )}

        <div className="modal-action">
          <button
            type="submit"
            className={`btn btn-primary ${loading ? 'loading' : ''}`}
            disabled={loading || !name.trim()}
          >
            {loading ? 'Creating...' : 'Create Backup'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ExportPage;