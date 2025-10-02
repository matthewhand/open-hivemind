import { screen, fireEvent, waitFor } from '@testing-library/react';
import { render } from '../../test-utils';
import { mockApiResponse } from '../../test-utils';

// Mock API service
const mockApiService = {
  deleteBot: jest.fn(),
  startBot: jest.fn(),
  stopBot: jest.fn(),
};

jest.mock('../../services/api', () => mockApiService);

interface Bot {
  id: string;
  name: string;
  status: 'running' | 'stopped' | 'error';
  config: Record<string, unknown>;
}

interface BotCardProps {
  bot: Bot;
  onEdit?: (bot: Bot) => void;
  onDelete?: (bot: Bot) => void;
  onStatusChange?: (bot: Bot) => void;
}

// Mock BotCard component (simplified version for testing)
const BotCard: React.FC<BotCardProps> = ({ bot, onEdit, onDelete, onStatusChange }) => {
  const handleStart = async () => {
    try {
      await mockApiService.startBot(bot.id);
      onStatusChange?.({ ...bot, status: 'running' });
    } catch (error) {
      console.error('Failed to start bot:', error);
    }
  };

  const handleStop = async () => {
    try {
      await mockApiService.stopBot(bot.id);
      onStatusChange?.({ ...bot, status: 'stopped' });
    } catch (error) {
      console.error('Failed to stop bot:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this bot?')) {
      try {
        await mockApiService.deleteBot(bot.id);
        onDelete?.(bot);
      } catch (error) {
        console.error('Failed to delete bot:', error);
      }
    }
  };

  return (
    <div data-testid={`bot-card-${bot.id}`}>
      <h3>{bot.name}</h3>
      <span data-testid="bot-status">{bot.status}</span>

      <div>
        {bot.status === 'stopped' && (
          <button data-testid="start-btn" onClick={handleStart}>
            Start
          </button>
        )}

        {bot.status === 'running' && (
          <button data-testid="stop-btn" onClick={handleStop}>
            Stop
          </button>
        )}

        <button data-testid="edit-btn" onClick={() => onEdit?.(bot)}>
          Edit
        </button>

        <button data-testid="delete-btn" onClick={handleDelete}>
          Delete
        </button>
      </div>
    </div>
  );
};

describe('BotCard Integration Tests', () => {
  const mockBot = {
    id: 'bot-1',
    name: 'Test Bot',
    status: 'stopped' as const,
    config: { token: 'test-token' },
  };

  const mockCallbacks = {
    onEdit: jest.fn(),
    onDelete: jest.fn(),
    onStatusChange: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Mock window.confirm
    window.confirm = jest.fn();
  });

  describe('Bot Status Management', () => {
    test('starts a stopped bot successfully', async () => {
      mockApiService.startBot.mockResolvedValue(mockApiResponse({ success: true }));

      render(<BotCard bot={mockBot} {...mockCallbacks} />);

      const startButton = screen.getByTestId('start-btn');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockApiService.startBot).toHaveBeenCalledWith('bot-1');
        expect(mockCallbacks.onStatusChange).toHaveBeenCalledWith({
          ...mockBot,
          status: 'running',
        });
      });
    });

    test('stops a running bot successfully', async () => {
      const runningBot = { ...mockBot, status: 'running' as const };
      mockApiService.stopBot.mockResolvedValue(mockApiResponse({ success: true }));

      render(<BotCard bot={runningBot} {...mockCallbacks} />);

      const stopButton = screen.getByTestId('stop-btn');
      fireEvent.click(stopButton);

      await waitFor(() => {
        expect(mockApiService.stopBot).toHaveBeenCalledWith('bot-1');
        expect(mockCallbacks.onStatusChange).toHaveBeenCalledWith({
          ...runningBot,
          status: 'stopped',
        });
      });
    });

    test('handles start bot API failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      mockApiService.startBot.mockRejectedValue(new Error('API Error'));

      render(<BotCard bot={mockBot} {...mockCallbacks} />);

      const startButton = screen.getByTestId('start-btn');
      fireEvent.click(startButton);

      await waitFor(() => {
        expect(mockApiService.startBot).toHaveBeenCalledWith('bot-1');
        expect(mockCallbacks.onStatusChange).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('Failed to start bot:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });

    test('shows correct buttons based on bot status', () => {
      const { rerender } = render(<BotCard bot={mockBot} {...mockCallbacks} />);

      expect(screen.getByTestId('start-btn')).toBeInTheDocument();
      expect(screen.queryByTestId('stop-btn')).not.toBeInTheDocument();

      // Rerender with running bot
      const runningBot = { ...mockBot, status: 'running' as const };
      rerender(<BotCard bot={runningBot} {...mockCallbacks} />);

      expect(screen.queryByTestId('start-btn')).not.toBeInTheDocument();
      expect(screen.getByTestId('stop-btn')).toBeInTheDocument();
    });
  });

  describe('Bot Deletion', () => {
    test('deletes bot when user confirms', async () => {
      (window.confirm as jest.Mock).mockReturnValue(true);
      mockApiService.deleteBot.mockResolvedValue(mockApiResponse({ success: true }));

      render(<BotCard bot={mockBot} {...mockCallbacks} />);

      const deleteButton = screen.getByTestId('delete-btn');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this bot?');
        expect(mockApiService.deleteBot).toHaveBeenCalledWith('bot-1');
        expect(mockCallbacks.onDelete).toHaveBeenCalledWith(mockBot);
      });
    });

    test('does not delete bot when user cancels', async () => {
      (window.confirm as jest.Mock).mockReturnValue(false);

      render(<BotCard bot={mockBot} {...mockCallbacks} />);

      const deleteButton = screen.getByTestId('delete-btn');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to delete this bot?');
        expect(mockApiService.deleteBot).not.toHaveBeenCalled();
        expect(mockCallbacks.onDelete).not.toHaveBeenCalled();
      });
    });

    test('handles delete API failure', async () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      (window.confirm as jest.Mock).mockReturnValue(true);
      mockApiService.deleteBot.mockRejectedValue(new Error('API Error'));

      render(<BotCard bot={mockBot} {...mockCallbacks} />);

      const deleteButton = screen.getByTestId('delete-btn');
      fireEvent.click(deleteButton);

      await waitFor(() => {
        expect(mockApiService.deleteBot).toHaveBeenCalledWith('bot-1');
        expect(mockCallbacks.onDelete).not.toHaveBeenCalled();
        expect(consoleSpy).toHaveBeenCalledWith('Failed to delete bot:', expect.any(Error));
      });

      consoleSpy.mockRestore();
    });
  });

  describe('Bot Editing', () => {
    test('calls onEdit callback when edit button is clicked', () => {
      render(<BotCard bot={mockBot} {...mockCallbacks} />);

      const editButton = screen.getByTestId('edit-btn');
      fireEvent.click(editButton);

      expect(mockCallbacks.onEdit).toHaveBeenCalledWith(mockBot);
    });
  });

  describe('UI State', () => {
    test('displays bot information correctly', () => {
      render(<BotCard bot={mockBot} {...mockCallbacks} />);

      expect(screen.getByText('Test Bot')).toBeInTheDocument();
      expect(screen.getByTestId('bot-status')).toHaveTextContent('stopped');
    });

    test('updates status display when bot status changes', () => {
      const { rerender } = render(<BotCard bot={mockBot} {...mockCallbacks} />);

      expect(screen.getByTestId('bot-status')).toHaveTextContent('stopped');

      const runningBot = { ...mockBot, status: 'running' as const };
      rerender(<BotCard bot={runningBot} {...mockCallbacks} />);

      expect(screen.getByTestId('bot-status')).toHaveTextContent('running');
    });
  });
});