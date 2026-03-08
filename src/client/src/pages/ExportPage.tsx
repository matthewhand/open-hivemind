/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Download,
  FileText,
  Code,
  Archive,
  Plus,
  Trash2,
  RotateCcw,
  Search,
  HardDrive,
  Clock,
  DownloadCloud as DownloadIcon
} from 'lucide-react';
import { Alert, ToastNotification, Modal, Button, Input, Textarea, PageHeader, EmptyState, StatsCards } from '../components/DaisyUI';
import SearchFilterBar from '../components/SearchFilterBar';
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
  const [toast, setToast] = useState<{ title: string, message?: string, type: 'success' | 'error' } | null>(null);
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newBackupName, setNewBackupName] = useState('');
  const [newBackupDesc, setNewBackupDesc] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchBackups = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.listSystemBackups();
      setBackups(data);
    } catch (err) {
      console.error('Failed to fetch backups:', err);
      setToast({ title: 'Error', message: 'Failed to load backups', type: 'error' });
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
      setToast({ title: 'Success', message: 'Backup created successfully', type: 'success' });
      setCreateModalOpen(false);
      setNewBackupName('');
      setNewBackupDesc('');
      fetchBackups();
    } catch (err) {
      setToast({ title: 'Error', message: err instanceof Error ? err.message : 'Failed to create backup', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleDeleteBackup = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this backup? This action cannot be undone.')) return;
    try {
      setActionLoading(id);
      await apiService.deleteSystemBackup(id);
      setToast({ title: 'Success', message: 'Backup deleted successfully', type: 'success' });
      fetchBackups();
    } catch (err) {
      setToast({ title: 'Error', message: 'Failed to delete backup', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRestoreBackup = async (id: string) => {
    if (!window.confirm('Are you sure you want to restore this backup? Current configuration will be overwritten.')) return;
    try {
      setActionLoading(id);
      await apiService.restoreSystemBackup(id, { overwrite: true });
      setToast({ title: 'Success', message: 'System restored successfully. Reloading...', type: 'success' });
      setTimeout(() => window.location.reload(), 2000);
    } catch (err) {
      setToast({ title: 'Error', message: 'Failed to restore backup', type: 'error' });
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
      setToast({ title: 'Error', message: 'Failed to download backup', type: 'error' });
    } finally {
      setActionLoading(null);
    }
  };

  const [exportFormat, setExportFormat] = useState<'json' | 'csv' | 'yaml'>('json');

  const handleExportConfig = async () => {
    try {
      const blob = await apiService.exportConfig();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `config-export-${new Date().toISOString()}.${exportFormat}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      setToast({ title: 'Success', message: `Configuration exported successfully as ${exportFormat.toUpperCase()}`, type: 'success' });
    } catch (err) {
      setToast({ title: 'Error', message: 'Failed to export configuration', type: 'error' });
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

      setToast({ title: 'Success', message: `OpenAPI ${format.toUpperCase()} spec downloaded successfully`, type: 'success' });
    } catch (error) {
      setToast({
        title: 'Error',
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

  const filteredBackups = useMemo(() => {
    return backups.filter(backup =>
      backup.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      backup.description.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [backups, searchQuery]);

  const totalSize = useMemo(() => {
    return backups.reduce((acc, b) => acc + b.size, 0);
  }, [backups]);

  const stats = useMemo(() => {
    const totalBackups = backups.length;
    const lastBackup = backups.length > 0
      ? new Date(Math.max(...backups.map(b => new Date(b.createdAt).getTime()))).toLocaleDateString()
      : 'N/A';

    return [
      {
        id: 'total-backups',
        title: 'Total Backups',
        value: totalBackups,
        icon: <Archive className="w-8 h-8" />,
        color: 'primary' as const,
      },
      {
        id: 'total-size',
        title: 'Total Size',
        value: formatBytes(totalSize),
        icon: <HardDrive className="w-8 h-8" />,
        color: 'secondary' as const,
      },
      {
        id: 'last-backup',
        title: 'Latest Backup',
        value: lastBackup,
        icon: <Clock className="w-8 h-8" />,
        color: 'accent' as const,
      },
    ];
  }, [backups, totalSize]);

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
    <div className="space-y-6">
      <PageHeader
        title="Export & System Data"
        description="Manage system backups, export configurations, and access API specifications."
        icon={Archive}
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
          <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-4">
            <div>
              <h2 className="card-title text-xl">System Backups</h2>
              <p className="text-sm text-base-content/70">Create and manage full system configuration backups.</p>
            </div>
            <div className="flex items-center gap-2 w-full md:w-auto">
              <Button
                variant="primary"
                onClick={() => setCreateModalOpen(true)}
              >
                <Plus className="w-4 h-4 mr-2" /> Create Backup
              </Button>
            </div>
          </div>

          <SearchFilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search backups..."
          />

          <div className="overflow-x-auto mt-4">
            <table className="table table-zebra w-full">
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
                        icon={Archive}
                        variant="noData"
                        actionLabel="Create Backup"
                        onAction={() => setCreateModalOpen(true)}
                      />
                    </td>
                  </tr>
                ) : filteredBackups.length === 0 ? (
                  <tr>
                    <td colSpan={5}>
                      <EmptyState
                        title="No backups match your search"
                        description="Try adjusting your search query."
                        icon={Search}
                        variant="noResults"
                        actionLabel="Clear Search"
                        onAction={() => setSearchQuery('')}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredBackups.map((backup) => (
                    <tr key={backup.id} className="hover">
                      <td className="font-bold">
                        <div className="flex items-center gap-2">
                          <Archive className="w-4 h-4 text-base-content/40" />
                          {backup.name}
                        </div>
                      </td>
                      <td className="text-sm text-base-content/70 truncate max-w-xs" title={backup.description}>
                        {backup.description || '-'}
                      </td>
                      <td className="font-mono text-sm">{formatBytes(backup.size)}</td>
                      <td className="text-sm">{new Date(backup.createdAt).toLocaleString()}</td>
                      <td className="flex justify-end gap-2">
                        <div className="tooltip tooltip-left" data-tip="Restore">
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => handleRestoreBackup(backup.id)}
                            disabled={actionLoading === backup.id}
                            className="text-warning hover:bg-warning/10"
                          >
                            <RotateCcw className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="tooltip tooltip-left" data-tip="Download">
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => handleDownloadBackup(backup.id, backup.name)}
                            disabled={actionLoading === backup.id}
                            className="text-primary hover:bg-primary/10"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        </div>
                        <div className="tooltip tooltip-left" data-tip="Delete">
                          <Button
                            size="xs"
                            variant="ghost"
                            onClick={() => handleDeleteBackup(backup.id)}
                            disabled={actionLoading === backup.id}
                            className="text-error hover:bg-error/10"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Configuration Export */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title flex items-center gap-2">
              <FileText className="w-5 h-5 text-primary" />
              Configuration Export
            </h2>
            <p className="text-sm text-base-content/70 mb-4">
              Export the current running configuration. Useful for debugging or manual migration.
            </p>
            <div className="flex items-center gap-2 mb-4">
              <label className="text-sm font-medium text-base-content/70">Format:</label>
              <select
                value={exportFormat}
                onChange={(e) => setExportFormat(e.target.value as 'json' | 'csv' | 'yaml')}
                className="select select-bordered select-sm"
              >
                <option value="json">JSON</option>
                <option value="csv">CSV</option>
                <option value="yaml">YAML</option>
              </select>
            </div>
            <div className="card-actions justify-end mt-auto">
              <Button buttonStyle="outline" onClick={handleExportConfig}>
                <Download className="w-4 h-4 mr-2" /> Export Config
              </Button>
            </div>
          </div>
        </div>

        {/* API Specs */}
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title flex items-center gap-2">
              <Code className="w-5 h-5 text-secondary" />
              API Specifications
            </h2>
            <p className="text-sm text-base-content/70 mb-4">
              Download the OpenAPI specification for integration and development.
            </p>
            <div className="card-actions justify-end gap-2 mt-auto">
              <Button size="sm" buttonStyle="outline" onClick={() => handleDownloadOpenAPI('json')}>
                JSON
              </Button>
              <Button size="sm" buttonStyle="outline" onClick={() => handleDownloadOpenAPI('yaml')}>
                YAML
              </Button>
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
            <span>{toast.title ? `${toast.title}: ` : ''}{toast.message}</span>
            <button onClick={() => setToast(null)} className="btn btn-sm btn-ghost">✕</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportPage;
