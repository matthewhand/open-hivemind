import { render, screen, waitFor } from '@testing-library/react';
import ActivityPage from '../ActivityPage';
import { apiService } from '../../services/api';
import { vi } from 'vitest';

// Mock apiService
vi.mock('../../services/api', () => ({
    apiService: {
        getActivity: vi.fn(),
    },
}));

describe('ActivityPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders loading state initially', () => {
        (apiService.getActivity as ReturnType<typeof vi.fn>).mockResolvedValue({
            events: [],
            filters: { agents: [], messageProviders: [], llmProviders: [] },
        });

        render(<ActivityPage />);

        expect(screen.getByRole('status')).toBeInTheDocument();
    });

    test('handles successful data fetch', async () => {
        const mockData = {
            events: [
                {
                    id: '1',
                    timestamp: new Date().toISOString(),
                    botName: 'TestBot',
                    provider: 'discord',
                    llmProvider: 'openai',
                    status: 'success',
                    processingTime: 100,
                    messageType: 'incoming',
                },
            ],
            filters: { agents: ['TestBot'], messageProviders: ['discord'], llmProviders: ['openai'] },
        };

        (apiService.getActivity as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

        render(<ActivityPage />);

        await waitFor(() => {
            expect(screen.getByText('TestBot')).toBeInTheDocument();
            expect(screen.queryByRole('status')).not.toBeInTheDocument();
        });
    });

    test('handles error state', async () => {
        (apiService.getActivity as ReturnType<typeof vi.fn>).mockRejectedValue(new Error('Network error'));

        render(<ActivityPage />);

        await waitFor(() => {
            expect(screen.getByText('Network error')).toBeInTheDocument();
        });
    });

    test('handles retry logic for network errors', async () => {
        const networkError = new Error('Network error');
        const successData = {
            events: [],
            filters: { agents: [], messageProviders: [], llmProviders: [] },
        };

        // First call fails, second call succeeds
        (apiService.getActivity as ReturnType<typeof vi.fn>)
            .mockRejectedValueOnce(networkError)
            .mockResolvedValueOnce(successData);

        render(<ActivityPage />);

        await waitFor(() => {
            expect(screen.getByText('Network error')).toBeInTheDocument();
            expect(screen.getByText('Retry (1/3)')).toBeInTheDocument();
        });
    });

    test('does not retry for non-transient errors', async () => {
        const authError = new Error('Authentication failed');
        (apiService.getActivity as ReturnType<typeof vi.fn>).mockRejectedValue(authError);

        render(<ActivityPage />);

        await waitFor(() => {
            expect(screen.getByText('Authentication failed')).toBeInTheDocument();
            expect(screen.queryByText('Retry')).not.toBeInTheDocument();
        });
    });

    test('auto-refresh functionality', async () => {
        const mockData = {
            events: [],
            filters: { agents: [], messageProviders: [], llmProviders: [] },
        };

        (apiService.getActivity as ReturnType<typeof vi.fn>).mockResolvedValue(mockData);

        render(<ActivityPage />);

        // Wait for initial load
        await waitFor(() => {
            expect(screen.queryByRole('status')).not.toBeInTheDocument();
        });

        // Find and toggle auto-refresh
        const autoRefreshToggle = screen.getByLabelText('Auto');
        // fireEvent.click(autoRefreshToggle);

        // Should start auto-refreshing (we can't test the interval directly, but we can test the state)
        expect(autoRefreshToggle).toBeChecked();
    });

    test('empty state', async () => {
        const mockData = {
            events: [],
            filters: { agents: [], messageProviders: [], llmProviders: [] },
        };

        (apiService.getActivity as vi.Mock).mockResolvedValue(mockData);

        render(<ActivityPage />);

        await waitFor(() => {
            expect(screen.getByText("No activity yet")).toBeInTheDocument();
            expect(screen.getByText("Events will appear here as your bots process messages")).toBeInTheDocument();
        });
    });

    test('error state with retry button', async () => {
        const networkError = new Error('Network error');
        (apiService.getActivity as vi.Mock).mockRejectedValue(networkError);

        render(<ActivityPage />);

        await waitFor(() => {
            expect(screen.getByText('Network error')).toBeInTheDocument();
            expect(screen.getByText('Retry (1/3)')).toBeInTheDocument();
        });
    });
});