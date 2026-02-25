import React from 'react';
import { render, waitFor, screen } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import ActivityPage from '../ActivityPage';
import { apiService } from '../../services/api';

// Mock API Service
vi.mock('../../services/api', () => ({
  apiService: {
    getActivity: vi.fn(),
  },
}));

// Mock DaisyUI components
vi.mock('../../components/DaisyUI', () => ({
  Alert: () => <div data-testid="alert" />,
  Badge: ({ children }: any) => <span data-testid="badge">{children}</span>,
  Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  DataTable: () => <div data-testid="data-table" />,
  StatsCards: () => <div data-testid="stats-cards" />,
  Timeline: () => <div data-testid="timeline" />,
  Toggle: () => <div data-testid="toggle" />,
  PageHeader: ({ title }: any) => <h1>{title}</h1>,
  LoadingSpinner: () => <div data-testid="loading" />,
  EmptyState: () => <div data-testid="empty-state" />,
}));

// Mock SearchFilterBar
vi.mock('../../components/SearchFilterBar', () => ({
  default: () => <div data-testid="search-filter-bar" />,
}));

describe('ActivityPage', () => {
  const mockActivityResponse = {
    events: [],
    filters: {
      agents: ['Bot1'],
      messageProviders: ['Discord'],
      llmProviders: ['OpenAI'],
    },
    timeline: [],
    agentMetrics: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (apiService.getActivity as any).mockResolvedValue(mockActivityResponse);
  });

  it('renders without crashing and fetches activity', async () => {
    render(<ActivityPage />);
    expect(screen.getByText('Activity Feed')).toBeDefined();
    await waitFor(() => {
        expect(apiService.getActivity).toHaveBeenCalledTimes(1);
    });
  });
});
