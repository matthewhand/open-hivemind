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

describe('BotConfigCard - keyboard accessibility', () => {
  it('exposes the card as a keyboard-focusable button labelled with the bot name', () => {
    const onPreview = vi.fn();
    const { container } = render(
      <BotConfigCard bot={makeBot({ name: 'Keyboard Bot' })} onPreview={onPreview} />
    );

    const card = container.firstElementChild as HTMLElement;
    expect(card).toHaveAttribute('role', 'button');
    expect(card).toHaveAttribute('tabindex', '0');
    expect(card).toHaveAttribute('aria-label', 'Keyboard Bot');

    // The card itself is reachable via its accessible role + name.
    expect(screen.getByRole('button', { name: 'Keyboard Bot' })).toBe(card);
  });

  it('triggers onPreview when Enter is pressed on the card', () => {
    const onPreview = vi.fn();
    const bot = makeBot();
    const { container } = render(<BotConfigCard bot={bot} onPreview={onPreview} />);

    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: 'Enter' });

    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onPreview).toHaveBeenCalledWith(bot);
  });

  it('triggers onPreview when Space is pressed on the card', () => {
    const onPreview = vi.fn();
    const bot = makeBot();
    const { container } = render(<BotConfigCard bot={bot} onPreview={onPreview} />);

    fireEvent.keyDown(container.firstElementChild as HTMLElement, { key: ' ' });

    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onPreview).toHaveBeenCalledWith(bot);
  });

  it('does not treat the card as a button when onPreview is omitted', () => {
    const { container } = render(<BotConfigCard bot={makeBot({ name: 'Static Bot' })} />);

    const card = container.firstElementChild as HTMLElement;
    expect(card).not.toHaveAttribute('role', 'button');
    expect(card).not.toHaveAttribute('tabindex');
    expect(screen.queryByRole('button', { name: 'Static Bot' })).not.toBeInTheDocument();
  });
});
