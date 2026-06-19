import React from 'react';
import { render, screen } from '@testing-library/react';
import DashboardBotCard from '../DashboardBotCard';
import '@testing-library/jest-dom';

import { vi } from 'vitest';

describe('DashboardBotCard A11y', () => {
  const mockBot = {
    id: 'bot-123',
    name: 'Test Bot',
    persona: 'friendly-persona',
    messageProvider: 'discord',
    llmProvider: 'openai',
  };

  const mockBotStatusData = {
    botId: 'bot-123',
    status: 'online',
    errorCount: 0,
    lastSeen: Date.now(),
  };

  const mockGetProviderIcon = vi.fn(() => 'mock-icon');
  const mockGetStatusColor = vi.fn(() => 'success');
  const mockOnRatingChange = vi.fn();

  it('renders Action buttons with focus visibility classes', () => {
    render(
      <DashboardBotCard
        bot={mockBot as unknown as any}
        botStatusData={mockBotStatusData}
        rating={0}
        onRatingChange={mockOnRatingChange}
        getProviderIcon={mockGetProviderIcon}
        getStatusColor={mockGetStatusColor}
      />
    );

    const runBenchmarkBtn = screen.getByLabelText('Run performance benchmark for Test Bot');
    expect(runBenchmarkBtn).toHaveClass('focus-visible:opacity-100');
    expect(runBenchmarkBtn).toHaveClass('focus-within:opacity-100');

    const viewHistoryBtn = screen.getByLabelText('View version history for Test Bot');
    expect(viewHistoryBtn).toHaveClass('focus-visible:opacity-100');
    expect(viewHistoryBtn).toHaveClass('focus-within:opacity-100');

    const insightsBtn = screen.getByLabelText('View AI performance insights for Test Bot');
    expect(insightsBtn).toHaveClass('focus-visible:opacity-100');
    expect(insightsBtn).toHaveClass('focus-within:opacity-100');

    const diagnosticBtn = screen.getByLabelText('Run diagnostic for Test Bot');
    expect(diagnosticBtn).toHaveClass('focus-visible:opacity-100');
    expect(diagnosticBtn).toHaveClass('focus-within:opacity-100');
  });
});
