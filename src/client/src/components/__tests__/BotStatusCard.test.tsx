import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import type { Bot } from '../../services/api';

// uiStore is consumed transitively by the DaisyUI Card component.
vi.mock('../../store/uiStore', () => ({
  useUIStore: (selector: (s: Record<string, unknown>) => unknown) =>
    selector({
      showDescriptions: true,
      disable3dEffects: false,
      compactDensity: false,
      cardBorderRadius: true,
    }),
}));

import BotStatusCard from '../BotStatusCard';

const makeBot = (overrides: Partial<Bot> = {}): Bot => ({
  id: 'bot-1',
  name: 'Test Bot',
  messageProvider: 'discord',
  llmProvider: 'openai',
  ...overrides,
} as Bot);

describe('BotStatusCard - Refresh button', () => {
  it('invokes onRefresh exactly once when the Refresh button is clicked', async () => {
    const onRefresh = vi.fn().mockResolvedValue(undefined);

    render(<BotStatusCard bot={makeBot()} onRefresh={onRefresh} />);

    const refreshBtn = screen.getByRole('button', { name: 'Refresh status for Test Bot' });
    expect(refreshBtn).toBeEnabled();

    fireEvent.click(refreshBtn);

    // Called synchronously on click (not deferred behind a setTimeout). The
    // async tick is only the state reset in the `finally`, so awaiting is enough.
    await waitFor(() => expect(onRefresh).toHaveBeenCalledTimes(1));

    // After the refresh resolves, the loading state clears and the button is
    // re-enabled.
    await waitFor(() => expect(refreshBtn).toBeEnabled());
  });

  it('disables the Refresh button when no onRefresh handler is provided', () => {
    render(<BotStatusCard bot={makeBot()} />);

    const refreshBtn = screen.getByRole('button', { name: 'Refresh status for Test Bot' });
    expect(refreshBtn).toBeDisabled();
  });
});
