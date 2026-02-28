import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
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
    getSystemInfo: vi.fn(),
    getEnvOverrides: vi.fn(),
    clearCache: vi.fn(),
  },
}));

// Mock useWebSocket
vi.mock('../../contexts/WebSocketContext', () => ({
  useWebSocket: vi.fn(),
}));

// Mock ModalForm component to avoid JSDOM <dialog> issues
vi.mock('../../components/DaisyUI/ModalForm', () => {
  return {
    default: ({ isOpen, children, title, actions }: any) => (
      isOpen ? (
        <div role="dialog" aria-modal="true">
          <h3>{title}</h3>
          {children}
          <div className="modal-action">
            {actions?.map((action: any, index: number) => (
              <button key={index} onClick={action.onClick} type={action.type || 'button'}>{action.label}</button>
            ))}
          </div>
        </div>
      ) : null
    )
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
    connect: jest.fn(),
    disconnect: jest.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(WebSocketContext, 'useWebSocket').mockReturnValue(mockWebSocket as any);
    vi.mocked(apiService.getGlobalConfig).mockResolvedValue({ _userSettings: { values: {} } });
    vi.mocked(apiService.listSystemBackups).mockResolvedValue([]);
    vi.mocked(apiService.getSystemInfo).mockResolvedValue({ systemInfo: { platform: 'linux', arch: 'x64', nodeVersion: 'v20.0.0', uptime: 1000, memory: { rss: 1000000 }, database: { connected: true } } } as any);
    vi.mocked(apiService.getEnvOverrides).mockResolvedValue({ data: { envVars: {} } } as any);
    vi.mocked(apiService.getApiEndpointsStatus).mockResolvedValue({
      overall: { status: 'healthy', stats: { total: 1, online: 1, error: 0 } },
      endpoints: [
        { id: '1', name: 'Test API', status: 'online', responseTime: 50, consecutiveFailures: 0, lastChecked: new Date().toISOString() }
      ]
    } as any);

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
    const createButton = screen.getByRole('button', { name: /Create Backup/i });
    fireEvent.click(createButton);

    // Expect modal to open
    const modalTitle = await screen.findByText('Create System Backup');
    expect(modalTitle).toBeInTheDocument();

    // Check encryption
    const encryptCheckbox = await screen.findByLabelText(/Encrypt Backup/i);
    fireEvent.click(encryptCheckbox);

    // Enter password
    const passwordInput = screen.getByPlaceholderText('Enter a strong password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit (Wait for the button to appear just in case)
    // There are 2 "Create Backup" buttons: the one to open the modal, and the one inside the modal to submit.
    // The latter should be in the document and clickable.
    const submitButton = screen.getAllByRole('button', { name: /create backup/i })[1] || screen.getAllByRole('button', { name: /create backup/i })[0];
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
