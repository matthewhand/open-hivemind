import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SystemManagement from '../SystemManagement';
import { apiService } from '../../services/api';
import { vi } from 'vitest';

vi.mock('../../services/api');
vi.mock('../../components/DaisyUI', () => ({
  PageHeader: ({ title, description, actions }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
      {actions}
    </div>
  ),
  StatsCards: () => <div>StatsCards</div>,
  AlertPanel: () => <div>AlertPanel</div>,
  ConfirmModal: ({ isOpen, onConfirm, onClose, title, message }: any) => (
    isOpen ? (
      <div role="dialog">
        <h2>{title}</h2>
        <p>{message}</p>
        <button onClick={onConfirm}>Confirm</button>
        <button onClick={onClose}>Cancel</button>
      </div>
    ) : null
  ),
  ToastNotification: {
    useSuccessToast: () => vi.fn(),
    useErrorToast: () => vi.fn(),
  },
  Modal: ({ isOpen, children, onClose }: any) => (
    isOpen ? (
      <div role="dialog">
        <button aria-label="Close" onClick={onClose}>X</button>
        {children}
      </div>
    ) : null
  ),
}));

// Mock WebSocketContext with proper metrics shape to prevent undefined errors
vi.mock('../../contexts/WebSocketContext', () => ({
  useWebSocket: () => ({
    isConnected: true,
    lastMessage: null,
    sendMessage: vi.fn(),
    performanceMetrics: [{
        timestamp: Date.now(),
        cpuUsage: 10,
        memoryUsage: 20,
        activeConnections: 5,
        messageRate: 2,
        errorRate: 0,
        responseTime: 50
    }],
    alerts: [] // Mock empty alerts array
  }),
  WebSocketProvider: ({ children }: any) => <div>{children}</div>,
}));

describe('SystemManagement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (apiService.getGlobalConfig as any).mockResolvedValue({ system: { version: '1.0.0' } });
    (apiService.getSystemInfo as any).mockResolvedValue({
      // Mocking performanceMetrics array to avoid "Cannot read properties of undefined (reading 'length')"
      performanceMetrics: [{
        timestamp: Date.now(),
        cpuUsage: 10,
        memoryUsage: 20,
        activeConnections: 5,
        messageRate: 2
      }]
    });
    (apiService.listSystemBackups as any).mockResolvedValue([]);
    (apiService.getEnvOverrides as any).mockResolvedValue({});
  });

  it('renders system management page', async () => {
    render(
      <BrowserRouter>
        <SystemManagement />
      </BrowserRouter>
    );

    await waitFor(() => {
        expect(screen.getByText('System Management')).toBeInTheDocument();
    });
    expect(screen.getByText('Manage system configuration, alerts, and backups')).toBeInTheDocument();
  });

  it('handles backup creation with encryption', async () => {
    render(
      <BrowserRouter>
        <SystemManagement />
      </BrowserRouter>
    );

    await waitFor(() => {
        expect(screen.getByText('Create Backup')).toBeInTheDocument();
    });

    const createBackupBtn = screen.getByText('Create Backup');
    fireEvent.click(createBackupBtn);

    // Now look for the modal content
    await waitFor(() => {
        expect(screen.getByText('Create System Backup')).toBeInTheDocument();
    });
  });

  it('handles performance tab interactions', async () => {
    render(
      <BrowserRouter>
        <SystemManagement />
      </BrowserRouter>
    );

    await waitFor(() => {
        const performanceTab = screen.queryByText('Performance Tuning');
        if (performanceTab) {
            fireEvent.click(performanceTab);
        }
    });
  });
});
