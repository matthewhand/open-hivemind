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
} from '@heroicons/react/24/outline';
import { Alert, Modal, Button, Input, Textarea, PageHeader, EmptyState, StatsCards } from '../components/DaisyUI';
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
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchBackups = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.listSystemBackups();
      setBackups(data);
    } catch (err) {
      console.error('Failed to fetch backups:', err);
      setToast({ message: 'Failed to load backups', type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleCreateBackup = async () => {
    if (!newBackupName.trim()) return;
    try {
      setActionLoading('create');
      await apiService.createSystemBackup({
        name: newBackupName,
        description: newBackupDesc,
      });
      setToast({ message: 'Backup created successfully', type: 'success' });
      setCreateModalOpen(false);
      setNewBackupName('');
      setNewBackupDesc('');
      fetchBackups();
    } catch (err) {
      setToast({ message: err instanceof Error ? err.message : 'Failed to create backup', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this backup? This action cannot be undone.')) return;
    try {
      setActionLoading(id);
      await apiService.deleteSystemBackup(id);
      setToast({ message: 'Backup deleted successfully', type: 'success' });
      fetchBackups();
    } catch (err) {
      setToast({ message: 'Failed to delete backup', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestoreBackup = async (id: string) => {
    if (!window.confirm('Are you sure you want to restore this backup? Current configuration will be overwritten.')) return;
    try {
      setActionLoading(id);
      await apiService.restoreSystemBackup(id, { overwrite: true });
      setToast({ message: 'System restored successfully. Reloading...', type: 'success' });
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setToast({ message: 'Failed to restore backup', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDownloadBackup = async (id: string, name: string) => {
    try {
      setActionLoading(id);
      const blob = await apiService.downloadSystemBackup(id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${name}-${new Date().toISOString().split('T')[0]}.json.gz`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setToast({ message: 'Failed to download backup', type: 'error' });
    } finally {
      setActionLoading(null);
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
    } catch (err) {
      setToast({ message: 'Failed to export configuration', type: 'error' });
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


  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const stats = React.useMemo(() => {
    const totalBackups = backups.length;
    const totalSize = backups.reduce((acc, b) => acc + b.size, 0);
    const lastBackup = backups.length > 0
      ? new Date(Math.max(...backups.map(b => new Date(b.createdAt).getTime()))).toLocaleDateString()
      : 'N/A';

    return [
      {
        id: 'total-backups',
        title: 'Total Backups',
        value: totalBackups,
        icon: 'database',
        color: 'primary' as const,
      },
      {
        id: 'total-size',
        title: 'Total Size',
        value: formatBytes(totalSize),
        icon: 'storage',
        color: 'secondary' as const,
      },
      {
        id: 'last-backup',
        title: 'Latest Backup',
        value: lastBackup,
        icon: 'clock',
        color: 'accent' as const,
      },
    ];
  }, [backups]);

  const statsRef = React.useRef<HTMLDivElement>(null);

  const handleDownloadStatsImage = () => {
    if (!statsRef.current) return;

    // Create a canvas from the stats element
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = 800;
    canvas.height = 200;

    // Fill background
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw stats text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 24px sans-serif';
    ctx.fillText('Backup Statistics', 20, 40);

    ctx.font = '16px sans-serif';
    stats.forEach((stat, index) => {
      ctx.fillStyle = '#a0a0a0';
      ctx.fillText(`${stat.title}:`, 20, 80 + (index * 35));
      ctx.fillStyle = '#00d9ff';
      ctx.fillText(String(stat.value), 200, 80 + (index * 35));
    });

    // Download as image
    const link = document.createElement('a');
    link.download = `backup-stats-${new Date().toISOString().split('T')[0]}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="p-6 space-y-8">
      <PageHeader
        title="Export & System Data"
        description="Manage system backups, export configurations, and access API specifications."
        icon={BackupIcon}
        gradient="secondary"
      />

      <div ref={statsRef} className="relative">
        <button
          className="btn btn-sm btn-ghost absolute top-0 right-0 z-10"
          onClick={handleDownloadStatsImage}
          title="Download stats as image"
        >
          <DownloadIcon className="w-4 h-4" /> Save as Image
        </button>
        <StatsCards stats={stats} isLoading={loading && backups.length === 0} />
      </div>

      {/* System Backups Section */}
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h2 className="card-title text-xl">System Backups</h2>
              <p className="text-sm text-base-content/70">Create and manage full system configuration backups.</p>
            </div>
            <button
              className="btn btn-primary gap-2"
              onClick={() => setCreateModalOpen(true)}
            >
              <PlusIcon className="w-4 h-4" /> Create Backup
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="table w-full">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Description</th>
                  <th>Size</th>
                  <th>Created</th>
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
                    <td colSpan={5}>
                      <EmptyState
                        title="No backups found"
                        description="Create your first backup to secure your configuration."
                        icon={BackupIcon}
                        variant="noData"
                      />
                    </td>
                  </tr>
                ) : (
                  backups.map((backup) => (
                    <tr key={backup.id} className="hover">
                      <td className="font-bold">{backup.name}</td>
                      <td className="text-sm text-base-content/70 truncate max-w-xs" title={backup.description}>
                        {backup.description || '-'}
                      </td>
                      <td className="font-mono text-sm">{formatBytes(backup.size)}</td>
                      <td className="text-sm">{new Date(backup.createdAt).toLocaleString()}</td>
                      <td className="flex justify-end gap-2">
                        <button
                          className="btn btn-ghost btn-xs tooltip tooltip-left"
                          data-tip="Restore"
                          onClick={() => handleRestoreBackup(backup.id)}
                          disabled={actionLoading === backup.id}
                        >
                          <RestoreIcon className="w-4 h-4 text-warning" />
                        </button>
                        <button
                          className="btn btn-ghost btn-xs tooltip tooltip-left"
                          data-tip="Download"
                          onClick={() => handleDownloadBackup(backup.id, backup.name)}
                          disabled={actionLoading === backup.id}
                        >
                          <DownloadIcon className="w-4 h-4 text-primary" />
                        </button>
                        <button
                          className="btn btn-ghost btn-xs tooltip tooltip-left"
                          data-tip="Delete"
                          onClick={() => handleDeleteBackup(backup.id)}
                          disabled={actionLoading === backup.id}
                        >
                          <TrashIcon className="w-4 h-4 text-error" />
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Export */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title flex items-center gap-2">
              <DocIcon className="w-5 h-5 text-primary" />
              Configuration Export
            </h2>
            <p className="text-sm text-base-content/70 mb-4">
              Export the current running configuration as a JSON file. Useful for debugging or manual migration.
            </p>
            <div className="card-actions justify-end mt-auto">
              <button className="btn btn-outline" onClick={handleExportConfig}>
                <DownloadIcon className="w-4 h-4 mr-2" /> Export Config
              </button>
            </div>
          </div>
        </div>

        {/* API Specs */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title flex items-center gap-2">
              <ApiIcon className="w-5 h-5 text-secondary" />
              API Specifications
            </h2>
            <p className="text-sm text-base-content/70 mb-4">
              Download the OpenAPI specification for integration and development.
            </p>
            <div className="card-actions justify-end gap-2 mt-auto">
              <button className="btn btn-outline btn-sm" onClick={() => handleDownloadOpenAPI('json')}>
                JSON
              </button>
              <button className="btn btn-outline btn-sm" onClick={() => handleDownloadOpenAPI('yaml')}>
                YAML
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
        size="sm"
      >
        <div className="space-y-4">
          <div className="form-control w-full">
            <label className="label" htmlFor="backup-name">
              <span className="label-text">Backup Name</span>
            </label>
            <Input
              id="backup-name"
              placeholder="e.g. pre-update-backup"
              value={newBackupName}
              onChange={(e) => setNewBackupName(e.target.value)}
              required
            />
          </div>
          <div className="form-control w-full">
            <label className="label" htmlFor="backup-desc">
              <span className="label-text">Description (Optional)</span>
            </label>
            <Textarea
              id="backup-desc"
              placeholder="Briefly describe this backup..."
              value={newBackupDesc}
              onChange={(e) => setNewBackupDesc(e.target.value)}
            />
          </div>
          <div className="modal-action">
            <Button variant="ghost" onClick={() => setCreateModalOpen(false)}>Cancel</Button>
            <Button
              variant="primary"
              onClick={handleCreateBackup}
              loading={actionLoading === 'create'}
              disabled={!newBackupName.trim()}
            >
              Create Backup
            </Button>
          </div>
        </div>
      </Modal>

      {toast && (
        <div className="toast toast-top toast-end">
          <div className={`alert ${toast.type === 'success' ? 'alert-success' : 'alert-error'}`}>
            <span>{toast.message}</span>
            <button onClick={() => setToast(null)} className="btn btn-sm btn-ghost">✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportPage;
