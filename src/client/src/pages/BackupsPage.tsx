/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars */
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Download,
  Archive,
  Trash2,
  RotateCcw,
  HardDrive,
  Clock,
  Shield,
  Plus,
  RefreshCw,
  AlertTriangle,
} from 'lucide-react';
import Modal, { ConfirmModal } from '../components/DaisyUI/Modal';
import { Badge } from '../components/DaisyUI/Badge';
import Button from '../components/DaisyUI/Button';
import Input from '../components/DaisyUI/Input';
import Textarea from '../components/DaisyUI/Textarea';
import Checkbox from '../components/DaisyUI/Checkbox';
import Divider from '../components/DaisyUI/Divider';
import PageHeader from '../components/DaisyUI/PageHeader';
import EmptyState from '../components/DaisyUI/EmptyState';
import StatsCards from '../components/DaisyUI/StatsCards';
import SearchFilterBar from '../components/SearchFilterBar';
import { apiService } from '../services/api';
import DataTable from '../components/DaisyUI/DataTable';
import type { RDVColumn, RowAction } from '../components/DaisyUI/DataTable';
import { useSuccessToast, useErrorToast } from '../components/DaisyUI/ToastNotification';
import { Alert } from '../components/DaisyUI/Alert';
import { LoadingSpinner } from '../components/DaisyUI/Loading';
import Card from '../components/DaisyUI/Card';

interface BackupMetadata {
  id: string;
  name: string;
  description?: string;
  createdAt: Date | string;
  createdBy: string;
  configCount: number;
  versionCount: number;
  templateCount: number;
  size: number;
  checksum: string;
  encrypted: boolean;
  compressed: boolean;
}

interface CreateBackupOptions {
  name: string;
  description?: string;
  encrypt?: boolean;
  encryptionKey?: string;
}

const BackupsPage: React.FC = () => {
  const successToast = useSuccessToast();
  const errorToast = useErrorToast();

  const [backups, setBackups] = useState<BackupMetadata[]>([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Create Backup Modal State
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newBackupName, setNewBackupName] = useState('');
  const [newBackupDescription, setNewBackupDescription] = useState('');
  const [encryptBackup, setEncryptBackup] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState('');

  // Restore Modal State
  const [restoreModalOpen, setRestoreModalOpen] = useState(false);
  const [selectedBackupForRestore, setSelectedBackupForRestore] = useState<BackupMetadata | null>(null);
  const [decryptionKey, setDecryptionKey] = useState('');
  const [overwriteOnRestore, setOverwriteOnRestore] = useState(true);

  // Confirm Modal State
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmVariant?: 'primary' | 'error' | 'warning';
  }>({ isOpen: false, title: '', message: '', onConfirm: () => {} });

  const fetchBackups = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiService.listSystemBackups();
      setBackups(data);
    } catch (err) {
      errorToast('Error', 'Failed to load backups');
    } finally {
      setLoading(false);
    }
  }, [errorToast]);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  const handleCreateBackup = async () => {
    if (!newBackupName.trim()) {
      errorToast('Validation Error', 'Backup name is required');
      return;
    }

    if (encryptBackup && !encryptionKey) {
      errorToast('Validation Error', 'Encryption key is required when encryption is enabled');
      return;
    }

    if (encryptBackup && encryptionKey.length < 8) {
      errorToast('Validation Error', 'Encryption key must be at least 8 characters long');
      return;
    }

    try {
      setActionLoading('create');
      const options: CreateBackupOptions = {
        name: newBackupName,
        description: newBackupDescription,
      };

      if (encryptBackup) {
        options.encrypt = true;
        options.encryptionKey = encryptionKey;
      }

      await apiService.createSystemBackup(options);
      successToast('Success', 'Backup created successfully');
      setCreateModalOpen(false);
      resetCreateForm();
      fetchBackups();
    } catch (err) {
      errorToast('Error', err instanceof Error ? err.message : 'Failed to create backup');
    } finally {
      setActionLoading(null);
    }
  };

  const resetCreateForm = () => {
    setNewBackupName('');
    setNewBackupDescription('');
    setEncryptBackup(false);
    setEncryptionKey('');
  };

  const handleDeleteBackup = async (backup: BackupMetadata) => {
    setConfirmModal({
      isOpen: true,
      title: 'Delete Backup',
      message: `Are you sure you want to delete the backup "${backup.name}"? This action cannot be undone.`,
      confirmVariant: 'error',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        try {
          setActionLoading(backup.id);
          await apiService.deleteSystemBackup(backup.id);
          successToast('Success', 'Backup deleted successfully');
          fetchBackups();
        } catch (err) {
          errorToast('Error', 'Failed to delete backup');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const openRestoreModal = (backup: BackupMetadata) => {
    setSelectedBackupForRestore(backup);
    setDecryptionKey('');
    setOverwriteOnRestore(true);
    setRestoreModalOpen(true);
  };

  const handleRestoreBackup = async () => {
    if (!selectedBackupForRestore) return;

    if (selectedBackupForRestore.encrypted && !decryptionKey) {
      errorToast('Validation Error', 'Decryption key is required for encrypted backups');
      return;
    }

    setConfirmModal({
      isOpen: true,
      title: 'Restore Backup',
      message: `Are you sure you want to restore from "${selectedBackupForRestore.name}"? ${
        overwriteOnRestore ? 'This will overwrite your current configuration.' : ''
      }`,
      confirmVariant: 'warning',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        if (!selectedBackupForRestore) return;

        try {
          setActionLoading(selectedBackupForRestore.id);
          const options: any = { overwrite: overwriteOnRestore };
          if (selectedBackupForRestore.encrypted) {
            options.decryptionKey = decryptionKey;
          }

          await apiService.restoreSystemBackup(selectedBackupForRestore.id, options);
          successToast('Success', 'Backup restored successfully. Reloading...');
          setRestoreModalOpen(false);
          setTimeout(() => window.location.reload(), 2000);
        } catch (err) {
          errorToast('Error', err instanceof Error ? err.message : 'Failed to restore backup');
        } finally {
          setActionLoading(null);
        }
      },
    });
  };

  const handleDownloadBackup = async (backup: BackupMetadata) => {
    try {
      setActionLoading(backup.id);
      const blob = await apiService.downloadSystemBackup(backup.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${backup.name}-${new Date(backup.createdAt).toISOString().split('T')[0]}.json.gz`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      successToast('Success', 'Backup downloaded successfully');
    } catch (err) {
      errorToast('Error', 'Failed to download backup');
    } finally {
      setActionLoading(null);
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
    return backups.filter(
      (backup) =>
        backup.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (backup.description && backup.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  }, [backups, searchQuery]);

  const backupColumns: RDVColumn<BackupMetadata>[] = [
    {
      key: 'name',
      title: 'Name',
      prominent: true,
      render: (value: string, row: BackupMetadata) => (
        <div className="flex items-center gap-2">
          <Archive className="w-4 h-4 text-primary" />
          <div className="flex flex-col">
            <span className="font-bold">{value}</span>
            {row.encrypted && (
              <Badge size="xs" variant="warning" className="gap-1 mt-1">
                <Shield className="w-3 h-3" />
                Encrypted
              </Badge>
            )}
          </div>
        </div>
      ),
    },
    {
      key: 'description',
      title: 'Description',
      render: (value: string | undefined) => (
        <span className="text-sm text-base-content/70 truncate max-w-xs" title={value || ''}>
          {value || '-'}
        </span>
      ),
    },
    {
      key: 'configCount',
      title: 'Configs',
      render: (value: number) => <Badge variant="primary" size="sm">{value}</Badge>,
    },
    {
      key: 'size',
      title: 'Size',
      render: (value: number) => <span className="font-mono text-sm">{formatBytes(value)}</span>,
    },
    {
      key: 'createdAt',
      title: 'Created',
      render: (value: Date | string) => (
        <div className="flex flex-col text-sm">
          <span>{new Date(value).toLocaleDateString()}</span>
          <span className="text-xs text-base-content/60">{new Date(value).toLocaleTimeString()}</span>
        </div>
      ),
    },
    {
      key: 'createdBy',
      title: 'Created By',
      render: (value: string) => <span className="text-sm">{value}</span>,
    },
  ];

  const backupActions: RowAction<BackupMetadata>[] = [
    {
      label: 'Restore',
      icon: <RotateCcw className="w-4 h-4" />,
      variant: 'warning',
      onClick: openRestoreModal,
      disabled: (b) => actionLoading === b.id,
      tooltip: 'Restore from this backup',
    },
    {
      label: 'Download',
      icon: <Download className="w-4 h-4" />,
      variant: 'primary',
      onClick: handleDownloadBackup,
      disabled: (b) => actionLoading === b.id,
      tooltip: 'Download backup file',
    },
    {
      label: 'Delete',
      icon: <Trash2 className="w-4 h-4" />,
      variant: 'error',
      onClick: handleDeleteBackup,
      disabled: (b) => actionLoading === b.id,
      tooltip: 'Delete backup',
    },
  ];

  const totalSize = useMemo(() => {
    return backups.reduce((acc, b) => acc + b.size, 0);
  }, [backups]);

  const encryptedCount = useMemo(() => {
    return backups.filter((b) => b.encrypted).length;
  }, [backups]);

  const stats = useMemo(() => {
    const totalBackups = backups.length;
    const lastBackup =
      backups.length > 0
        ? new Date(
            backups.reduce(
              (max, b) => Math.max(max, new Date(b.createdAt).getTime()),
              -Infinity
            )
          ).toLocaleDateString()
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
        id: 'encrypted-backups',
        title: 'Encrypted Backups',
        value: encryptedCount,
        icon: <Shield className="w-8 h-8" />,
        color: 'warning' as const,
      },
      {
        id: 'last-backup',
        title: 'Latest Backup',
        value: lastBackup,
        icon: <Clock className="w-8 h-8" />,
        color: 'accent' as const,
      },
    ];
  }, [backups, totalSize, encryptedCount]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Backup Management"
        description="Create, restore, and manage system backups with full configuration snapshots."
        icon={Archive}
        gradient="primary"
        actions={[
          <Button
            key="refresh"
            variant="ghost"
            size="sm"
            onClick={fetchBackups}
            disabled={loading}
            aria-label="Refresh backups"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>,
          <Button
            key="create"
            variant="primary"
            size="md"
            onClick={() => setCreateModalOpen(true)}
            disabled={loading}
            aria-label="Create new backup"
          >
            <Plus className="w-4 h-4" />
            Create Backup
          </Button>,
        ]}
      />

      <StatsCards stats={stats} />

      <Card className="shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
            <Card.Title>System Backups</Card.Title>
            <SearchFilterBar
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              placeholder="Search backups..."
              showFilter={false}
            />
          </div>

          {loading && backups.length === 0 ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : filteredBackups.length === 0 ? (
            <EmptyState
              icon={<Archive className="w-16 h-16" />}
              title={searchQuery ? 'No matching backups' : 'No backups yet'}
              description={
                searchQuery
                  ? 'Try adjusting your search criteria'
                  : 'Create your first backup to get started'
              }
              action={
                !searchQuery ? (
                  <Button variant="primary" onClick={() => setCreateModalOpen(true)}>
                    <Plus className="w-4 h-4" />
                    Create First Backup
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <DataTable
              data={filteredBackups}
              columns={backupColumns}
              actions={backupActions}
              loading={loading}
            />
          )}
      </Card>

      {/* Create Backup Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          resetCreateForm();
        }}
        title="Create System Backup"
        actions={[
          { label: 'Cancel', onClick: () => { setCreateModalOpen(false); resetCreateForm(); }, variant: 'ghost', disabled: actionLoading === 'create' },
          { label: 'Create Backup', onClick: handleCreateBackup, variant: 'primary', loading: actionLoading === 'create', disabled: !newBackupName.trim() || actionLoading === 'create' },
        ]}
      >
        <div className="space-y-4">
          <p className="text-sm text-base-content/70">
            Create a complete backup of all system configurations, including bot configurations,
            personas, templates, and settings.
          </p>

          <Input
            label="Backup Name"
            value={newBackupName}
            onChange={(e) => setNewBackupName(e.target.value)}
            placeholder="e.g., Pre-Deployment-2024"
            required
            disabled={actionLoading === 'create'}
          />

          <Textarea
            label="Description (Optional)"
            value={newBackupDescription}
            onChange={(e) => setNewBackupDescription(e.target.value)}
            placeholder="Add notes about this backup..."
            rows={3}
            disabled={actionLoading === 'create'}
          />

          <Divider>Security Options</Divider>

          <Checkbox
            label="Encrypt backup"
            checked={encryptBackup}
            onChange={(e) => setEncryptBackup(e.target.checked)}
            disabled={actionLoading === 'create'}
          />

          {encryptBackup && (
            <div className="pl-6 space-y-2">
              <Input
                label="Encryption Key"
                type="password"
                value={encryptionKey}
                onChange={(e) => setEncryptionKey(e.target.value)}
                placeholder="Enter encryption key (min 8 characters)"
                required={encryptBackup}
                disabled={actionLoading === 'create'}
              />
              <Alert status="warning" className="text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>Store this key securely. You'll need it to restore this backup.</span>
              </Alert>
            </div>
          )}
        </div>

      </Modal>

      {/* Restore Backup Modal */}
      <Modal
        isOpen={restoreModalOpen}
        onClose={() => {
          setRestoreModalOpen(false);
          setSelectedBackupForRestore(null);
          setDecryptionKey('');
        }}
        title="Restore from Backup"
        actions={[
          { label: 'Cancel', onClick: () => { setRestoreModalOpen(false); setSelectedBackupForRestore(null); setDecryptionKey(''); }, variant: 'ghost', disabled: selectedBackupForRestore ? actionLoading === selectedBackupForRestore.id : false },
          { label: 'Restore Backup', onClick: handleRestoreBackup, variant: 'warning', loading: selectedBackupForRestore ? actionLoading === selectedBackupForRestore.id : false, disabled: !selectedBackupForRestore || (selectedBackupForRestore.encrypted && !decryptionKey) || actionLoading === selectedBackupForRestore?.id },
        ]}
      >
        {selectedBackupForRestore && (
          <div className="space-y-4">
            <Alert status="warning">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <p className="font-bold">Warning</p>
                <p className="text-sm">
                  Restoring will replace current configurations. This action cannot be undone.
                </p>
              </div>
            </Alert>

            <div className="bg-base-200 p-4 rounded-lg space-y-2">
              <h4 className="font-bold">Backup Details</h4>
              <div className="text-sm space-y-1">
                <p>
                  <span className="font-semibold">Name:</span> {selectedBackupForRestore.name}
                </p>
                {selectedBackupForRestore.description && (
                  <p>
                    <span className="font-semibold">Description:</span>{' '}
                    {selectedBackupForRestore.description}
                  </p>
                )}
                <p>
                  <span className="font-semibold">Created:</span>{' '}
                  {new Date(selectedBackupForRestore.createdAt).toLocaleString()}
                </p>
                <p>
                  <span className="font-semibold">Configurations:</span>{' '}
                  {selectedBackupForRestore.configCount}
                </p>
                <p>
                  <span className="font-semibold">Size:</span>{' '}
                  {formatBytes(selectedBackupForRestore.size)}
                </p>
                {selectedBackupForRestore.encrypted && (
                  <p className="flex items-center gap-2 text-warning">
                    <Shield className="w-4 h-4" />
                    <span className="font-semibold">This backup is encrypted</span>
                  </p>
                )}
              </div>
            </div>

            {selectedBackupForRestore.encrypted && (
              <Input
                label="Decryption Key"
                type="password"
                value={decryptionKey}
                onChange={(e) => setDecryptionKey(e.target.value)}
                placeholder="Enter decryption key"
                required
                disabled={actionLoading === selectedBackupForRestore.id}
              />
            )}

            <Checkbox
              label="Overwrite existing configurations"
              checked={overwriteOnRestore}
              onChange={(e) => setOverwriteOnRestore(e.target.checked)}
              disabled={actionLoading === selectedBackupForRestore.id}
            />
          </div>
        )}

      </Modal>

      {/* Confirm Modal */}
      <ConfirmModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmModal.onConfirm}
        title={confirmModal.title}
        message={confirmModal.message}
        confirmVariant={confirmModal.confirmVariant}
      />
    </div>
  );
};

export default BackupsPage;
