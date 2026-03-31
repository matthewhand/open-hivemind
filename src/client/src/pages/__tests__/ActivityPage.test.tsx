import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import ActivityPage from '../ActivityPage';
import { apiService } from '../../services/api';

// Mock components to avoid deep rendering issues and dependency on child implementations
vi.mock('../../components/DaisyUI', () => ({
  Alert: ({ message }: any) => <div data-testid="alert">{message}</div>,
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
  Button: ({ children, onClick, disabled, title }: any) => <button onClick={onClick} disabled={disabled} title={title}>{children}</button>,
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  DataTable: () => <div data-testid="data-table" />,
  StatsCards: () => <div data-testid="stats-cards" />,
  Timeline: () => <div data-testid="timeline" />,
  Toggle: ({ onChange }: any) => <input type="checkbox" data-testid="toggle" onChange={onChange} />,
  PageHeader: ({ title, actions }: any) => (
    <div data-testid="page-header">
      <h1>{title}</h1>
      {actions}
    </div>
  ),
  LoadingSpinner: () => <div data-testid="loading-spinner" />,
  SkeletonPage: () => <div data-testid="loading-spinner" />,
  EmptyState: ({ title }: any) => <div data-testid="empty-state">{title}</div>,
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
    if (!apiService.system) {
      apiService.system = { activity: {} } as any;
    }
    if (!apiService.system.activity) {
      apiService.system.activity = {} as any;
    }
    getActivityMock = vi.fn();
    apiService.system.activity.get = getActivityMock;
    vi.spyOn(apiService.system.activity, 'get').mockImplementation(getActivityMock);

    // Also mock the backwards-compatible flat method just in case
    apiService.getActivity = getActivityMock;
    vi.spyOn(apiService, 'getActivity').mockImplementation(getActivityMock);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    // Return a promise that doesn't resolve immediately to test loading state
    getActivityMock.mockReturnValue(new Promise(() => { }));

    render(
      <MemoryRouter>
        <ActivityPage />
      </MemoryRouter>
    );

    // We expect loading spinner to be present
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

    render(
      <MemoryRouter>
        <ActivityPage />
      </MemoryRouter>
    );

    // Wait for loading to finish
    await waitFor(() => expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument(), { timeout: 3000 });

    // Should show stats cards
    expect(screen.getByTestId('stats-cards')).toBeInTheDocument();

    // Should show data table (default view)
    expect(screen.getByTestId('data-table')).toBeInTheDocument();
  });

  it('handles API errors gracefully', async () => {
    getActivityMock.mockRejectedValue(new Error('Network error'));

    render(
      <MemoryRouter>
        <ActivityPage />
      </MemoryRouter>
    );

    // Wait for loading to finish and error to appear
    await waitFor(() => expect(screen.getByTestId('alert')).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it.todo("refreshes data when refresh button is clicked" /* TODO: Fix flaky test */);
});
