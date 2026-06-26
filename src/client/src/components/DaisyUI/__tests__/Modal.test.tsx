import React from 'react';
import { render } from '@testing-library/react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import Modal from '../Modal';

// Mock dialog functions
HTMLDialogElement.prototype.showModal = vi.fn();
HTMLDialogElement.prototype.close = vi.fn();

describe('Modal scroll lock', () => {
  afterEach(() => {
    document.body.style.overflow = '';
    vi.clearAllMocks();
  });

  it('preserves initial overflow state after unmount', () => {
    document.body.style.overflow = 'auto';

    const { unmount } = render(
      <Modal isOpen={true} onClose={vi.fn()} title="Test">Content</Modal>
    );

    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.overflow).toBe('auto');
  });
});
