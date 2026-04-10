/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import MCPToolsTestingPage from '../../../../src/client/src/pages/MCPToolsTestingPage';

// MCPToolsTestingPage uses useLocation via Breadcrumbs — wrap in MemoryRouter
const renderPage = () => render(<MemoryRouter><MCPToolsTestingPage /></MemoryRouter>);

// Mock fetch
global.fetch = jest.fn();

describe('MCPToolsTestingPage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ servers: [] }),
    });

    renderPage();
    expect(screen.getByRole('status', { hidden: true })).toBeInTheDocument();
  });

  it('should display available tools after loading', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        servers: [
          {
            name: 'test-server',
            connected: true,
            tools: [
              {
                name: 'test_tool',
                description: 'A test tool',
                inputSchema: {
                  type: 'object',
                  properties: {
                    input: {
                      type: 'string',
                      description: 'Test input',
                    },
                  },
                  required: ['input'],
                },
              },
            ],
          },
        ],
      }),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('test_tool')).toBeInTheDocument();
    });
    // Description only appears in the detail panel after selecting a tool
  });

  it('should show empty state when no tools available', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ servers: [] }),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/No tools available/i)).toBeInTheDocument();
    });
  });

  it('should display tool schema when tool is selected', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        servers: [
          {
            name: 'test-server',
            connected: true,
            tools: [
              {
                name: 'test_tool',
                description: 'A test tool',
                inputSchema: {
                  type: 'object',
                  properties: {
                    city: {
                      type: 'string',
                      description: 'City name',
                    },
                  },
                  required: ['city'],
                },
              },
            ],
          },
        ],
      }),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('test_tool')).toBeInTheDocument();
    });

    // Click on the tool
    fireEvent.click(screen.getByText('test_tool'));

    await waitFor(() => {
      expect(screen.getByText('Input Schema')).toBeInTheDocument();
    });
  });

  it('should generate form fields based on tool schema', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        servers: [
          {
            name: 'test-server',
            connected: true,
            tools: [
              {
                name: 'test_tool',
                description: 'A test tool',
                inputSchema: {
                  type: 'object',
                  properties: {
                    textInput: {
                      type: 'string',
                      description: 'Text input',
                    },
                    numberInput: {
                      type: 'number',
                      description: 'Number input',
                    },
                    boolInput: {
                      type: 'boolean',
                      description: 'Boolean input',
                    },
                  },
                  required: ['textInput'],
                },
              },
            ],
          },
        ],
      }),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('test_tool')).toBeInTheDocument();
    });

    // Select the tool
    fireEvent.click(screen.getByText('test_tool'));

    await waitFor(() => {
      expect(screen.getByText('Test Parameters')).toBeInTheDocument();
    });

    // Verify form fields are generated (label spans contain the field names)
    expect(screen.getAllByText(/textInput/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/numberInput/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/boolInput/).length).toBeGreaterThan(0);

    // Check for required indicator
    const requiredIndicators = screen.getAllByText('*');
    expect(requiredIndicators.length).toBeGreaterThan(0);
  });

  it('should execute tool and display results', async () => {
    // Mock initial fetch for tools
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        servers: [
          {
            name: 'test-server',
            connected: true,
            tools: [
              {
                name: 'test_tool',
                description: 'A test tool',
                inputSchema: {
                  type: 'object',
                  properties: {
                    input: {
                      type: 'string',
                      description: 'Test input',
                    },
                  },
                  required: ['input'],
                },
              },
            ],
          },
        ],
      }),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('test_tool')).toBeInTheDocument();
    });

    // Select the tool
    fireEvent.click(screen.getByText('test_tool'));

    await waitFor(() => {
      expect(screen.getByText('Test Parameters')).toBeInTheDocument();
    });

    // Fill in the form
    const inputField = screen.getByPlaceholderText(/Enter input.../i);
    fireEvent.change(inputField, { target: { value: 'test value' } });

    // Mock tool execution
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        result: {
          content: [{ type: 'text', text: 'Success!' }],
        },
      }),
    });

    // Click test button
    const testButton = screen.getByRole('button', { name: /Test Tool/i });
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getByText(/Test Successful/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Success!/i)).toBeInTheDocument();
  });

  it('should display error when tool execution fails', async () => {
    // Mock initial fetch for tools
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        servers: [
          {
            name: 'test-server',
            connected: true,
            tools: [
              {
                name: 'test_tool',
                description: 'A test tool',
                inputSchema: {
                  type: 'object',
                  properties: {},
                },
              },
            ],
          },
        ],
      }),
    });

    renderPage();

    await waitFor(() => {
      expect(screen.getByText('test_tool')).toBeInTheDocument();
    });

    // Select the tool
    fireEvent.click(screen.getByText('test_tool'));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Test Tool/i })).toBeInTheDocument();
    });

    // Mock tool execution failure
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Tool execution failed',
      }),
    });

    // Click test button
    const testButton = screen.getByRole('button', { name: /Test Tool/i });
    fireEvent.click(testButton);

    await waitFor(() => {
      expect(screen.getAllByText(/Test Failed/i).length).toBeGreaterThan(0);
    });

    expect(screen.getAllByText(/Tool execution failed/i).length).toBeGreaterThan(0);
  });
});
