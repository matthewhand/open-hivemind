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

// Mock Modal to avoid JSDOM issues with <dialog>
vi.mock('../../components/DaisyUI/Modal', () => ({
  __esModule: true,
  default: ({ children, isOpen, title, actions }: any) => (
    isOpen ? (
      <div role="dialog">
        {title && <h2>{title}</h2>}
        {children}
        {actions && actions.map((action: any, i: number) => (
          <button key={i} onClick={action.onClick}>{action.label}</button>
        ))}
      </div>
    ) : null
  ),
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

    // Mock HTMLDialogElement methods manually to ensure Modal works
    // Patch both HTMLElement (for JSDOM fallback) and HTMLDialogElement
    const mockShowModal = vi.fn();
    const mockClose = vi.fn();

    (HTMLElement.prototype as any).showModal = mockShowModal;
    (HTMLElement.prototype as any).close = mockClose;

    if (typeof window !== 'undefined' && window.HTMLDialogElement) {
      window.HTMLDialogElement.prototype.showModal = mockShowModal;
      window.HTMLDialogElement.prototype.close = mockClose;
    }

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

    // Find create backup button - use regex to match text with emoji/spaces
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

    // Submit - inside modal
    // Note: there are two "Create Backup" buttons now (one on page, one in modal)
    // The modal one is the last one or we can target by context if needed
    // But getByRole will find multiple if not specific.
    // The page button is disabled if isCreatingBackup is true, but initially it's enabled.
    // The modal button is secondary action.
    // Let's use getAllByRole and pick the modal one (usually the second one if modal is rendered later/appended)
    // Or better, scope queries to modal content if possible.
    const submitButtons = screen.getAllByRole('button', { name: /create backup/i });
    const modalSubmitButton = submitButtons[submitButtons.length - 1];
    fireEvent.click(modalSubmitButton);

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
