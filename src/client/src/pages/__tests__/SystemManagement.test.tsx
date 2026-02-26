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

// Mock DaisyUI components (index import)
vi.mock('../../components/DaisyUI', () => ({
  Modal: ({ children, isOpen, title, actions }: any) => (
    isOpen ? (
      <div role="dialog">
        {title && <h3>{title}</h3>}
        {children}
        {actions && actions.map((action: any, i: number) => (
          <button key={i} onClick={action.onClick}>{action.label}</button>
        ))}
      </div>
    ) : null
  ),
  ConfirmModal: ({ isOpen, title, message, onConfirm, cancelText, confirmText }: any) => (
    isOpen ? (
      <div role="dialog">
        {title && <h3>{title}</h3>}
        <p>{message}</p>
        <button onClick={onConfirm}>{confirmText || 'Confirm'}</button>
        <button>{cancelText || 'Cancel'}</button>
      </div>
    ) : null
  ),
  Button: ({ children, onClick, ...props }: any) => (
    <button onClick={onClick} {...props}>{children}</button>
  ),
  // Add passthroughs for other potential components
  Alert: ({ children }: any) => <div>{children}</div>,
  Badge: ({ children }: any) => <span>{children}</span>,
  Card: ({ children }: any) => <div>{children}</div>,
  DataTable: () => <div>DataTable</div>,
  ProgressBar: () => <div>Progress</div>,
  StatsCards: () => <div>Stats</div>,
  ToastNotification: {
    useSuccessToast: () => vi.fn(),
    useErrorToast: () => vi.fn(),
    Notifications: () => <div>Notifications</div>,
  },
  LoadingSpinner: () => <div>Loading...</div>,
  // Helper for specialized modals if used directly
  FormModal: ({ children, isOpen, title, onSubmit, submitText }: any) => (
    isOpen ? (
      <div role="dialog">
        {title && <h3>{title}</h3>}
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.target as HTMLFormElement)); }}>
          {children}
          <button type="submit">{submitText || 'Submit'}</button>
        </form>
      </div>
    ) : null
  ),
}));

// Mock DaisyUI Modal specifically (direct file import)
vi.mock('../../components/DaisyUI/Modal', () => {
  const MockModal = ({ children, isOpen, title, actions }: any) => (
    isOpen ? (
      <div role="dialog">
        {title && <h3>{title}</h3>}
        {children}
        {actions && actions.map((action: any, i: number) => (
          <button key={i} onClick={action.onClick}>{action.label}</button>
        ))}
      </div>
    ) : null
  );

  const MockConfirmModal = ({ isOpen, title, message, onConfirm, cancelText, confirmText }: any) => (
    isOpen ? (
      <div role="dialog">
        {title && <h3>{title}</h3>}
        <p>{message}</p>
        <button onClick={onConfirm}>{confirmText || 'Confirm'}</button>
        <button>{cancelText || 'Cancel'}</button>
      </div>
    ) : null
  );

  const MockFormModal = ({ children, isOpen, title, onSubmit, submitText }: any) => (
    isOpen ? (
      <div role="dialog">
        {title && <h3>{title}</h3>}
        <form onSubmit={(e) => { e.preventDefault(); onSubmit(new FormData(e.target as HTMLFormElement)); }}>
          {children}
          <button type="submit">{submitText || 'Submit'}</button>
        </form>
      </div>
    ) : null
  );

  return {
    default: MockModal,
    ConfirmModal: MockConfirmModal,
    FormModal: MockFormModal,
    SuccessModal: MockModal,
    ErrorModal: MockModal,
    LoadingModal: MockModal,
    InfoModal: MockModal
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
    (apiService.getSystemInfo as any).mockResolvedValue({
      platform: 'linux',
      uptime: 1000
    });
    (apiService.getEnvOverrides as any).mockResolvedValue([]);

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
    const createButton = screen.getByRole('button', { name: /create backup/i });
    fireEvent.click(createButton);

    // Expect modal to open
    const modalTitle = await screen.findByText('Create System Backup');
    expect(modalTitle).toBeInTheDocument();

    // Check encryption
    const encryptCheckbox = screen.getByLabelText('Encrypt Backup');
    fireEvent.click(encryptCheckbox);

    // Enter password
    const passwordInput = screen.getByPlaceholderText('Enter a strong password');
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    // Submit - we need the submit button inside the modal
    // If SystemManagement uses `FormModal`, it has a submit button (default text "Submit" if not provided)
    // If it uses generic `Modal` with `actions`, our updated mock renders buttons with action labels.

    // We try to find the button. Since "Create Backup" might be reused as label...
    // Let's get all buttons and inspect logic or just try clicking the last one again.

    // Debug helper: log buttons
    // screen.getAllByRole('button').forEach(b => console.log(b.textContent));

    // Strategy:
    // 1. Try finding specific text that is likely on the modal button (e.g. "Create" or "Create Backup" or "Submit")
    // 2. Click it.

    // Given the previous failure where it found 0 calls, it means we clicked the wrong button or nothing happened.
    // The "Create Backup" trigger button is still in DOM.
    // If `Modal` is rendered in a portal, it's appended to body.

    const allButtons = screen.getAllByRole('button');
    // Assuming the modal button is the last one rendered
    const lastButton = allButtons[allButtons.length - 1];
    fireEvent.click(lastButton);

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
