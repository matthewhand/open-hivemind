import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MobileFAB from '../MobileFAB';

describe('MobileFAB', () => {
  it('applies .fab-mobile and .fab-mobile-left when position="left"', () => {
    render(
      <MobileFAB position="left" icon={<span>i</span>} onClick={() => {}} ariaLabel="left-fab" />
    );
    const btn = screen.getByRole('button', { name: 'left-fab' });
    expect(btn).toHaveClass('fab-mobile');
    expect(btn).toHaveClass('fab-mobile-left');
  });

  it('applies .fab-mobile-right when position="right"', () => {
    render(
      <MobileFAB position="right" icon={<span>i</span>} onClick={() => {}} ariaLabel="right-fab" />
    );
    expect(screen.getByRole('button', { name: 'right-fab' })).toHaveClass('fab-mobile-right');
  });

  it('renders the passed icon ReactNode when loading is false', () => {
    render(
      <MobileFAB
        position="left"
        icon={<span data-testid="custom-icon">CUSTOM</span>}
        onClick={() => {}}
        ariaLabel="fab"
      />
    );
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    expect(screen.getByText('CUSTOM')).toBeInTheDocument();
  });

  it('overlays an animate-spin spinner while preserving the caller icon when loading is true', () => {
    const { container } = render(
      <MobileFAB
        position="left"
        icon={<span data-testid="custom-icon">CUSTOM</span>}
        onClick={() => {}}
        ariaLabel="fab"
        loading
      />
    );
    // Caller's icon must still be in the DOM so the FAB visually communicates the action.
    expect(screen.getByTestId('custom-icon')).toBeInTheDocument();
    // A spinner is overlaid on top.
    expect(container.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('sets aria-busy="true" on the button while loading', () => {
    render(
      <MobileFAB
        position="left"
        icon={<span>i</span>}
        onClick={() => {}}
        ariaLabel="fab"
        loading
      />
    );
    const btn = screen.getByRole('button', { name: 'fab' });
    expect(btn).toHaveAttribute('aria-busy', 'true');
    expect(btn).toHaveAttribute('aria-disabled', 'true');
  });

  it('sets aria-busy="false" when not loading', () => {
    render(
      <MobileFAB position="left" icon={<span>i</span>} onClick={() => {}} ariaLabel="fab" />
    );
    expect(screen.getByRole('button', { name: 'fab' })).toHaveAttribute('aria-busy', 'false');
  });

  it('calls onClick exactly once when clicked', () => {
    const onClick = vi.fn();
    render(<MobileFAB position="left" icon={<span>i</span>} onClick={onClick} ariaLabel="fab" />);
    fireEvent.click(screen.getByRole('button', { name: 'fab' }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('sets the disabled attribute and does not invoke onClick when disabled', () => {
    const onClick = vi.fn();
    render(
      <MobileFAB position="left" icon={<span>i</span>} onClick={onClick} ariaLabel="fab" disabled />
    );
    const btn = screen.getByRole('button', { name: 'fab' });
    expect(btn).toBeDisabled();
    fireEvent.click(btn);
    expect(onClick).not.toHaveBeenCalled();
  });

  it('exposes aria-label matching the prop value', () => {
    render(
      <MobileFAB position="right" icon={<span>i</span>} onClick={() => {}} ariaLabel="open menu" />
    );
    expect(screen.getByRole('button', { name: 'open menu' })).toHaveAttribute('aria-label', 'open menu');
  });
});
