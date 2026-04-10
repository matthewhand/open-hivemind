import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import StandaloneActivity from '../StandaloneActivity';
import { apiService } from '../../services/api';

// Mock individual DaisyUI components as used by ActivityMonitor
vi.mock('../../components/DaisyUI/Card', () => ({
  default: ({ children }: any) => <div data-testid="card">{children}</div>,
}));
vi.mock('../../components/DaisyUI/Badge', () => ({
  default: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));
vi.mock('../../components/DaisyUI/Button', () => ({
  default: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));
vi.mock('../../components/DaisyUI/DataTable', () => ({
  default: ({ data }: any) => <div data-testid="data-table">Rows: {data?.length}</div>,
}));
vi.mock('../../components/DaisyUI/StatsCards', () => ({
  default: () => <div data-testid="stats-cards" />,
}));
vi.mock('../../components/DaisyUI/Input', () => ({
  default: (props: any) => <input {...props} />,
}));
vi.mock('../../components/DaisyUI/Skeleton', () => ({
  SkeletonTimeline: () => <div data-testid="loading-spinner" />,
}));
vi.mock('../../components/DaisyUI/EmptyState', () => ({
  default: ({ title }: any) => <div data-testid="empty-state">{title}</div>,
}));

// Mock API
vi.mock('../../services/api', () => ({
  apiService: {
    getActivity: vi.fn(),
  },
}));

// Mock WebSocket hook used by ActivityMonitor
vi.mock('../../hooks/useWebSocket', () => ({
  useWebSocket: () => ({ messages: [] }),
}));

// Mock SearchFilterBar used by ActivityMonitor
vi.mock('../../components/SearchFilterBar', () => ({
  default: () => <div data-testid="search-filter-bar" />,
}));

describe('StandaloneActivity', () => {
  it('renders ActivityMonitor and loads data', async () => {
    const mockEvents = [
      { id: '1', botName: 'Bot1', status: 'success', provider: 'discord', messageType: 'incoming', timestamp: new Date().toISOString() },
      { id: '2', botName: 'Bot2', status: 'error', provider: 'slack', messageType: 'outgoing', timestamp: new Date().toISOString() },
    ];

    (apiService.getActivity as any).mockResolvedValue({
      events: mockEvents,
      filters: { agents: ['Bot1', 'Bot2'], messageProviders: ['discord', 'slack'] },
      timeline: [],
      agentMetrics: []
    });

    render(<StandaloneActivity />);

    // Wait for API call
    await waitFor(() => {
      expect(apiService.getActivity).toHaveBeenCalled();
    });

    // Wait for data to be rendered in the DataTable
    await waitFor(() => {
      expect(screen.getByTestId('data-table')).toHaveTextContent('Rows: 2');
    });
  });
});
