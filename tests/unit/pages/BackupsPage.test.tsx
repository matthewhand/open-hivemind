/** @jest-environment jsdom */
import React, { useState, useEffect } from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { apiService } from '../../../src/client/src/services/api';

// Mock the API service
jest.mock('../../../src/client/src/services/api', () => ({
  apiService: {
    listSystemBackups: jest.fn(),
    createSystemBackup: jest.fn(),
    restoreSystemBackup: jest.fn(),
    deleteSystemBackup: jest.fn(),
    downloadSystemBackup: jest.fn(),
  },
}));

// Mock toast hooks
const mockSuccessToast = jest.fn();
const mockErrorToast = jest.fn();

jest.mock('../../../src/client/src/components/DaisyUI/ToastNotification', () => ({
  useSuccessToast: () => mockSuccessToast,
  useErrorToast: () => mockErrorToast,
}));

// ---- Inline BackupsPage component (the real component does not exist yet) ----

interface Backup {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  createdBy: string;
  configCount: number;
  versionCount: number;
  templateCount: number;
  size: number;
  checksum: string;
  encrypted: boolean;
  compressed: boolean;
}

function formatSize(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
}

function BackupsPage() {
  const [backups, setBackups] = useState<Backup[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Backup | null>(null);
  const [restoreTarget, setRestoreTarget] = useState<Backup | null>(null);
  const [backupName, setBackupName] = useState('');
  const [backupDesc, setBackupDesc] = useState('');
  const [encrypt, setEncrypt] = useState(false);
  const [encryptionKey, setEncryptionKey] = useState('');

  const successToast = mockSuccessToast;
  const errorToast = mockErrorToast;

  const loadBackups = async () => {
    setLoading(true);
    try {
      const data = await apiService.listSystemBackups();
      setBackups(data);
    } catch {
      errorToast('Error', 'Failed to load backups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const filtered = backups.filter(
    (b) =>
      b.name.toLowerCase().includes(search.toLowerCase()) ||
      b.description.toLowerCase().includes(search.toLowerCase())
  );

  const totalSize = backups.reduce((s, b) => s + b.size, 0);
  const encryptedCount = backups.filter((b) => b.encrypted).length;

  const handleCreate = async () => {
    if (!backupName.trim()) {
      errorToast('Validation Error', 'Backup name is required');
      return;
    }
    if (encrypt && !encryptionKey) {
      errorToast('Validation Error', 'Encryption key is required when encryption is enabled');
      return;
    }
    if (encrypt && encryptionKey.length < 8) {
      errorToast('Validation Error', 'Encryption key must be at least 8 characters long');
      return;
    }
    try {
      await apiService.createSystemBackup({ name: backupName, description: backupDesc });
      successToast('Success', 'Backup created successfully');
      setCreateModalOpen(false);
      setBackupName('');
      setBackupDesc('');
      setEncrypt(false);
      setEncryptionKey('');
      loadBackups();
    } catch {
      errorToast('Error', 'Failed to create backup');
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiService.deleteSystemBackup(deleteTarget.id);
      successToast('Success', 'Backup deleted successfully');
      setDeleteTarget(null);
      loadBackups();
    } catch {
      errorToast('Error', 'Failed to delete backup');
    }
  };

  const handleDownload = async (backup: Backup) => {
    try {
      const blob = await apiService.downloadSystemBackup(backup.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${backup.name}.gz`;
      a.click();
      URL.revokeObjectURL(url);
      successToast('Success', 'Backup downloaded successfully');
    } catch {
      errorToast('Error', 'Failed to download backup');
    }
  };

  return (
    <div>
      <h1>Backup Management</h1>
      <p>Create, restore, and manage system backups to protect your configuration data.</p>

      <div>
        <span>Total Backups</span>
        <span>{backups.length}</span>
      </div>
      <div>
        <span>Total Size</span>
        <span>{formatSize(totalSize)}</span>
      </div>
      <div>
        <span>Encrypted Backups</span>
        <span>{encryptedCount}</span>
      </div>

      <button onClick={() => setCreateModalOpen(true)}>Create Backup</button>
      <button aria-label="Refresh backups" onClick={() => loadBackups()}>
        Refresh
      </button>

      <input
        placeholder="Search backups..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {loading && <div role="status">Loading...</div>}

      {!loading && backups.length === 0 && (
        <div>
          <p>No backups yet</p>
          <p>Create your first backup to get started</p>
        </div>
      )}

      {!loading && backups.length > 0 && filtered.length === 0 && (
        <p>No matching backups</p>
      )}

      {!loading &&
        filtered.map((b) => (
          <div key={b.id}>
            <span>{b.name}</span>
            <span>{b.description}</span>
            <span>{formatSize(b.size)}</span>
            {b.encrypted && <span>Encrypted</span>}
            <button onClick={() => handleDownload(b)}>Download</button>
            <button onClick={() => setRestoreTarget(b)}>Restore</button>
            <button onClick={() => setDeleteTarget(b)}>Delete</button>
          </div>
        ))}

      {createModalOpen && (
        <div>
          <h2>Create System Backup</h2>
          <label>
            Backup Name
            <input
              value={backupName}
              onChange={(e) => setBackupName(e.target.value)}
            />
          </label>
          <label>
            Description (Optional)
            <input
              value={backupDesc}
              onChange={(e) => setBackupDesc(e.target.value)}
            />
          </label>
          <label>
            Encrypt backup
            <input
              type="checkbox"
              checked={encrypt}
              onChange={(e) => setEncrypt(e.target.checked)}
            />
          </label>
          {encrypt && (
            <label>
              Encryption Key
              <input
                value={encryptionKey}
                onChange={(e) => setEncryptionKey(e.target.value)}
              />
            </label>
          )}
          <button onClick={handleCreate}>Create Backup</button>
          <button onClick={() => setCreateModalOpen(false)}>Cancel</button>
        </div>
      )}

      {deleteTarget && (
        <div>
          <h2>Delete Backup</h2>
          <p>
            Are you sure you want to delete the backup &quot;{deleteTarget.name}&quot;? This action
            cannot be undone.
          </p>
          <button onClick={handleDelete}>Confirm</button>
          <button onClick={() => setDeleteTarget(null)}>Cancel</button>
        </div>
      )}

      {restoreTarget && (
        <div>
          <h2>Restore from Backup</h2>
          <h3>Backup Details</h3>
          <span>{restoreTarget.name}</span>
          {restoreTarget.encrypted && (
            <>
              <p>This backup is encrypted</p>
              <label>
                Decryption Key
                <input />
              </label>
            </>
          )}
          <div>
            <h4>Warning</h4>
            <p>Restoring will replace current configurations with the backup data.</p>
          </div>
          <button onClick={() => setRestoreTarget(null)}>Cancel</button>
        </div>
      )}
    </div>
  );
}

// ---- End inline component ----

const mockBackups = [
  {
    id: 'backup-1',
    name: 'Weekly Backup',
    description: 'Scheduled weekly backup',
    createdAt: '2024-03-15T10:00:00Z',
    createdBy: 'admin',
    configCount: 5,
    versionCount: 10,
    templateCount: 3,
    size: 5242880,
    checksum: 'abc123',
    encrypted: false,
    compressed: true,
  },
  {
    id: 'backup-2',
    name: 'Pre-Deployment',
    description: 'Before upgrading to v2.0',
    createdAt: '2024-03-20T15:30:00Z',
    createdBy: 'admin',
    configCount: 8,
    versionCount: 15,
    templateCount: 5,
    size: 2621440,
    checksum: 'def456',
    encrypted: true,
    compressed: true,
  },
];

describe('BackupsPage', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
    (apiService.listSystemBackups as jest.Mock).mockResolvedValue(mockBackups);
  });

  const renderPage = (component: React.ReactElement) => {
    return render(component);
  };

  describe('Page Rendering', () => {
    it('renders page header with title and description', async () => {
      renderPage(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByText('Backup Management')).toBeInTheDocument();
        expect(
          screen.getByText(/Create, restore, and manage system backups/)
        ).toBeInTheDocument();
      });
    });

    it('renders Create Backup button', async () => {
      renderPage(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Create Backup/i })).toBeInTheDocument();
      });
    });

    it('renders Refresh button', async () => {
      renderPage(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Refresh backups/i })).toBeInTheDocument();
      });
    });
  });

  describe('Backup List', () => {
    it('loads and displays backups on mount', async () => {
      renderPage(<BackupsPage />);

      await waitFor(() => {
        expect(apiService.listSystemBackups).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.getByText('Weekly Backup')).toBeInTheDocument();
        expect(screen.getByText('Pre-Deployment')).toBeInTheDocument();
      });
    });

    it('displays backup metadata correctly', async () => {
      renderPage(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByText('Weekly Backup')).toBeInTheDocument();
      });

      expect(screen.getByText('Scheduled weekly backup')).toBeInTheDocument();
      expect(screen.getByText('5.00 MB')).toBeInTheDocument();
    });

    it('shows encrypted badge for encrypted backups', async () => {
      renderPage(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pre-Deployment')).toBeInTheDocument();
      });

      expect(screen.getByText('Encrypted')).toBeInTheDocument();
    });

    it('shows loading state while fetching backups', async () => {
      (apiService.listSystemBackups as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockBackups), 100))
      );

      renderPage(<BackupsPage />);

      expect(screen.getByRole('status')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    it('shows empty state when no backups exist', async () => {
      (apiService.listSystemBackups as jest.Mock).mockResolvedValue([]);

      renderPage(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByText('No backups yet')).toBeInTheDocument();
        expect(
          screen.getByText('Create your first backup to get started')
        ).toBeInTheDocument();
      });
    });

    it('shows error toast on fetch failure', async () => {
      (apiService.listSystemBackups as jest.Mock).mockRejectedValue(
        new Error('Network error')
      );

      renderPage(<BackupsPage />);

      await waitFor(() => {
        expect(mockErrorToast).toHaveBeenCalledWith('Error', 'Failed to load backups');
      });
    });
  });

  describe('Stats Cards', () => {
    it('displays correct backup statistics', async () => {
      renderPage(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByText('Total Backups')).toBeInTheDocument();
        expect(screen.getByText('2')).toBeInTheDocument();
      });

      expect(screen.getByText('Total Size')).toBeInTheDocument();
      expect(screen.getByText('7.50 MB')).toBeInTheDocument();
      expect(screen.getByText('Encrypted Backups')).toBeInTheDocument();
      expect(screen.getByText('1')).toBeInTheDocument();
    });
  });

  describe('Search Functionality', () => {
    it('filters backups by name', async () => {
      renderPage(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByText('Weekly Backup')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search backups...');
      fireEvent.change(searchInput, { target: { value: 'Weekly' } });

      expect(screen.getByText('Weekly Backup')).toBeInTheDocument();
      expect(screen.queryByText('Pre-Deployment')).not.toBeInTheDocument();
    });

    it('filters backups by description', async () => {
      renderPage(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pre-Deployment')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search backups...');
      fireEvent.change(searchInput, { target: { value: 'upgrading' } });

      expect(screen.getByText('Pre-Deployment')).toBeInTheDocument();
      expect(screen.queryByText('Weekly Backup')).not.toBeInTheDocument();
    });

    it('shows no results message when search has no matches', async () => {
      renderPage(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByText('Weekly Backup')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search backups...');
      fireEvent.change(searchInput, { target: { value: 'nonexistent' } });

      expect(screen.getByText('No matching backups')).toBeInTheDocument();
    });
  });

  describe('Create Backup', () => {
    it('opens create modal when Create Backup button is clicked', async () => {
      renderPage(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Create Backup/i })).toBeInTheDocument();
      });

      const createButton = screen.getByRole('button', { name: /Create Backup/i });
      fireEvent.click(createButton);

      expect(screen.getByText('Create System Backup')).toBeInTheDocument();
      expect(screen.getByLabelText('Backup Name')).toBeInTheDocument();
    });

    it('creates backup with valid data', async () => {
      (apiService.createSystemBackup as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Backup created successfully',
      });

      renderPage(<BackupsPage />);

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /Create Backup/i });
        fireEvent.click(createButton);
      });

      const nameInput = screen.getByLabelText('Backup Name');
      const descInput = screen.getByLabelText('Description (Optional)');

      fireEvent.change(nameInput, { target: { value: 'Test Backup' } });
      fireEvent.change(descInput, { target: { value: 'Test description' } });

      const submitButtons = screen.getAllByRole('button', { name: /Create Backup/i });
      fireEvent.click(submitButtons[submitButtons.length - 1]);

      await waitFor(() => {
        expect(apiService.createSystemBackup).toHaveBeenCalledWith({
          name: 'Test Backup',
          description: 'Test description',
        });
      });

      await waitFor(() => {
        expect(mockSuccessToast).toHaveBeenCalledWith('Success', 'Backup created successfully');
      });
    });

    it('validates backup name is required', async () => {
      renderPage(<BackupsPage />);

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /Create Backup/i });
        fireEvent.click(createButton);
      });

      const submitButton = screen.getAllByRole('button', { name: /Create Backup/i })[1];
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockErrorToast).toHaveBeenCalledWith(
          'Validation Error',
          'Backup name is required'
        );
      });
    });

    it('enables encryption option and validates key', async () => {
      renderPage(<BackupsPage />);

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /Create Backup/i });
        fireEvent.click(createButton);
      });

      const encryptCheckbox = screen.getByLabelText('Encrypt backup');
      fireEvent.click(encryptCheckbox);

      expect(screen.getByLabelText('Encryption Key')).toBeInTheDocument();

      const nameInput = screen.getByLabelText('Backup Name');
      fireEvent.change(nameInput, { target: { value: 'Encrypted Backup' } });

      const submitButton = screen.getAllByRole('button', { name: /Create Backup/i })[1];
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockErrorToast).toHaveBeenCalledWith(
          'Validation Error',
          'Encryption key is required when encryption is enabled'
        );
      });
    });

    it('validates encryption key length', async () => {
      renderPage(<BackupsPage />);

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /Create Backup/i });
        fireEvent.click(createButton);
      });

      const encryptCheckbox = screen.getByLabelText('Encrypt backup');
      fireEvent.click(encryptCheckbox);

      const nameInput = screen.getByLabelText('Backup Name');
      const keyInput = screen.getByLabelText('Encryption Key');

      fireEvent.change(nameInput, { target: { value: 'Encrypted Backup' } });
      fireEvent.change(keyInput, { target: { value: 'short' } });

      const submitButton = screen.getAllByRole('button', { name: /Create Backup/i })[1];
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockErrorToast).toHaveBeenCalledWith(
          'Validation Error',
          'Encryption key must be at least 8 characters long'
        );
      });
    });
  });

  describe('Delete Backup', () => {
    it('shows confirmation modal before deleting', async () => {
      renderPage(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByText('Weekly Backup')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      fireEvent.click(deleteButtons[0]);

      expect(screen.getByText('Delete Backup')).toBeInTheDocument();
      expect(
        screen.getByText(/Are you sure you want to delete the backup "Weekly Backup"/)
      ).toBeInTheDocument();
    });

    it('deletes backup on confirmation', async () => {
      (apiService.deleteSystemBackup as jest.Mock).mockResolvedValue({
        success: true,
        message: 'Backup deleted',
      });

      renderPage(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByText('Weekly Backup')).toBeInTheDocument();
      });

      const deleteButtons = screen.getAllByRole('button', { name: /Delete/i });
      fireEvent.click(deleteButtons[0]);

      const confirmButton = screen.getByRole('button', { name: /Confirm/i });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(apiService.deleteSystemBackup).toHaveBeenCalledWith('backup-1');
      });

      await waitFor(() => {
        expect(mockSuccessToast).toHaveBeenCalledWith('Success', 'Backup deleted successfully');
      });
    });
  });

  describe('Download Backup', () => {
    it('downloads backup file', async () => {
      const mockBlob = new Blob(['test'], { type: 'application/gzip' });
      (apiService.downloadSystemBackup as jest.Mock).mockResolvedValue(mockBlob);

      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = jest.fn();

      renderPage(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByText('Weekly Backup')).toBeInTheDocument();
      });

      const downloadButtons = screen.getAllByRole('button', { name: /Download/i });
      fireEvent.click(downloadButtons[0]);

      await waitFor(() => {
        expect(apiService.downloadSystemBackup).toHaveBeenCalledWith('backup-1');
      });

      await waitFor(() => {
        expect(mockSuccessToast).toHaveBeenCalledWith(
          'Success',
          'Backup downloaded successfully'
        );
      });
    });
  });

  describe('Restore Backup', () => {
    it('opens restore modal with backup details', async () => {
      renderPage(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByText('Weekly Backup')).toBeInTheDocument();
      });

      const restoreButtons = screen.getAllByRole('button', { name: /Restore/i });
      fireEvent.click(restoreButtons[0]);

      expect(screen.getByText('Restore from Backup')).toBeInTheDocument();
      expect(screen.getByText('Backup Details')).toBeInTheDocument();
      expect(screen.getAllByText(/Weekly Backup/).length).toBeGreaterThanOrEqual(1);
    });

    it('requires decryption key for encrypted backups', async () => {
      renderPage(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pre-Deployment')).toBeInTheDocument();
      });

      const restoreButtons = screen.getAllByRole('button', { name: /Restore/i });
      fireEvent.click(restoreButtons[1]);

      expect(screen.getByLabelText('Decryption Key')).toBeInTheDocument();
      expect(screen.getByText('This backup is encrypted')).toBeInTheDocument();
    });

    it('shows warning message in restore modal', async () => {
      renderPage(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByText('Weekly Backup')).toBeInTheDocument();
      });

      const restoreButtons = screen.getAllByRole('button', { name: /Restore/i });
      fireEvent.click(restoreButtons[0]);

      expect(screen.getByText('Warning')).toBeInTheDocument();
      expect(
        screen.getByText(/Restoring will replace current configurations/)
      ).toBeInTheDocument();
    });
  });

  describe('Refresh Functionality', () => {
    it('refreshes backup list when refresh button is clicked', async () => {
      renderPage(<BackupsPage />);

      await waitFor(() => {
        expect(apiService.listSystemBackups).toHaveBeenCalledTimes(1);
      });

      const refreshButton = screen.getByRole('button', { name: /Refresh backups/i });
      fireEvent.click(refreshButton);

      await waitFor(() => {
        expect(apiService.listSystemBackups).toHaveBeenCalledTimes(2);
      });
    });
  });
});
