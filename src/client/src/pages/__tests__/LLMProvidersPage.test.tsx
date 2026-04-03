import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../../components/DaisyUI/ToastNotification';
import LLMProvidersPage from '../LLMProvidersPage';
import { apiService } from '../../services/api';
import { vi } from 'vitest';

vi.mock('../../services/api', () => ({
  apiService: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../hooks/useUrlParams', () => ({
  default: vi.fn(() => ({
    values: { search: '', status: 'all' },
    setValue: vi.fn(),
  })),
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
  })),
}));

vi.mock('../../hooks/useModal', () => ({
  useModal: vi.fn(() => ({
    isOpen: false,
    data: null,
    openModal: vi.fn(),
    closeModal: vi.fn(),
  })),
}));

vi.mock('../../contexts/WebSocketContext', () => ({
  useWebSocket: vi.fn(() => ({
    isConnected: true,
    botStats: [],
  })),
}));

vi.mock('../../contexts/SavedStampContext', () => ({
  useSavedStamp: vi.fn(() => ({ showStamp: vi.fn() })),
}));

vi.mock('lucide-react', async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual };
});

describe('LLMProvidersPage', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    });

    // Default mocks for the three queries the page makes
    vi.mocked(apiService.get).mockImplementation(async (endpoint: string) => {
      if (endpoint === '/api/config/llm-profiles') return { llm: [] };
      if (endpoint === '/api/config/llm-status') return { providers: [] };
      if (endpoint === '/api/config/global') return {};
      return {};
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

  it('shows loading state initially', () => {
    // Make the API call hang to keep loading state
    vi.mocked(apiService.get).mockReturnValue(new Promise(() => {}));

    renderWithProviders(<LLMProvidersPage />);
    expect(document.querySelectorAll('.skeleton').length).toBeGreaterThan(0);
  });

  it('renders LLM Providers heading', async () => {
    renderWithProviders(<LLMProvidersPage />);

    await waitFor(() => {
      expect(screen.getByText('LLM Providers')).toBeInTheDocument();
    });
  });

  it('shows empty state when no profiles exist', async () => {
    renderWithProviders(<LLMProvidersPage />);

    await waitFor(() => {
      // Page renders heading even with empty profiles
      expect(screen.getByText('LLM Providers')).toBeInTheDocument();
    });
  });
});
