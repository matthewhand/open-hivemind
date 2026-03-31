import React from 'react';
import { render, screen } from '@testing-library/react';
import KeyboardShortcutsHelp from '../KeyboardShortcutsHelp';
import { describe, it, expect, vi } from 'vitest';
import type { Shortcut } from '../../hooks/useKeyboardShortcuts';

describe('KeyboardShortcutsHelp', () => {
  const mockOnClose = vi.fn();

  const mockShortcuts: Shortcut[] = [
    {
      key: 'k',
      ctrlKey: true,
      description: 'Search',
      callback: vi.fn(),
    },
    {
      key: 'escape',
      description: 'Close',
      callback: vi.fn(),
    },
  ];

  it('renders nothing when not open', () => {
    const { container } = render(
      <KeyboardShortcutsHelp isOpen={false} onClose={mockOnClose} shortcuts={mockShortcuts} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it('renders shortcuts when open', () => {
    render(
      <KeyboardShortcutsHelp isOpen={true} onClose={mockOnClose} shortcuts={mockShortcuts} />
    );

    expect(screen.getByText('Keyboard Shortcuts')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText('Close')).toBeInTheDocument();
  });
});
