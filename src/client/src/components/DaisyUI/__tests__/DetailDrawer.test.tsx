import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { vi } from 'vitest';
import DetailDrawer from '../DetailDrawer';
import '@testing-library/jest-dom';

describe('DetailDrawer overflow resilience', () => {
  let originalOverflow: string;

  beforeEach(() => {
    originalOverflow = document.body.style.overflow;
  });

  afterEach(() => {
    document.body.style.overflow = originalOverflow;
    vi.clearAllMocks();
  });

  it('stores and restores existing overflow state', () => {
    // Set a pre-existing overflow state that is not ''
    document.body.style.overflow = 'auto';

    const { rerender } = render(
      <DetailDrawer isOpen={false} onClose={vi.fn()} title="Test Drawer">
        Content
      </DetailDrawer>
    );

    // Opening it should set overflow to hidden
    rerender(
      <DetailDrawer isOpen={true} onClose={vi.fn()} title="Test Drawer">
        Content
      </DetailDrawer>
    );
    expect(document.body.style.overflow).toBe('hidden');

    // Closing it should restore the original 'auto' state, not ''
    rerender(
      <DetailDrawer isOpen={false} onClose={vi.fn()} title="Test Drawer">
        Content
      </DetailDrawer>
    );
    expect(document.body.style.overflow).toBe('auto');
  });
});
