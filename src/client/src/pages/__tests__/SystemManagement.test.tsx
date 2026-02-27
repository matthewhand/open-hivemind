import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import SystemManagement from '../SystemManagement';
import { apiService } from '../../services/api';
import * as WebSocketContext from '../../contexts/WebSocketContext';

// Mock apiService
jest.mock('../../services/api', () => ({
  apiService: {
    getGlobalConfig: jest.fn(),
    listSystemBackups: jest.fn(),
    createSystemBackup: jest.fn(),
    updateGlobalConfig: jest.fn(),
    restoreSystemBackup: jest.fn(),
    deleteSystemBackup: jest.fn(),
    getApiEndpointsStatus: jest.fn(),
    getSystemInfo: jest.fn(),
    getEnvOverrides: jest.fn(),
    clearCache: jest.fn(),
  },
}));

// Mock useWebSocket
jest.mock('../../contexts/WebSocketContext', () => ({
  useWebSocket: jest.fn(),
}));

// Mock Modal component to avoid JSDOM <dialog> issues
jest.mock('../../components/DaisyUI/Modal', () => {
  return ({ isOpen, children, title, actions }: any) => (
    isOpen ? (
      <div role="dialog" aria-modal="true">
        <h3>{title}</h3>
        {children}
        <div className="modal-action">
          {actions?.map((action: any, index: number) => (
            <button key={index} onClick={action.onClick}>{action.label}</button>
          ))}
        </div>
      </div>
    ) : null
  );
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
    jest.clearAllMocks();
    (WebSocketContext.useWebSocket as any).mockReturnValue(mockWebSocket);
    (apiService.getGlobalConfig as any).mockResolvedValue({ _userSettings: { values: {} } });
    (apiService.listSystemBackups as any).mockResolvedValue([]);
    (apiService.getSystemInfo as any).mockResolvedValue({ systemInfo: { platform: 'linux', arch: 'x64', nodeVersion: 'v20.0.0', uptime: 1000, memory: { rss: 1000000 }, database: { connected: true } } });
    (apiService.getEnvOverrides as any).mockResolvedValue({ data: { envVars: {} } });
    (apiService.getApiEndpointsStatus as any).mockResolvedValue({
      overall: { status: 'healthy', stats: { total: 1, online: 1, error: 0 } },
      endpoints: [
        { id: '1', name: 'Test API', status: 'online', responseTime: 50, consecutiveFailures: 0, lastChecked: new Date().toISOString() }
      ]
    });

    // Mock window methods
    window.alert = jest.fn();
    window.confirm = jest.fn(() => true);
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
