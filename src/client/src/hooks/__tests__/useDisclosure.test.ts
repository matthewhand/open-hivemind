// Vitest provides describe, it, expect, vi as globals
import { renderHook, act } from '@testing-library/react';
import { vi } from 'vitest';
import type { KeyboardEvent } from 'react';
import { useDisclosure } from '../useDisclosure';

/** Build a minimal synthetic keyboard event that records preventDefault calls. */
function makeKeyEvent(key: string) {
  const preventDefault = vi.fn();
  return { event: { key, preventDefault } as unknown as KeyboardEvent, preventDefault };
}

describe('useDisclosure', () => {
  it('defaults to closed and exposes accessible trigger props', () => {
    const { result } = renderHook(() => useDisclosure());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.triggerProps.role).toBe('button');
    expect(result.current.triggerProps.tabIndex).toBe(0);
    expect(result.current.triggerProps['aria-expanded']).toBe(false);
  });

  it('honors defaultOpen', () => {
    const { result } = renderHook(() => useDisclosure({ defaultOpen: true }));

    expect(result.current.isOpen).toBe(true);
    expect(result.current.triggerProps['aria-expanded']).toBe(true);
  });

  it('wires aria-controls to the content id', () => {
    const { result } = renderHook(() => useDisclosure({ id: 'panel-1' }));

    expect(result.current.triggerProps['aria-controls']).toBe('panel-1');
    expect(result.current.contentProps.id).toBe('panel-1');
  });

  it('generates a unique content id when none is supplied', () => {
    const { result } = renderHook(() => useDisclosure());

    expect(result.current.contentProps.id).toMatch(/^disclosure-/);
    expect(result.current.triggerProps['aria-controls']).toBe(result.current.contentProps.id);
  });

  it('toggles, opens, and closes via imperative methods', () => {
    const { result } = renderHook(() => useDisclosure());

    act(() => result.current.toggle());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);

    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);
  });

  it('toggles on click', () => {
    const { result } = renderHook(() => useDisclosure());

    act(() => result.current.triggerProps.onClick());
    expect(result.current.isOpen).toBe(true);
    expect(result.current.triggerProps['aria-expanded']).toBe(true);
  });

  it.each(['Enter', ' ', 'Spacebar'])(
    'toggles and prevents default on "%s" key',
    (key) => {
      const { result } = renderHook(() => useDisclosure());
      const { event, preventDefault } = makeKeyEvent(key);

      act(() => result.current.triggerProps.onKeyDown(event));

      expect(preventDefault).toHaveBeenCalledTimes(1);
      expect(result.current.isOpen).toBe(true);
    }
  );

  it('ignores unrelated keys without preventing default', () => {
    const { result } = renderHook(() => useDisclosure());
    const { event, preventDefault } = makeKeyEvent('a');

    act(() => result.current.triggerProps.onKeyDown(event));

    expect(preventDefault).not.toHaveBeenCalled();
    expect(result.current.isOpen).toBe(false);
  });

  it('respects controlled isOpen and reports changes via onOpenChange', () => {
    const onOpenChange = vi.fn();
    const { result, rerender } = renderHook(
      ({ isOpen }) => useDisclosure({ isOpen, onOpenChange }),
      { initialProps: { isOpen: false } }
    );

    expect(result.current.isOpen).toBe(false);

    // In controlled mode the internal state must not change; only the callback fires.
    act(() => result.current.toggle());
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(result.current.isOpen).toBe(false);

    // Parent applies the new value.
    rerender({ isOpen: true });
    expect(result.current.isOpen).toBe(true);
    expect(result.current.triggerProps['aria-expanded']).toBe(true);
  });

  it('still fires onOpenChange in uncontrolled mode', () => {
    const onOpenChange = vi.fn();
    const { result } = renderHook(() => useDisclosure({ onOpenChange }));

    act(() => result.current.open());
    expect(onOpenChange).toHaveBeenCalledWith(true);
    expect(result.current.isOpen).toBe(true);
  });
});
