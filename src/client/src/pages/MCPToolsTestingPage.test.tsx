import React from 'react';
import { render, screen, waitFor } from '../test-utils';
import { MemoryRouter } from 'react-router-dom';
import MCPToolsTestingPage from './MCPToolsTestingPage';
import { act } from 'react';

// Mock fetch (authFetch delegates to global fetch)
global.fetch = jest.fn();

const serversResponse = {
  success: true,
  data: {
    servers: [
      {
        name: 'demo-server',
        connected: true,
        tools: [
          {
            name: 'echo',
            description: 'Echoes input back',
            inputSchema: {
              type: 'object',
              properties: {
                items: { type: 'array', description: 'List of items' },
              },
              required: ['items'],
            },
          },
        ],
      },
    ],
  },
};

const renderPage = async () => {
  await act(async () => {
    render(
      <MemoryRouter>
        <MCPToolsTestingPage />
      </MemoryRouter>
    );
  });
};

describe('MCPToolsTestingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => serversResponse,
    });
  });

  test('populates the tool list from the { data: { servers } } response shape', async () => {
    await renderPage();

    // Before the fix this read json.servers (undefined) so the list was always
    // empty and the "No tools available" warning showed instead.
    await waitFor(() => {
      expect(screen.getByText('echo')).toBeInTheDocument();
    });
    expect(screen.getByText('demo-server')).toBeInTheDocument();
    expect(
      screen.queryByText(/No tools available\. Connect MCP servers first\./i)
    ).not.toBeInTheDocument();
  });

  test('renders a textarea for array/object schema fields', async () => {
    await renderPage();

    // Select the tool to render its parameter form.
    await waitFor(() => {
      expect(screen.getByText('echo')).toBeInTheDocument();
    });

    await act(async () => {
      screen.getByText('echo').closest('button')!.click();
    });

    // The array field renders a <textarea>; before the fix the component used an
    // undefined <Textarea> which would crash on render.
    await waitFor(() => {
      const field = screen.getByPlaceholderText(/Enter array as JSON/i);
      expect(field).toBeInTheDocument();
      expect(field.tagName).toBe('TEXTAREA');
    });
  });
});
