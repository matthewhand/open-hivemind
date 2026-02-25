import React from 'react';
import { render, screen, fireEvent, waitFor } from '../test-utils';
import { MemoryRouter } from 'react-router-dom';
import MCPServersPage from './MCPServersPage';
import { act } from 'react';

// Mock fetch
global.fetch = jest.fn();

describe('MCPServersPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

    await act(async () => {
      render(
        <MemoryRouter>
          <MCPServersPage />
        </MemoryRouter>
      );
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
