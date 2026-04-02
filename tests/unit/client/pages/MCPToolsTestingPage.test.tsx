/**
 * @jest-environment jsdom
 */
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import MCPToolsTestingPage from '../../../../src/client/src/pages/MCPToolsTestingPage';

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

    render(<MCPToolsTestingPage />);
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

    render(<MCPToolsTestingPage />);

    await waitFor(() => {
      expect(screen.getByText('test_tool')).toBeInTheDocument();
    });

    expect(screen.getByText('A test tool')).toBeInTheDocument();
  });

  it('should show empty state when no tools available', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ servers: [] }),
    });

    render(<MCPToolsTestingPage />);

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

    render(<MCPToolsTestingPage />);

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

    render(<MCPToolsTestingPage />);

    await waitFor(() => {
      expect(screen.getByText('test_tool')).toBeInTheDocument();
    });

    // Select the tool
    fireEvent.click(screen.getByText('test_tool'));

    await waitFor(() => {
      expect(screen.getByText('Test Parameters')).toBeInTheDocument();
    });

    // Verify form fields are generated
    expect(screen.getByText(/textInput/)).toBeInTheDocument();
    expect(screen.getByText(/numberInput/)).toBeInTheDocument();
    expect(screen.getByText(/boolInput/)).toBeInTheDocument();

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

    render(<MCPToolsTestingPage />);

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

    render(<MCPToolsTestingPage />);

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
      expect(screen.getByText(/Test Failed/i)).toBeInTheDocument();
    });

    expect(screen.getByText(/Tool execution failed/i)).toBeInTheDocument();
  });
});
