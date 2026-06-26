import React from 'react';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, afterEach } from 'vitest';
import CommandPalette from '../CommandPalette';

HTMLElement.prototype.scrollIntoView = vi.fn();

describe('CommandPalette scroll lock', () => {
  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('preserves initial overflow state after unmount', () => {
    document.body.style.overflow = 'visible';

    const { unmount } = render(
      <MemoryRouter>
        <CommandPalette isOpen={true} onClose={vi.fn()} />
      </MemoryRouter>
    );

    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.overflow).toBe('visible');
  });
});
