import { render, screen, fireEvent, act } from '@testing-library/react';
import React from 'react';
import { vi } from 'vitest';
import useFocusTrap from '../useFocusTrap';

const TestComponent: React.FC<{ active: boolean; onClose?: () => void }> = ({ active, onClose }) => {
  const containerRef = useFocusTrap<HTMLDivElement>({ active, onClose });
  return (
    <div ref={containerRef}>
      <button>Button 1</button>
      <button>Button 2</button>
      <input type="text" data-testid="input-field" />
    </div>
  );
};

describe('useFocusTrap', () => {
  beforeAll(() => {
    // Mock offsetParent for Vitest/JSDOM
    Object.defineProperty(HTMLElement.prototype, 'offsetParent', {
      get() { return this.parentNode; },
    });
  });

  it('should focus the first element when active', async () => {
    render(<TestComponent active={true} />);

    // requestAnimationFrame is used in the hook
    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(document.activeElement).toBe(screen.getAllByRole('button')[0]);
  });

  it('should trap focus within the container', async () => {
    render(<TestComponent active={true} />);
    const buttons = screen.getAllByRole('button');
    const input = screen.getByTestId('input-field');
    const first = buttons[0];
    const last = input;

    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    first.focus();
    expect(document.activeElement).toBe(first);

    // Tab from last element
    fireEvent.keyDown(last, { key: 'Tab' });
    expect(document.activeElement).toBe(first);

    // Shift+Tab from first element
    fireEvent.keyDown(first, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });

  it('should call onClose when Escape is pressed', () => {
    const onClose = vi.fn();
    render(<TestComponent active={true} onClose={onClose} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('should restore focus when deactivated', async () => {
    const trigger = document.createElement('button');
    document.body.appendChild(trigger);
    trigger.focus();
    const previousActive = document.activeElement;

    const { rerender } = render(<TestComponent active={true} />);

    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    rerender(<TestComponent active={false} />);
    expect(document.activeElement).toBe(previousActive);

    document.body.removeChild(trigger);
  });
});
