import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import { vi } from 'vitest';
import InsightsModal from '../InsightsModal';
import { apiService } from '../../../services/api';

vi.mock('../../../services/api', () => ({
  apiService: {
    get: vi.fn(),
  },
}));

describe('InsightsModal State Integrity', () => {
  const mockBotId = 'bot-123';
  const mockBotName = 'TestBot';
  const mockOnClose = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders deterministic loading and success states', async () => {
    // Mock the API response
    (apiService.get as any).mockResolvedValueOnce({
      success: true,
      data: { insights: 'These are the insights.' },
    });

    let renderResult;
    await act(async () => {
      renderResult = render(
        <InsightsModal botId={mockBotId} botName={mockBotName} isOpen={true} onClose={mockOnClose} />
      );
    });

    // Check if the insights eventually render
    await waitFor(() => {
      expect(screen.getByText('These are the insights.')).toBeInTheDocument();
    });
  });

  it('renders deterministic error state', async () => {
    // Mock the API response to fail
    (apiService.get as any).mockRejectedValueOnce(new Error('Insights fetch failed'));

    let renderResult;
    await act(async () => {
      renderResult = render(
        <InsightsModal botId={mockBotId} botName={mockBotName} isOpen={true} onClose={mockOnClose} />
      );
    });

    // Check if the error renders
    await waitFor(() => {
      expect(screen.getByText('Insights fetch failed')).toBeInTheDocument();
    });
  });
});
