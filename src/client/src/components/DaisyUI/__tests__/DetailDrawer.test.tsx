import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import DetailDrawer from '../DetailDrawer';

describe('DetailDrawer scroll lock', () => {
  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('preserves initial overflow state after unmount', () => {
    document.body.style.overflow = 'scroll';

    const { unmount } = render(
      <DetailDrawer isOpen={true} onClose={vi.fn()} title="Test" />
    );

    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.overflow).toBe('scroll');
  });
});
