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
