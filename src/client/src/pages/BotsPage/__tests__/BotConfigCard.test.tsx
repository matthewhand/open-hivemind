import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import BotConfigCard from '../BotConfigCard';
import type { BotConfig } from '../../../types/bot';

vi.mock('../../../store/uiStore', () => ({
  useUIStore: (selector: (s: { showDescriptions: boolean }) => unknown) =>
    selector({ showDescriptions: true }),
}));

const makeBot = (overrides: Partial<BotConfig> = {}): BotConfig => ({
  id: 'bot-1',
  name: 'Test Bot',
  messageProvider: 'discord',
  llmProvider: 'openai',
  status: 'active',
  ...overrides,
} as BotConfig);

describe('BotConfigCard', () => {
  it('renders an active bot without muting', () => {
    const { container } = render(<BotConfigCard bot={makeBot()} />);

    expect(screen.getByText('Running')).toBeInTheDocument();
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).not.toContain('opacity-60');
    expect(card.className).not.toContain('saturate-50');
  });

  it('mutes the whole card when the bot is disabled, keeping the chip', () => {
    const { container } = render(<BotConfigCard bot={makeBot({ status: 'disabled' })} />);

    // Status chip is kept
    expect(screen.getByText('Disabled')).toBeInTheDocument();

    // Card body is visually muted and desaturated
    const card = container.firstElementChild as HTMLElement;
    expect(card.className).toContain('opacity-60');
    expect(card.className).toContain('saturate-50');
  });

  it('uses a non-primary Configure button for disabled bots', () => {
    render(<BotConfigCard bot={makeBot({ status: 'disabled' })} />);

    const configureBtn = screen.getByRole('button', { name: /Configure/i });
    expect(configureBtn.className).toContain('btn-ghost');
    expect(configureBtn.className).not.toContain('btn-primary');
  });

  it('keeps the muted card clickable', () => {
    const onPreview = vi.fn();
    const onEdit = vi.fn();
    const { container } = render(
      <BotConfigCard bot={makeBot({ status: 'disabled' })} onPreview={onPreview} onEdit={onEdit} />
    );

    fireEvent.click(container.firstElementChild as HTMLElement);
    expect(onPreview).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Configure/i }));
    expect(onEdit).toHaveBeenCalledTimes(1);
  });
});
