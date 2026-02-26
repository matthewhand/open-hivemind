import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { MemoryRouter } from 'react-router-dom';
import MCPServersPage from './MCPServersPage';
import { act } from 'react';
import { vi } from 'vitest';

// Mock fetch
global.fetch = vi.fn();

// Mock DaisyUI components to avoid DOM/JSDOM issues with dialogs
// Path is '../components/DaisyUI' because this test file is in 'src/client/src/pages/'
vi.mock('../components/DaisyUI', () => ({
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
  Alert: ({ children }: any) => <div>{children}</div>,
  Badge: ({ children }: any) => <span>{children}</span>,
  Card: ({ children }: any) => <div>{children}</div>,
  DataTable: () => <div>DataTable</div>,
  ProgressBar: () => <div>Progress</div>,
  StatsCards: () => <div>Stats</div>,
  Breadcrumbs: ({ items }: any) => <div>Breadcrumbs</div>,
  EmptyState: ({ title }: any) => <div>{title}</div>,
  ToastNotification: {
    useSuccessToast: () => vi.fn(),
    useErrorToast: () => vi.fn(),
    Notifications: () => <div>Notifications</div>,
  },
  LoadingSpinner: () => <div>Loading...</div>,
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
vi.mock('../components/DaisyUI/Modal', () => {
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

describe('MCPServersPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        data: {
          servers: [],
          configurations: []
        }
      })
    });
  });

  test('renders the page title', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <MCPServersPage />
        </MemoryRouter>
      );
    });
    expect(screen.getByText('MCP Servers')).toBeInTheDocument();
  });

  test('opens add server modal and checks for API Key field', async () => {
    await act(async () => {
      render(
        <MemoryRouter>
          <MCPServersPage />
        </MemoryRouter>
      );
    });

    const addButtons = screen.getAllByText('Add Server');
    fireEvent.click(addButtons[0]);

    expect(screen.getByText('Add MCP Server')).toBeInTheDocument();

    // This assertion should fail if the API Key field is missing
    expect(screen.getByPlaceholderText('Leave blank if not required or unchanged')).toBeInTheDocument();
  });

  test('handleServerAction calls correct API endpoints', async () => {
    const mockServers = [
      {
        name: 'Test Server',
        serverUrl: 'http://localhost:3000',
        connected: false
      }
    ];

    (global.fetch as any).mockImplementation((url: string) => {
      if (url === '/api/admin/mcp-servers') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: {
              servers: [],
              configurations: mockServers
            }
          })
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ success: true })
      });
    });

    let rendered: any;
    await act(async () => {
      rendered = render(
        <MemoryRouter>
          <MCPServersPage />
        </MemoryRouter>
      );
    });

    // Wait for servers to load
    await waitFor(() => {
      expect(screen.getByText('Test Server')).toBeInTheDocument();
    });

    // Find the "Start" button (Connect) - looks for button with data-tip="Connect"
    // Since getByTitle fails, we use querySelector
    const startButton = rendered.container.querySelector('button[data-tip="Connect"]');
    expect(startButton).toBeInTheDocument();

    await act(async () => {
      fireEvent.click(startButton);
    });

    // Check if the correct API was called
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/admin/mcp-servers/connect',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          name: 'Test Server',
          serverUrl: 'http://localhost:3000'
        })
      })
    );
  });
});
