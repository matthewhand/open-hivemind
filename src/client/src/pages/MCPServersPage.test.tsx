import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { MemoryRouter } from 'react-router-dom';
import MCPServersPage from './MCPServersPage';
import { act } from 'react';

// Mock fetch
global.fetch = jest.fn();

// Mock Modal to avoid JSDOM issues with <dialog>
jest.mock('../components/DaisyUI/Modal', () => ({
  __esModule: true,
  default: ({ children, isOpen, title }: { children: React.ReactNode; isOpen: boolean; title?: string }) => (
    isOpen ? (
      <div role="dialog">
        {title && <h2>{title}</h2>}
        {children}
      </div>
    ) : null
  ),
}));

describe('MCPServersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();

    // Mock HTMLDialogElement methods manually to ensure Modal works
    // Patch both HTMLElement (for JSDOM fallback) and HTMLDialogElement
    const mockShowModal = jest.fn();
    const mockClose = jest.fn();

    (HTMLElement.prototype as any).showModal = mockShowModal;
    (HTMLElement.prototype as any).close = mockClose;

    if (typeof window !== 'undefined' && window.HTMLDialogElement) {
      window.HTMLDialogElement.prototype.showModal = mockShowModal;
      window.HTMLDialogElement.prototype.close = mockClose;
    }

    (global.fetch as jest.Mock).mockResolvedValue({
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

    (global.fetch as jest.Mock).mockImplementation((url) => {
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

    let container: HTMLElement;
    await act(async () => {
      const result = render(
        <MemoryRouter>
          <MCPServersPage />
        </MemoryRouter>
      );
      container = result.container;
    });

    // Wait for servers to load
    await waitFor(() => {
      expect(screen.getByText('Test Server')).toBeInTheDocument();
    });

    // Find the "Start" button (PlayIcon)
    const connectButton = screen.getByRole('button', { name: /Connect Test Server/i });

    await act(async () => {
      fireEvent.click(connectButton);
    });

    // Check if the correct API was called
    // Current implementation mocks it, so this should fail if we expect a real fetch call
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
