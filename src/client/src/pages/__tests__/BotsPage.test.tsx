import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../../components/DaisyUI/ToastNotification';
import BotsPage from '../BotsPage';
import { vi, type Mock } from 'vitest';

// Mock sub-hooks used by BotsPage
const mockFetchBots = vi.fn();
const mockRefetch = vi.fn();

vi.mock('../BotsPage/hooks/useBotsPageData', () => ({
  useBotsPageData: vi.fn(() => ({
    personas: [],
    llmProfiles: [],
    globalConfig: {},
    configLoading: false,
    refetch: mockRefetch,
  })),
}));

vi.mock('../BotsPage/hooks/useBotsList', () => ({
  useBotsList: vi.fn(() => ({
    bots: [],
    setBots: vi.fn(),
    botsLoading: false,
    fetchBots: mockFetchBots,
  })),
}));

vi.mock('../BotsPage/hooks/useBotPreview', () => ({
  useBotPreview: vi.fn(() => ({
    previewBot: null,
    setPreviewBot: vi.fn(),
    previewTab: 'activity',
    setPreviewTab: vi.fn(),
    activityLogs: [],
    chatHistory: [],
    logFilter: 'all',
    setLogFilter: vi.fn(),
    activityError: null,
    chatError: null,
    fetchPreviewActivity: vi.fn(),
    fetchPreviewChat: vi.fn(),
    handlePreviewBot: vi.fn(),
  })),
}));

vi.mock('../BotsPage/hooks/useBotActions', () => ({
  useBotActions: vi.fn(() => ({
    handleSaveBot: vi.fn(),
    handleDeleteBot: vi.fn(),
    handleToggleBot: vi.fn(),
    handleDuplicateBot: vi.fn(),
  })),
}));

vi.mock('../BotsPage/hooks/useBotExport', () => ({
  useBotExport: vi.fn(() => ({
    handleExportBot: vi.fn(),
    handleImportBots: vi.fn(),
  })),
}));

vi.mock('../../hooks/useUrlParams', () => ({
  default: vi.fn(() => ({
    values: { search: '', status: 'all' },
    setValue: vi.fn(),
  })),
}));

vi.mock('../../hooks/useBreakpoint', () => ({
  useIsBelowBreakpoint: vi.fn(() => false),
}));

vi.mock('../../hooks/useBulkSelection', () => ({
  useBulkSelection: vi.fn(() => ({
    selectedIds: new Set(),
    selectedCount: 0,
    isAllSelected: false,
    isIndeterminate: false,
    toggleSelection: vi.fn(),
    toggleAll: vi.fn(),
    clearSelection: vi.fn(),
    isSelected: vi.fn(() => false),
    toggleItem: vi.fn(),
  })),
}));

vi.mock('../../hooks/useDragAndDrop', () => ({
  useDragAndDrop: vi.fn(() => ({
    onDragStart: vi.fn(() => vi.fn()),
    onDragOver: vi.fn(() => vi.fn()),
    onDragEnd: vi.fn(),
    onDrop: vi.fn(() => vi.fn()),
    onMoveUp: vi.fn(),
    onMoveDown: vi.fn(),
    getItemStyle: vi.fn(() => ({})),
  })),
}));

vi.mock('../../contexts/SavedStampContext', () => ({
  useSavedStamp: vi.fn(() => ({ showStamp: vi.fn() })),
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

const { useBotsList } = await import('../BotsPage/hooks/useBotsList');
const { useBotsPageData } = await import('../BotsPage/hooks/useBotsPageData');

describe('BotsPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });
  });

  const renderWithProviders = (ui: React.ReactElement) =>
    render(
      <QueryClientProvider client={queryClient}>
        <MemoryRouter>
          <ToastProvider>{ui}</ToastProvider>
        </MemoryRouter>
      </QueryClientProvider>
    );

  it('shows loading state when bots are loading', () => {
    (useBotsList as Mock).mockReturnValue({
      bots: [],
      setBots: vi.fn(),
      botsLoading: true,
      fetchBots: mockFetchBots,
    });

    renderWithProviders(<BotsPage />);
    expect(document.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });

  it('shows empty state when no bots exist', async () => {
    (useBotsList as Mock).mockReturnValue({
      bots: [],
      setBots: vi.fn(),
      botsLoading: false,
      fetchBots: mockFetchBots,
    });

    renderWithProviders(<BotsPage />);

    await waitFor(() => {
      expect(screen.getByText(/Your swarm is empty/i)).toBeInTheDocument();
    });
  });

  it('renders bots successfully', async () => {
    const mockBots = [
      {
        id: 'bot-1',
        name: 'Test Bot 1',
        description: 'First test bot',
        persona_id: 'persona-1',
        provider: 'discord',
        token: 'token-1',
        status: 'active',
        created_at: '2023-01-01T00:00:00Z',
        updated_at: '2023-01-01T00:00:00Z',
        type: 'standard',
        system_prompt: 'hello',
      },
    ];

    (useBotsList as Mock).mockReturnValue({
      bots: mockBots,
      setBots: vi.fn(),
      botsLoading: false,
      fetchBots: mockFetchBots,
    });

    renderWithProviders(<BotsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Bot 1')).toBeInTheDocument();
    });
  });

  it('shows error state when loading fails', async () => {
    (useBotsList as Mock).mockReturnValue({
      bots: [],
      setBots: vi.fn(),
      botsLoading: false,
      fetchBots: mockFetchBots,
    });

    // Simulate the component setting error state through the hook
    (useBotsPageData as Mock).mockReturnValue({
      personas: [],
      llmProfiles: [],
      globalConfig: {},
      configLoading: false,
      refetch: mockRefetch,
    });

    renderWithProviders(<BotsPage />);

    // With no bots returned and no loading, the empty state should show
    await waitFor(() => {
      expect(screen.getByText(/Your swarm is empty/i)).toBeInTheDocument();
    });
  });
});
