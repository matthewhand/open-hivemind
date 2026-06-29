import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Bot, StatusResponse } from '../../services/api';

// uiStore is consumed transitively by the DaisyUI Card component. Provide a
// selector-friendly mock so Card can read its UI preferences.
vi.mock('../../store/uiStore', () => ({
  useUIStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      showDescriptions: true,
      disable3dEffects: false,
      compactDensity: false,
      cardBorderRadius: true,
    }),
}));

// Replace the heavy DiagnosticModal (which fires a real API call on open) with a
// lightweight stub that simply reflects its `isOpen` prop. This lets us assert
// purely on the open/closed wiring driven by the "Details" button.
vi.mock('../BotManagement/DiagnosticModal', () => ({
  default: ({ isOpen, botName }: { isOpen: boolean; botName: string }) =>
    isOpen ? <div data-testid="diagnostic-modal">Diagnostic open for {botName}</div> : null,
}));

// The other action modals are also rendered unconditionally; stub them too so
// the test stays focused on the Details button behaviour.
vi.mock('../BotManagement/InsightsModal', () => ({ default: () => null }));
vi.mock('../BotManagement/VersionHistoryModal', () => ({ default: () => null }));
vi.mock('../BotManagement/BenchmarkModal', () => ({ default: () => null }));

import DashboardBotCard from '../DashboardBotCard';

const makeBot = (overrides: Partial<Bot> = {}): Bot => ({
  id: 'bot-1',
  name: 'Test Bot',
  messageProvider: 'discord',
  llmProvider: 'openai',
  ...overrides,
} as Bot);

const makeStatus = (
  overrides: Partial<StatusResponse['bots'][0]> = {},
): StatusResponse['bots'][0] => ({
  name: 'Test Bot',
  provider: 'discord',
  llmProvider: 'openai',
  status: 'active',
  ...overrides,
});

const renderCard = (botOverrides: Partial<Bot> = {}) =>
  render(
    <DashboardBotCard
      bot={makeBot(botOverrides)}
      botStatusData={makeStatus()}
      rating={0}
      onRatingChange={vi.fn()}
      getProviderIcon={() => '🤖'}
      getStatusColor={() => 'success'}
    />,
  );

describe('DashboardBotCard - Details button', () => {
  it('does not show the diagnostic modal before the Details button is clicked', () => {
    renderCard();
    expect(screen.queryByTestId('diagnostic-modal')).not.toBeInTheDocument();
  });

  it('opens the DiagnosticModal when the Details button is clicked', () => {
    renderCard();

    const detailsBtn = screen.getByRole('button', { name: 'View details for Test Bot' });
    fireEvent.click(detailsBtn);

    const modal = screen.getByTestId('diagnostic-modal');
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveTextContent('Diagnostic open for Test Bot');
  });
});

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
    expect(runBenchmarkBtn).toHaveClass('group-focus-within:opacity-100');

    const viewHistoryBtn = screen.getByLabelText('View version history for Test Bot');
    expect(viewHistoryBtn).toHaveClass('focus-visible:opacity-100');
    expect(viewHistoryBtn).toHaveClass('group-focus-within:opacity-100');

    const insightsBtn = screen.getByLabelText('View AI performance insights for Test Bot');
    expect(insightsBtn).toHaveClass('focus-visible:opacity-100');
    expect(insightsBtn).toHaveClass('group-focus-within:opacity-100');

    const diagnosticBtn = screen.getByLabelText('Run diagnostic for Test Bot');
    expect(diagnosticBtn).toHaveClass('focus-visible:opacity-100');
    expect(diagnosticBtn).toHaveClass('group-focus-within:opacity-100');
  });
});
