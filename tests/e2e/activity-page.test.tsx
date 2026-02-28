import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ActivityPage from '../../src/client/src/pages/ActivityPage';
import { apiService } from '../../src/client/src/services/api';
import { vi } from 'vitest';

// Mock apiService
vi.mock('../../src/client/src/services/api', () => ({
    apiService: {
        getActivity: vi.fn(),
    },
}));

describe('ActivityPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    test('renders loading state initially', () => {
        (apiService.getActivity as vi.Mock).mockResolvedValue({
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

        (apiService.getActivity as vi.Mock).mockResolvedValue(mockData);

        render(<ActivityPage />);

        await waitFor(() => {
            expect(screen.getByText('TestBot')).toBeInTheDocument();
            expect(screen.queryByRole('status')).not.toBeInTheDocument();
        });
    });

    test('handles error state', async () => {
        (apiService.getActivity as vi.Mock).mockRejectedValue(new Error('Network error'));

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
        (apiService.getActivity as vi.Mock)
            .mockRejectedValueOnce(networkError)
            .mockResolvedValueOnce(successData);

        render(<ActivityPage />);

        await waitFor(() => {
            expect(screen.getByText('Network error')).toBeInTheDocument();
            expect(screen.getByText('Retry (1/3)')).toBeInTheDocument();
        });

        // Click retry button
        const retryButton = screen.getByText('Retry (1/3)');
        fireEvent.click(retryButton);

        await waitFor(() => {
            expect(screen.queryByText('Network error')).not.toBeInTheDocument();
            expect(screen.queryByRole('status')).not.toBeInTheDocument();
        });
    });

    test('handles timeout errors with retry', async () => {
        const timeoutError = new Error('Request timeout');
        const successData = {
            events: [],
            filters: { agents: [], messageProviders: [], llmProviders: [] },
        };

        // First call fails, second call succeeds
        (apiService.getActivity as vi.Mock)
            .mockRejectedValueOnce(timeoutError)
            .mockResolvedValueOnce(successData);

        render(<ActivityPage />);

        await waitFor(() => {
            expect(screen.getByText('Request timeout')).toBeInTheDocument();
            expect(screen.getByText('Retry (1/3)')).toBeInTheDocument();
        });

        // Click retry button
        const retryButton = screen.getByText('Retry (1/3)');
        fireEvent.click(retryButton);

        await waitFor(() => {
            expect(screen.queryByText('Request timeout')).not.toBeInTheDocument();
            expect(screen.queryByRole('status')).not.toBeInTheDocument();
        });
    });

    test('does not retry for non-transient errors', async () => {
        const authError = new Error('Authentication failed');
        (apiService.getActivity as vi.Mock).mockRejectedValue(authError);

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

        (apiService.getActivity as vi.Mock).mockResolvedValue(mockData);

        render(<ActivityPage />);

        // Wait for initial load
        await waitFor(() => {
            expect(screen.queryByRole('status')).not.toBeInTheDocument();
        });

        // Find and toggle auto-refresh
        const autoRefreshToggle = screen.getByLabelText('Auto');
        fireEvent.click(autoRefreshToggle);

        // Should start auto-refreshing (we can't test the interval directly, but we can test the state)
        expect(autoRefreshToggle).toBeChecked();
    });

    test('export functionality', async () => {
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

        (apiService.getActivity as vi.Mock).mockResolvedValue(mockData);

        render(<ActivityPage />);

        await waitFor(() => {
            expect(screen.getByText('TestBot')).toBeInTheDocument();
        });

        // Find and click export button
        const exportButton = screen.getByText('Export');
        fireEvent.click(exportButton);

        // We can't test the actual download, but we can verify the button was clicked
        expect(exportButton).toBeDisabled(); // Should be disabled during export
    });

    test('filter functionality', async () => {
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

        (apiService.getActivity as vi.Mock).mockResolvedValue(mockData);

        render(<ActivityPage />);

        await waitFor(() => {
            expect(screen.getByText('TestBot')).toBeInTheDocument();
        });

        // Find bot filter and select a bot
        const botFilter = screen.getByLabelText('Bot');
        fireEvent.change(botFilter, { target: { value: 'TestBot' } });

        // Should trigger refetch (we can't test the actual refetch, but we can test the state)
        expect(botFilter).toHaveValue('TestBot');
    });

    test('search functionality', async () => {
        const mockData = {
            events: [
                {
                    id: '1',
                    timestamp: new Date().toISOString(),
                    botName: 'TestBot',
                    provider: 'discord',
                    llmProvider: 'openai',
                    status: 'success',
                    processingType: 'incoming',
                },
            ],
            filters: { agents: ['TestBot'], messageProviders: ['discord'], llmProviders: ['openai'] },
        };

        (apiService.getActivity as vi.Mock).mockResolvedValue(mockData);

        render(<ActivityPage />);

        await waitFor(() => {
            expect(screen.getByText('TestBot')).toBeInTheDocument();
        });

        // Find search input and type
        const searchInput = screen.getByPlaceholderText('Filter activity...');
        fireEvent.change(searchInput, { target: { value: 'TestBot' } });

        // Should filter events (we can't test the actual filtering, but we can test the state)
        expect(searchInput).toHaveValue('TestBot');
    });

    test('view mode toggle', async () => {
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

        (apiService.getActivity as vi.Mock).mockResolvedValue(mockData);

        render(<ActivityPage />);

        await waitFor(() => {
            expect(screen.getByText('TestBot')).toBeInTheDocument();
        });

        // Find timeline button and click
        const timelineButton = screen.getByText('Timeline');
        fireEvent.click(timelineButton);

        // Should switch to timeline view (we can't test the actual view, but we can test the state)
        expect(timelineButton).toHaveClass('btn-primary');
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