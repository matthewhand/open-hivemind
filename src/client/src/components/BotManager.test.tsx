import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { setupStore } from '../store';
import BotManager from './BotManager';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';

// Mock the API slice to avoid actual API calls
jest.mock('../store/slices/apiSlice', () => ({
  useGetConfigQuery: jest.fn(),
  useCreateBotMutation: jest.fn(),
  useCloneBotMutation: jest.fn(),
  useDeleteBotMutation: jest.fn(),
}));

const { useGetConfigQuery, useCreateBotMutation, useCloneBotMutation, useDeleteBotMutation } = require('../store/slices/apiSlice');

// Mock server for API endpoints
const server = setupServer(
  http.get('/webui/api/config', ({ request, params, cookies }) => {
    return HttpResponse.json({
      success: true,
      data: {
        bots: [
          {
            name: 'Test Bot 1',
            messageProvider: 'discord',
            llmProvider: 'openai',
            status: 'online',
            lastActivity: '2023-10-10T10:00:00Z',
          },
          {
            name: 'Test Bot 2',
            messageProvider: 'slack',
            llmProvider: 'openai',
            status: 'offline',
            lastActivity: '2023-10-09T10:00:00Z',
          },
          {
            name: 'Test Bot 3',
            messageProvider: 'mattermost',
            llmProvider: 'flowise',
            status: 'error',
            lastActivity: '2023-10-08T10:00:00Z',
          },
        ],
      },
    });
  })
);

beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

const renderWithProviders = (ui: React.ReactElement) => {
  const store = setupStore();
  return render(
    <Provider store={store}>
      {ui}
    </Provider>
  );
};

describe('BotManager Component', () => {
  beforeEach(() => {
    // Reset mocks
    (useGetConfigQuery as jest.Mock).mockReturnValue({
      data: {
        bots: [
          {
            name: 'Test Bot 1',
            messageProvider: 'discord',
            llmProvider: 'openai',
            status: 'online',
            lastActivity: '2023-10-10T10:00:00Z',
          },
          {
            name: 'Test Bot 2',
            messageProvider: 'slack',
            llmProvider: 'openai',
            status: 'offline',
            lastActivity: '2023-10-09T10:00:00Z',
          },
          {
            name: 'Test Bot 3',
            messageProvider: 'mattermost',
            llmProvider: 'flowise',
            status: 'error',
            lastActivity: '2023-10-08T10:00:00Z',
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      refetch: jest.fn(),
    });

    (useCreateBotMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
    (useCloneBotMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
    (useDeleteBotMutation as jest.Mock).mockReturnValue([jest.fn(), { isLoading: false }]);
  });

  test('renders bot cards with status indicators', () => {
    renderWithProviders(<BotManager />);

    // Check that all bots are rendered
    expect(screen.getByText('Test Bot 1')).toBeInTheDocument();
    expect(screen.getByText('Test Bot 2')).toBeInTheDocument();
    expect(screen.getByText('Test Bot 3')).toBeInTheDocument();

    // Check status indicators
    expect(screen.getByText('Online')).toBeInTheDocument();
    expect(screen.getByText('Offline')).toBeInTheDocument();
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

 test('renders configuration preview and last activity', () => {
    renderWithProviders(<BotManager />);

    // Check for configuration preview
    expect(screen.getByText('Msg:discord')).toBeInTheDocument();
    expect(screen.getByText('LLM:openai')).toBeInTheDocument();
    expect(screen.getByText('Msg:slack')).toBeInTheDocument();

    // Check for last activity
    expect(screen.getByText('Last:')).toBeInTheDocument();
  });

  test('search functionality works', async () => {
    renderWithProviders(<BotManager />);

    // Initially all 3 bots should be visible
    expect(screen.getAllByRole('button', { name: /select bot/i })).toHaveLength(3);

    // Search for 'Test Bot 1'
    const searchInput = screen.getByPlaceholderText('Search bots (/ to focus)');
    fireEvent.change(searchInput, { target: { value: 'Test Bot 1' } });

    // Only 1 bot should be visible now
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /select bot/i })).toHaveLength(1);
      expect(screen.getByText('Test Bot 1')).toBeInTheDocument();
    });
  });

  test('filter functionality works', async () => {
    renderWithProviders(<BotManager />);

    // Initially all 3 bots should be visible
    expect(screen.getAllByRole('button', { name: /select bot/i })).toHaveLength(3);

    // Filter by status 'online'
    const statusFilter = screen.getByRole('combobox', { name: /status/i });
    fireEvent.mouseDown(statusFilter);
    
    const onlineOption = screen.getByText('Online');
    fireEvent.click(onlineOption);

    // Only 1 bot should be visible now
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: /select bot/i })).toHaveLength(1);
      expect(screen.getByText('Test Bot 1')).toBeInTheDocument();
    });
  });

  test('bulk selection works', () => {
    renderWithProviders(<BotManager />);

    // Initially no bots selected
    expect(screen.queryByText('Clear Selection')).not.toBeInTheDocument();

    // Select all bots
    fireEvent.click(screen.getByRole('button', { name: /select all/i }));

    // Verify all 3 bots are selected
    expect(screen.getByText('Clear Selection')).toBeInTheDocument();
 });

  test('keyboard shortcuts work', () => {
    renderWithProviders(<BotManager />);

    // Simulate pressing '/' to focus search
    fireEvent.keyDown(window, { key: '/' });
    
    // Check if search input is focused
    expect(screen.getByPlaceholderText('Search bots (/ to focus)')).toHaveFocus();
  });

  test('bulk delete dialog opens', () => {
    renderWithProviders(<BotManager />);

    // Select all bots
    fireEvent.click(screen.getByRole('button', { name: /select all/i }));

    // Click delete button
    fireEvent.click(screen.getByText('Delete Selected (3)'));

    // Check if bulk delete dialog is open
    expect(screen.getByText('Delete 3 Bot(s)')).toBeInTheDocument();
 });

  test('bulk clone dialog opens', () => {
    renderWithProviders(<BotManager />);

    // Select all bots
    fireEvent.click(screen.getByRole('button', { name: /select all/i }));

    // Click clone button
    fireEvent.click(screen.getByText('Clone Selected (3)'));

    // Check if bulk clone dialog is open
    expect(screen.getByText('Bulk Clone 3 Bot(s)')).toBeInTheDocument();
  });
});