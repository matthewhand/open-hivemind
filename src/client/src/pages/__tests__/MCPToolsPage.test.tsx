import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { ToastProvider } from '../../components/DaisyUI/ToastNotification';
import MCPToolsPage from '../MCPToolsPage';
import { vi, type Mock } from 'vitest';

// Mock the main hook that MCPToolsPage depends on
vi.mock('../MCPToolsPage/hooks/useMCPTools', () => ({
  useMCPTools: vi.fn(() => ({
    tools: [],
    filteredTools: [],
    loading: false,
    alert: null,
    setAlert: vi.fn(),
    favorites: [],
    recentlyUsed: [],
    selectedTool: null,
    setSelectedTool: vi.fn(),
    initialArgs: {},
    isRunning: false,
    showHistory: false,
    setShowHistory: vi.fn(),
    executionHistory: [],
    loadingHistory: false,
    selectedResult: null,
    showResultModal: false,
    setShowResultModal: vi.fn(),
    recentResults: [],
    setRecentResults: vi.fn(),
    urlParams: { search: '', category: '', server: '', view: 'grid', sortBy: 'name' },
    setUrlParam: vi.fn(),
    handleToggleTool: vi.fn(),
    handleExecuteTool: vi.fn(),
    fetchHistory: vi.fn(),
    handleToggleFavorite: vi.fn(),
    handleRunTool: vi.fn(),
  })),
}));

vi.mock('lucide-react', async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual };
});

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const { useMCPTools } = await import('../MCPToolsPage/hooks/useMCPTools');

describe('MCPToolsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const renderWithProviders = (ui: React.ReactElement) =>
    render(
      <MemoryRouter>
        <ToastProvider>{ui}</ToastProvider>
      </MemoryRouter>
    );

  it('shows empty state when no tools exist', async () => {
    renderWithProviders(<MCPToolsPage />);

    await waitFor(() => {
      expect(screen.getByText(/No tools found/i)).toBeInTheDocument();
    });
  });

  it('renders tools successfully', async () => {
    const mockTools = [
      {
        name: 'test-tool',
        description: 'A tool for testing',
        inputSchema: { type: 'object', properties: {} },
        serverId: 'server-1',
        serverName: 'test-server',
        category: 'general',
        enabled: true,
      },
    ];

    (useMCPTools as Mock).mockReturnValue({
      tools: mockTools,
      filteredTools: mockTools,
      loading: false,
      alert: null,
      setAlert: vi.fn(),
      favorites: [],
      recentlyUsed: [],
      selectedTool: null,
      setSelectedTool: vi.fn(),
      initialArgs: {},
      isRunning: false,
      showHistory: false,
      setShowHistory: vi.fn(),
      executionHistory: [],
      loadingHistory: false,
      selectedResult: null,
      showResultModal: false,
      setShowResultModal: vi.fn(),
      recentResults: [],
      setRecentResults: vi.fn(),
      urlParams: { search: '', category: '', server: '', view: 'grid', sortBy: 'name' },
      setUrlParam: vi.fn(),
      handleToggleTool: vi.fn(),
      handleExecuteTool: vi.fn(),
      fetchHistory: vi.fn(),
      handleToggleFavorite: vi.fn(),
      handleRunTool: vi.fn(),
    });

    renderWithProviders(<MCPToolsPage />);

    await waitFor(() => {
      expect(screen.getByText('test-tool')).toBeInTheDocument();
      expect(screen.getByText('A tool for testing')).toBeInTheDocument();
    });
  });

  it('shows alert when present', async () => {
    (useMCPTools as Mock).mockReturnValue({
      tools: [],
      filteredTools: [],
      loading: false,
      alert: { type: 'error', message: 'Something went wrong' },
      setAlert: vi.fn(),
      favorites: [],
      recentlyUsed: [],
      selectedTool: null,
      setSelectedTool: vi.fn(),
      initialArgs: {},
      isRunning: false,
      showHistory: false,
      setShowHistory: vi.fn(),
      executionHistory: [],
      loadingHistory: false,
      selectedResult: null,
      showResultModal: false,
      setShowResultModal: vi.fn(),
      recentResults: [],
      setRecentResults: vi.fn(),
      urlParams: { search: '', category: '', server: '', view: 'grid', sortBy: 'name' },
      setUrlParam: vi.fn(),
      handleToggleTool: vi.fn(),
      handleExecuteTool: vi.fn(),
      fetchHistory: vi.fn(),
      handleToggleFavorite: vi.fn(),
      handleRunTool: vi.fn(),
    });

    renderWithProviders(<MCPToolsPage />);

    await waitFor(() => {
      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });
});
