import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';
import StandaloneActivity from '../StandaloneActivity';
import { apiService } from '../../services/api';

// Mock components
vi.mock('../../components/DaisyUI/Alert', () => ({
  Alert: ({ message }: any) => <div data-testid="alert">{message}</div>,
}));
vi.mock('../../components/DaisyUI/Badge', () => ({
  default: ({ children }: any) => <span data-testid="badge">{children}</span>,
}));
vi.mock('../../components/DaisyUI/Button', () => ({
  default: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button>,
}));
vi.mock('../../components/DaisyUI/Card', () => ({
  default: ({ children }: any) => <div data-testid="card">{children}</div>,
}));
vi.mock('../../components/DaisyUI/DataTable', () => ({
  default: ({ data }: any) => <div data-testid="data-table">Rows: {data?.length}</div>,
}));

// Mock API
vi.mock('../../services/api', () => ({
  apiService: {
    getActivity: vi.fn(),
  },
}));

describe('StandaloneActivity', () => {
  it('renders ActivityMonitor and loads data', async () => {
    const mockEvents = [
      { id: '1', botName: 'Bot1', status: 'success', timestamp: new Date().toISOString() },
      { id: '2', botName: 'Bot2', status: 'error', timestamp: new Date().toISOString() },
    ];

    (apiService.getActivity as any).mockResolvedValue({
      events: mockEvents,
      filters: {},
      timeline: [],
      agentMetrics: []
    });

    render(<StandaloneActivity />);

    // ActivityMonitor initially shows loading (which might render card with spinner or similar)
    // Or it renders DataTable with loading prop.
    // Our mock DataTable just renders row count.

    // Wait for API call
    await waitFor(() => {
      expect(apiService.getActivity).toHaveBeenCalled();
    });

    // Wait for data to be rendered
    await waitFor(() => {
      expect(screen.getByTestId('data-table')).toHaveTextContent('Rows: 2');
    });
  });
});
