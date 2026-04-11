import React from 'react';
import '@testing-library/jest-dom';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { WebSocketProvider } from '../../contexts/WebSocketContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { vi } from 'vitest';
import ActivityPage from '../ActivityPage';


vi.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    lastMessage: null,
    sendMessage: vi.fn(),
    subscribe: vi.fn(() => vi.fn()),
    getConnectionStatus: () => 'connected',
    connect: vi.fn(),
    socket: null
  })
}));

import { apiService } from '../../services/api';

vi.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    socket: null,
    connected: false,
    error: null,
    connect: vi.fn(),
    disconnect: vi.fn()
  })
}));

// Mock components to avoid deep rendering issues and dependency on child implementations
vi.mock('../../components/DaisyUI/Alert', () => ({
  Alert: ({ message }: any) => <div data-testid="alert">{message}</div>,
}));
vi.mock('../../components/DaisyUI/Badge', () => ({
  default: ({ children }: any) => <span data-testid="badge">{children}</span>,
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));
vi.mock('../../components/DaisyUI/Button', () => ({
  default: ({ children, onClick, disabled, title }: any) => <button onClick={onClick} disabled={disabled} title={title}>{children}</button>,
  Button: ({ children, onClick, disabled, title }: any) => <button onClick={onClick} disabled={disabled} title={title}>{children}</button>,
}));
vi.mock('../../components/DaisyUI/Card', () => ({
  default: ({ children }: any) => <div data-testid="card">{children}</div>,
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
}));
vi.mock('../../components/DaisyUI/DataTable', () => ({
  default: () => <div data-testid="data-table" />,
  DataTable: () => <div data-testid="data-table" />,
}));
vi.mock('../../components/DaisyUI/StatsCards', () => ({
  default: () => <div data-testid="stats-cards" />,
  StatsCards: () => <div data-testid="stats-cards" />,
}));
vi.mock('../../components/DaisyUI/Timeline', () => ({
  default: () => <div data-testid="timeline" />,
  Timeline: () => <div data-testid="timeline" />,
}));
vi.mock('../../components/DaisyUI/Toggle', () => ({
  default: ({ onChange }: any) => <input type="checkbox" data-testid="toggle" onChange={onChange} />,
  Toggle: ({ onChange }: any) => <input type="checkbox" data-testid="toggle" onChange={onChange} />,
}));
vi.mock('../../components/DaisyUI/PageHeader', () => ({
  default: ({ title, actions }: any) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {actions}
    </div>
  ),
  PageHeader: ({ title, actions }: any) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {actions}
    </div>
  ),
}));
vi.mock('../../components/DaisyUI/LoadingSpinner', () => ({
  default: () => <div data-testid="loading-spinner" />,
  LoadingSpinner: () => <div data-testid="loading-spinner" />,
}));
vi.mock('../../components/DaisyUI/EmptyState', () => ({
  default: ({ title, actionLabel, onAction }: any) => (
    <div data-testid="empty-state">
      {title}
      {actionLabel && onAction && (
        <button onClick={onAction} aria-label={typeof actionLabel === 'string' ? actionLabel : 'action'}>
          {actionLabel}
        </button>
      )}
    </div>
  ),
  EmptyState: ({ title, actionLabel, onAction }: any) => (
    <div data-testid="empty-state">
      {title}
      {actionLabel && onAction && (
        <button onClick={onAction} aria-label={typeof actionLabel === 'string' ? actionLabel : 'action'}>
          {actionLabel}
        </button>
      )}
    </div>
  ),
}));
vi.mock('../../components/DaisyUI/Input', () => ({
  default: ({ type, value, onChange, placeholder }: any) => (
    <input
      data-testid={placeholder === 'Start Date' ? 'start-date' : placeholder === 'End Date' ? 'end-date' : 'input'}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  ),
  Input: ({ type, value, onChange, placeholder }: any) => (
    <input
      data-testid={placeholder === 'Start Date' ? 'start-date' : placeholder === 'End Date' ? 'end-date' : 'input'}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
    />
  ),
}));

// Mock Skeleton components
vi.mock('../../components/DaisyUI/Skeleton', () => ({
  SkeletonPage: () => <div data-testid="loading-spinner" />,
}));

// Mock SearchFilterBar
vi.mock('../../components/SearchFilterBar', () => ({
  default: ({ onSearchChange, children }: any) => (
    <div data-testid="search-filter-bar">
      <input
        data-testid="search-input"
        onChange={(e) => onSearchChange(e.target.value)}
      />
      {children}
    </div>
  ),
  SearchFilterBar: ({ onSearchChange, children }: any) => (
    <div data-testid="search-filter-bar">
      <input
        data-testid="search-input"
        onChange={(e) => onSearchChange(e.target.value)}
      />
      {children}
    </div>
  ),
}));

// Mock lucide-react icons
vi.mock('lucide-react', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    Clock: () => <span />,
    Download: () => <span />,
    LayoutList: () => <span />,
    GitBranch: () => <span />,
    RefreshCw: () => <span />,
    X: () => <span />,
    Search: () => <span />,
    Bot: () => <span />,
    MessageCircle: () => <span />,
    AlertTriangle: () => <span />,
    CheckCircle: () => <span />,
    Activity: () => <span />,
    XCircle: () => <span />,
    Server: () => <span />,
    Zap: () => <span />,
    Cpu: () => <span />,
    Network: () => <span />,
    Database: () => <span />,
    Lock: () => <span />,
    Unlock: () => <span />,
    Check: () => <span />,
    Info: () => <span />,
    Pause: () => <span />,
  };
});

describe('ActivityPage', () => {
  let getActivityMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock API
    getActivityMock = vi.spyOn(apiService, 'get').mockImplementation(vi.fn());
  });

  afterEach(() => {
    getActivityMock.mockRestore();
  });

  it('renders loading state initially', async () => {
    // Return a promise that doesn't resolve immediately to test loading state
    getActivityMock.mockReturnValue(new Promise(() => { }));

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><WebSocketProvider><WebSocketProvider>
          <WebSocketProvider><MemoryRouter><ActivityPage /></MemoryRouter></WebSocketProvider>
        </WebSocketProvider></WebSocketProvider></QueryClientProvider>);

    // We expect loading spinner to be present
    // Note: The component sets loading=true initially, and fetchActivity is called in useEffect.
    // So it should show loading spinner immediately.
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('renders data when loaded successfully', async () => {
    const mockData = {
      events: [
        {
          id: '1',
          timestamp: new Date().toISOString(),
          botName: 'TestBot',
          status: 'success',
          provider: 'discord',
          llmProvider: 'openai',
          messageType: 'text'
        }
      ],
      filters: {
        agents: ['TestBot'],
        messageProviders: ['discord'],
        llmProviders: ['openai']
      }
    };

    getActivityMock.mockResolvedValue(mockData);

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider>
          <WebSocketProvider><MemoryRouter>
          <ActivityPage />
        </MemoryRouter></WebSocketProvider>
        </WebSocketProvider>
      </QueryClientProvider>
    );

    // Wait for loading to finish
    await waitFor(() => expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument(), { timeout: 3000 });

    // Should show stats cards
    expect(screen.getByTestId('stats-cards')).toBeInTheDocument();

    // Should show data table (default view)
    expect(screen.getByTestId('data-table')).toBeInTheDocument();

    // API should have been called
    expect(getActivityMock).toHaveBeenCalled();
  });

  it('handles API errors gracefully', async () => {
    getActivityMock.mockRejectedValue(new Error('Network error'));

    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    render(
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider>
          <WebSocketProvider><MemoryRouter>
          <ActivityPage />
        </MemoryRouter></WebSocketProvider>
        </WebSocketProvider>
      </QueryClientProvider>
    );

    // Wait for loading to finish and error to appear
    await waitFor(() => expect(screen.getByTestId('alert')).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it('refreshes data when refresh button is clicked', async () => {
    // Return empty events so the EmptyState (with its Refresh button) is rendered
    const mockData = {
      events: [],
      filters: {
        agents: [],
        messageProviders: [],
        llmProviders: []
      }
    };

    getActivityMock.mockResolvedValue(mockData);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    render(<QueryClientProvider client={queryClient}><WebSocketProvider><WebSocketProvider>
          <WebSocketProvider><MemoryRouter><ActivityPage /></MemoryRouter></WebSocketProvider>
        </WebSocketProvider></WebSocketProvider></QueryClientProvider>);

    // Wait for initial load (EmptyState should render because events is empty)
    await waitFor(() => expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument(), { timeout: 3000 });

    // Clear previous calls
    getActivityMock.mockClear();

    // Find and click the Refresh button rendered by EmptyState
    const refreshButton = screen.getByRole('button', { name: /refresh/i });
    fireEvent.click(refreshButton);

    // Wait for refresh to complete
    await waitFor(() => expect(getActivityMock).toHaveBeenCalledTimes(1), { timeout: 2000 });
  });
});
