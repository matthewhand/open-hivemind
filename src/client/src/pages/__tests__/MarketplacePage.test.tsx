import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import MarketplacePage from '../MarketplacePage';

const mockErrorToast = vi.fn();
// Mock useToast hook
vi.mock('../../components/DaisyUI/ToastNotification', () => ({
  useToast: vi.fn(),
  useSuccessToast: () => vi.fn(),
  useErrorToast: () => mockErrorToast,
  useInfoToast: () => vi.fn(),
  useWarningToast: () => vi.fn(),
}));

// Mock UI components
vi.mock('../../components/DaisyUI', () => ({
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
  Button: ({ children, onClick, disabled }: any) => <button onClick={onClick} disabled={disabled} data-testid="button">{children}</button>,
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  Toggle: ({ checked, onChange }: any) => <input type="checkbox" checked={checked} onChange={onChange} data-testid="toggle" />,
  PageHeader: ({ title, actions }: any) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {actions}
    </div>
  ),
  EmptyState: ({ title }: any) => <div data-testid="empty-state">{title}</div>,
  SkeletonPage: () => <div data-testid="loading-spinner" />,
}));

vi.mock('../../components/DaisyUI/Alert', () => ({
  Alert: ({ message }: any) => <div data-testid="alert">{message}</div>,
}));

vi.mock('../../components/DaisyUI/Skeleton', () => ({
  SkeletonPage: () => <div data-testid="loading-spinner" />,
  SkeletonTableLayout: () => <div data-testid="loading-spinner" />,
  SkeletonGrid: () => <div data-testid="loading-spinner" />,
}));

describe('MarketplacePage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders loading state initially', async () => {
    vi.mocked(global.fetch).mockReturnValue(new Promise(() => {}));

    render(
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>
    );

    // Initial loading uses skeleton pages, not full page loading
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders packages when loaded successfully', async () => {
    const mockPackages = [
      { name: 'pkg1', displayName: 'Package 1', description: 'Desc 1', version: '1.0.0', installed: true, repoUrl: 'http://test.local', author: 'test', type: 'llm', status: 'installed' },
      { name: 'pkg2', displayName: 'Package 2', description: 'Desc 2', version: '2.0.0', installed: false, repoUrl: 'http://test.local', author: 'test', type: 'message', status: 'available' }
    ];
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockPackages)
    } as any);

    render(
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('Package 1')).toBeInTheDocument();
    expect(screen.getByText('Package 2')).toBeInTheDocument();
  });

  it('renders empty state when no packages exist', async () => {
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([])
    } as any);

    render(
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
    });

    expect(screen.getByText('No packages found')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    vi.mocked(global.fetch).mockRejectedValue(new Error('Failed to fetch packages'));

    render(
      <MemoryRouter>
        <MarketplacePage />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch packages')).toBeInTheDocument();
    });
  });
});
