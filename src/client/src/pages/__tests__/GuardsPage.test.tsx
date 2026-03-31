import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ToastProvider } from '../../components/DaisyUI/ToastNotification';
import GuardsPage from '../GuardsPage';
import { vi } from 'vitest';

vi.mock('lucide-react', async (importOriginal) => {
  const actual: any = await importOriginal();
  return { ...actual };
});

describe('GuardsPage', () => {
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

  it('shows loading spinner initially', () => {
    // Mock fetch to never resolve so the query stays in loading state
    vi.spyOn(globalThis, 'fetch').mockReturnValue(new Promise(() => {}));

    renderWithProviders(<GuardsPage />);
    expect(document.querySelectorAll('.loading-spinner').length).toBeGreaterThan(0);
  });

  it('renders guard profiles page heading when loaded', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: [] }),
    } as Response);

    renderWithProviders(<GuardsPage />);

    await waitFor(() => {
      expect(screen.getByText('Guard Profiles')).toBeInTheDocument();
    });
  });

  it('renders guard profiles when data is available', async () => {
    const mockProfiles = [
      {
        id: 'guard-1',
        name: 'Test Guard',
        description: 'A test guard profile',
        guards: {
          mcpGuard: { enabled: false, type: 'owner', allowedUsers: [], allowedTools: [] },
          rateLimit: { enabled: false, maxRequests: 100, windowMs: 60000 },
          contentFilter: { enabled: false, strictness: 'medium', blockedTerms: [] },
        },
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      },
    ];

    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ data: mockProfiles }),
    } as Response);

    renderWithProviders(<GuardsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Guard')).toBeInTheDocument();
    });
  });
});
