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
vi.mock('lucide-react', () => ({
  Clock: () => <span />,
  Download: () => <span />,
  LayoutList: () => <span />,
  GitBranch: () => <span />,
  RefreshCw: () => <span />,
  X: () => <span />,
}));

describe('ActivityPage', () => {
  let getActivityMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    // Mock API
    getActivityMock = vi.spyOn(apiService, 'getActivity').mockImplementation(vi.fn());
  });

  afterEach(() => {
    getActivityMock.mockRestore();
  });

  it('renders loading state initially', async () => {
    // Return a promise that doesn't resolve immediately to test loading state
    getActivityMock.mockReturnValue(new Promise(() => { }));

    render(<ActivityPage />);

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

    render(<ActivityPage />);

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

    render(<ActivityPage />);

    // Wait for loading to finish and error to appear
    await waitFor(() => expect(screen.getByTestId('alert')).toBeInTheDocument(), { timeout: 3000 });
    expect(screen.getByText('Network error')).toBeInTheDocument();
  });

  it.skip('refreshes data when refresh button is clicked', async () => {
    getActivityMock.mockResolvedValue({ events: [], filters: {} });

    render(<ActivityPage />);

    await waitFor(() => expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument(), { timeout: 3000 });

    // Clear previous calls
    getActivityMock.mockClear();

    // Find refresh button (RefreshCw icon is inside a button)
    // The PageHeader mock renders actions. We need to find the button inside it.
    // The refresh button is the 3rd button in the actions list (View Table, View Timeline, Auto, Refresh, Export)
    // Actually, let's just find by icon presence or similarity.
    // But since icons are mocked to empty spans, we rely on button order or structure.
    // In the component:
    // Button 1: Table
    // Button 2: Timeline
    // Toggle: Auto
    // Button 3: Refresh (has RefreshCw)
    // Button 4: Export (has Download)

    // Let's grab all buttons in page header
    const header = screen.getByTestId('page-header');
    const buttons = header.querySelectorAll('button');
    // buttons[0] = Table, [1] = Timeline, [2] = Refresh, [3] = Export
    // (Toggle is not a button in our mock, it's an input)

    const refreshButton = buttons[2];
    expect(refreshButton).not.toBeDisabled();
    fireEvent.click(refreshButton);

    expect(getActivityMock).toHaveBeenCalled();
  });
});
