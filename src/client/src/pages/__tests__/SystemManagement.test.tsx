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
    getSystemInfo: vi.fn(),
    getEnvOverrides: vi.fn(),
  },
}));

// Mock useWebSocket
vi.mock('../../contexts/WebSocketContext', () => ({
  useWebSocket: vi.fn(),
}));

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
    (apiService.getSystemInfo as any).mockResolvedValue({
      systemInfo: {
        platform: 'linux',
        arch: 'x64',
        nodeVersion: 'v20.0.0',
        uptime: 1000,
        pid: 1234,
        memory: { rss: 1000000 },
        database: { connected: true, stats: {} }
      }
    });
    (apiService.getEnvOverrides as any).mockResolvedValue({
      data: { envVars: {} }
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

    // Find create backup button - use exact text or regex to distinguish from modal button
    // The header button has "💾 Create Backup"
    const createButton = screen.getByText(/💾 Create Backup/);
    fireEvent.click(createButton);

    // Expect modal to open
    const modalTitle = await screen.findByText('Create System Backup');
    expect(modalTitle).toBeInTheDocument();

    // Check encryption - use findByText to wait for rendering
    const encryptLabel = await screen.findByText('Encrypt Backup');
    fireEvent.click(encryptLabel);

    // Enter password - use findByPlaceholderText to wait for conditional rendering
    const passwordInput = await screen.findByPlaceholderText('Enter a strong password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit - The modal button is just "Create Backup"
    // We need to be careful not to click the header button again.
    // The header button is likely disabled or hidden? No.
    // But the modal button is inside the dialog.
    // We can scope to dialog if needed, or use specific text.
    // The modal button has exact text "Create Backup". The header one has "💾 Create Backup".
    const submitButton = screen.getByRole('button', { name: /^Create Backup$/ });
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
    await waitFor(() => expect(apiService.getSystemInfo).toHaveBeenCalled());

    // Expect data to be displayed
    await waitFor(() => expect(screen.getByText('Test API')).toBeInTheDocument());

    // Test clear cache
    const clearButton = screen.getByText('Clear System Cache');
    fireEvent.click(clearButton);

    await waitFor(() => expect(apiService.clearCache).toHaveBeenCalled());
  });
});
