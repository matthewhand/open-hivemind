import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import SystemManagement from '../SystemManagement';
import { apiService } from '../../services/api';
import * as WebSocketContext from '../../contexts/WebSocketContext';

// Mock apiService
vi.mock('../../services/api', () => ({
  apiService: {
    getGlobalConfig: vi.fn(),
    listSystemBackups: vi.fn(),
    createSystemBackup: vi.fn(),
    updateGlobalConfig: vi.fn(),
    restoreSystemBackup: vi.fn(),
    deleteSystemBackup: vi.fn(),
    getApiEndpointsStatus: vi.fn(),
    clearCache: vi.fn(),
  },
}));

// Mock useWebSocket
vi.mock('../../contexts/WebSocketContext', () => ({
  useWebSocket: vi.fn(),
}));

// Mock Modal since JSDOM doesn't support dialog fully
vi.mock('../../components/DaisyUI/Modal', () => {
  return {
    __esModule: true,
    default: ({ isOpen, children, title }: any) => {
      if (!isOpen) return null;
      return (
        <div role="dialog" aria-label={title}>
          {title && <h2>{title}</h2>}
          {children}
        </div>
      );
    },
    // Export named exports as well if they are used
    ConfirmModal: ({ isOpen, onConfirm }: any) => isOpen ? <button onClick={onConfirm}>Confirm</button> : null,
    FormModal: ({ isOpen, onSubmit, children, title }: any) => {
        if (!isOpen) return null;
        return (
            <div role="dialog" aria-label={title}>
                <h2>{title}</h2>
                <form onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.target as HTMLFormElement)); }}>
                    {children}
                    <button type="submit">Submit</button>
                </form>
            </div>
        )
    }
  };
});

describe('SystemManagement', () => {
  const mockWebSocket = {
    alerts: [],
    performanceMetrics: [],
    isConnected: true,
    socket: null,
    messageFlow: [],
    botStats: [],
    connect: vi.fn(),
    disconnect: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (WebSocketContext.useWebSocket as any).mockReturnValue(mockWebSocket);
    (apiService.getGlobalConfig as any).mockResolvedValue({ _userSettings: { values: {} } });
    (apiService.listSystemBackups as any).mockResolvedValue([]);
    (apiService.getApiEndpointsStatus as any).mockResolvedValue({
      overall: { status: 'healthy', stats: { total: 1, online: 1, error: 0 } },
      endpoints: [
        { id: '1', name: 'Test API', status: 'online', responseTime: 50, consecutiveFailures: 0, lastChecked: new Date().toISOString() }
      ]
    });

    // Mock window methods
    window.alert = vi.fn();
    window.confirm = vi.fn(() => true);
  });

  it('renders system management page', async () => {
    render(<SystemManagement />);
    expect(screen.getByText('System Management')).toBeInTheDocument();
    await waitFor(() => expect(apiService.getGlobalConfig).toHaveBeenCalled());
  });

  it('handles backup creation with encryption', async () => {
    render(<SystemManagement />);

    // Find create backup button
    const createButton = screen.getByText('Create Backup');
    fireEvent.click(createButton);

    // Expect modal to open
    const modalTitle = await screen.findByText('Create System Backup');
    expect(modalTitle).toBeInTheDocument();

    // Check encryption
    // In DaisyUI toggle/checkbox often doesn't have a label element directly associated via 'for' attribute in the way getByLabelText expects if custom structure is used.
    // We'll try to find by role 'checkbox'
    const encryptCheckbox = screen.getByRole('checkbox', { name: /encrypt backup/i });
    fireEvent.click(encryptCheckbox);

    // Enter password
    const passwordInput = screen.getByPlaceholderText('Enter a strong password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit
    const submitButton = screen.getByText('Submit'); // From our mocked FormModal
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(apiService.createSystemBackup).toHaveBeenCalledWith(expect.objectContaining({
        encrypt: true,
        encryptionKey: 'password123'
      }));
    });
  });

  it('handles performance tab interactions', async () => {
    render(<SystemManagement />);

    // Click Performance Tuning tab
    const perfTab = screen.getByText('Performance Tuning');
    fireEvent.click(perfTab);

    // Expect API call
    await waitFor(() => expect(apiService.getApiEndpointsStatus).toHaveBeenCalled());

    // Expect data to be displayed
    await waitFor(() => expect(screen.getByText('Test API')).toBeInTheDocument());

    // Test clear cache
    const clearButton = screen.getByText('Clear System Cache');
    fireEvent.click(clearButton);

    await waitFor(() => expect(apiService.clearCache).toHaveBeenCalled());
  });
});
