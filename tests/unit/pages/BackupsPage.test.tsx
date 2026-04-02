/* @jest-environment jsdom */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { BrowserRouter } from 'react-router-dom';
import BackupsPage from '../../../src/client/src/pages/BackupsPage';
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

// Mock lucide-react icons
jest.mock('lucide-react', () => ({
  Archive: () => <div>Archive Icon</div>,
  Download: () => <div>Download Icon</div>,
  Trash2: () => <div>Trash Icon</div>,
  RotateCcw: () => <div>Restore Icon</div>,
  HardDrive: () => <div>HardDrive Icon</div>,
  Clock: () => <div>Clock Icon</div>,
  Shield: () => <div>Shield Icon</div>,
  Plus: () => <div>Plus Icon</div>,
  RefreshCw: () => <div>Refresh Icon</div>,
  AlertTriangle: () => <div>Alert Icon</div>,
}));

// Mock toast hooks
const mockSuccessToast = jest.fn();
const mockErrorToast = jest.fn();

jest.mock('../../../src/client/src/components/DaisyUI/ToastNotification', () => ({
  useSuccessToast: () => mockSuccessToast,
  useErrorToast: () => mockErrorToast,
}));

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
    size: 5242880, // 5MB
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
    size: 2621440, // 2.5MB
    checksum: 'def456',
    encrypted: true,
    compressed: true,
  },
];

describe('BackupsPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (apiService.listSystemBackups as jest.Mock).mockResolvedValue(mockBackups);

    // Setup portal root for modals
    const portalRoot = document.createElement('div');
    portalRoot.setAttribute('id', 'modal-root');
    document.body.appendChild(portalRoot);
  });

  afterEach(() => {
    // Clean up portal root
    const portalRoot = document.getElementById('modal-root');
    if (portalRoot) {
      document.body.removeChild(portalRoot);
    }
  });

  const renderWithRouter = (component: React.ReactElement) => {
    return render(<BrowserRouter>{component}</BrowserRouter>);
  };

  describe('Page Rendering', () => {
    it('renders page header with title and description', async () => {
      renderWithRouter(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByText('Backup Management')).toBeInTheDocument();
        expect(
          screen.getByText(/Create, restore, and manage system backups/)
        ).toBeInTheDocument();
      });
    });

    it('renders Create Backup button', async () => {
      renderWithRouter(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Create Backup/i })).toBeInTheDocument();
      });
    });

    it('renders Refresh button', async () => {
      renderWithRouter(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Refresh backups/i })).toBeInTheDocument();
      });
    });
  });

  describe('Backup List', () => {
    it('loads and displays backups on mount', async () => {
      renderWithRouter(<BackupsPage />);

      await waitFor(() => {
        expect(apiService.listSystemBackups).toHaveBeenCalledTimes(1);
      });

      await waitFor(() => {
        expect(screen.getByText('Weekly Backup')).toBeInTheDocument();
        expect(screen.getByText('Pre-Deployment')).toBeInTheDocument();
      });
    });

    it('displays backup metadata correctly', async () => {
      renderWithRouter(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByText('Weekly Backup')).toBeInTheDocument();
      });

      expect(screen.getByText('Scheduled weekly backup')).toBeInTheDocument();
      expect(screen.getByText('5.00 MB')).toBeInTheDocument();
    });

    it('shows encrypted badge for encrypted backups', async () => {
      renderWithRouter(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pre-Deployment')).toBeInTheDocument();
      });

      expect(screen.getByText('Encrypted')).toBeInTheDocument();
    });

    it('shows loading state while fetching backups', async () => {
      (apiService.listSystemBackups as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(() => resolve(mockBackups), 100))
      );

      renderWithRouter(<BackupsPage />);

      expect(screen.getByRole('status')).toBeInTheDocument();

      await waitFor(() => {
        expect(screen.queryByRole('status')).not.toBeInTheDocument();
      });
    });

    it('shows empty state when no backups exist', async () => {
      (apiService.listSystemBackups as jest.Mock).mockResolvedValue([]);

      renderWithRouter(<BackupsPage />);

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

      renderWithRouter(<BackupsPage />);

      await waitFor(() => {
        expect(mockErrorToast).toHaveBeenCalledWith('Error', 'Failed to load backups');
      });
    });
  });

  describe('Stats Cards', () => {
    it('displays correct backup statistics', async () => {
      renderWithRouter(<BackupsPage />);

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
      renderWithRouter(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByText('Weekly Backup')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search backups...');
      fireEvent.change(searchInput, { target: { value: 'Weekly' } });

      expect(screen.getByText('Weekly Backup')).toBeInTheDocument();
      expect(screen.queryByText('Pre-Deployment')).not.toBeInTheDocument();
    });

    it('filters backups by description', async () => {
      renderWithRouter(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pre-Deployment')).toBeInTheDocument();
      });

      const searchInput = screen.getByPlaceholderText('Search backups...');
      fireEvent.change(searchInput, { target: { value: 'upgrading' } });

      expect(screen.getByText('Pre-Deployment')).toBeInTheDocument();
      expect(screen.queryByText('Weekly Backup')).not.toBeInTheDocument();
    });

    it('shows no results message when search has no matches', async () => {
      renderWithRouter(<BackupsPage />);

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
      renderWithRouter(<BackupsPage />);

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

      renderWithRouter(<BackupsPage />);

      await waitFor(() => {
        const createButton = screen.getByRole('button', { name: /Create Backup/i });
        fireEvent.click(createButton);
      });

      const nameInput = screen.getByLabelText('Backup Name');
      const descInput = screen.getByLabelText('Description (Optional)');

      fireEvent.change(nameInput, { target: { value: 'Test Backup' } });
      fireEvent.change(descInput, { target: { value: 'Test description' } });

      const submitButton = screen.getByRole('button', { name: /Create Backup/i });
      fireEvent.click(submitButton);

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
      renderWithRouter(<BackupsPage />);

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
      renderWithRouter(<BackupsPage />);

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
      renderWithRouter(<BackupsPage />);

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
      renderWithRouter(<BackupsPage />);

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

      renderWithRouter(<BackupsPage />);

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

      // Mock DOM methods
      const mockClick = jest.fn();
      const mockCreateElement = jest.spyOn(document, 'createElement');
      mockCreateElement.mockReturnValue({
        click: mockClick,
        href: '',
        download: '',
      } as any);

      global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
      global.URL.revokeObjectURL = jest.fn();

      renderWithRouter(<BackupsPage />);

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

      mockCreateElement.mockRestore();
    });
  });

  describe('Restore Backup', () => {
    it('opens restore modal with backup details', async () => {
      renderWithRouter(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByText('Weekly Backup')).toBeInTheDocument();
      });

      const restoreButtons = screen.getAllByRole('button', { name: /Restore/i });
      fireEvent.click(restoreButtons[0]);

      expect(screen.getByText('Restore from Backup')).toBeInTheDocument();
      expect(screen.getByText('Backup Details')).toBeInTheDocument();
      expect(screen.getByText(/Weekly Backup/)).toBeInTheDocument();
    });

    it('requires decryption key for encrypted backups', async () => {
      renderWithRouter(<BackupsPage />);

      await waitFor(() => {
        expect(screen.getByText('Pre-Deployment')).toBeInTheDocument();
      });

      const restoreButtons = screen.getAllByRole('button', { name: /Restore/i });
      fireEvent.click(restoreButtons[1]);

      expect(screen.getByLabelText('Decryption Key')).toBeInTheDocument();
      expect(screen.getByText('This backup is encrypted')).toBeInTheDocument();
    });

    it('shows warning message in restore modal', async () => {
      renderWithRouter(<BackupsPage />);

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
      renderWithRouter(<BackupsPage />);

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
