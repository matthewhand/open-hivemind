import { describe, expect, it, vi, beforeEach } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import MessageVolumeChart from '../MessageVolumeChart';
import LLMUsageChart from '../LLMUsageChart';
import { useMetrics } from '../../../hooks/useMetrics';

vi.mock('../../../hooks/useMetrics', () => ({
  useMetrics: vi.fn(),
}));

const mockUseMetrics = vi.mocked(useMetrics);

describe('chart empty states', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('MessageVolumeChart shows an empty state when no messages are recorded', () => {
    mockUseMetrics.mockReturnValue({
      metrics: { messagesProcessed: 0, llmTokenUsage: 0 } as any,
      loading: false,
      error: null,
    });

    render(<MessageVolumeChart />);

    expect(screen.getByText('Message Volume')).toBeInTheDocument();
    expect(
      screen.getByText(/No messages recorded yet — volume appears once bots start chatting\./)
    ).toBeInTheDocument();
  });

  it('MessageVolumeChart renders the chart once volume exists', () => {
    mockUseMetrics.mockReturnValue({
      metrics: { messagesProcessed: 42, llmTokenUsage: 0 } as any,
      loading: false,
      error: null,
    });

    render(<MessageVolumeChart />);

    expect(screen.queryByText(/No messages recorded yet/)).not.toBeInTheDocument();
  });

  it('LLMUsageChart shows an empty state when no tokens are recorded', () => {
    mockUseMetrics.mockReturnValue({
      metrics: { messagesProcessed: 0, llmTokenUsage: 0 } as any,
      loading: false,
      error: null,
    });

    render(<LLMUsageChart />);

    expect(screen.getByText('LLM Token Usage')).toBeInTheDocument();
    expect(
      screen.getByText(/No token usage recorded yet — usage appears once bots start calling their LLM providers\./)
    ).toBeInTheDocument();
  });

  it('LLMUsageChart renders the chart once usage exists', () => {
    mockUseMetrics.mockReturnValue({
      metrics: { messagesProcessed: 0, llmTokenUsage: 1234 } as any,
      loading: false,
      error: null,
    });

    render(<LLMUsageChart />);

    expect(screen.queryByText(/No token usage recorded yet/)).not.toBeInTheDocument();
  });
});
