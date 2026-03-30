import { renderHook, act } from '@testing-library/react';
import { fireEvent } from '@testing-library/dom';
import { useKeyboardShortcuts } from '../useKeyboardShortcuts';

describe('useKeyboardShortcuts', () => {
  afterEach(() => {
    // Clean up any elements added to the body
    document.body.innerHTML = '';
    jest.restoreAllMocks();
  });

  it('should trigger action when correct key is pressed', () => {
    const action = jest.fn();
    const shortcuts = [{ key: 'a', action, description: 'Test shortcut' }];
    renderHook(() => useKeyboardShortcuts(shortcuts));

    act(() => {
      fireEvent.keyDown(document, { key: 'a' });
    });

    expect(action).toHaveBeenCalled();
  });

  it('should not trigger action when incorrect key is pressed', () => {
    const action = jest.fn();
    const shortcuts = [{ key: 'a', action, description: 'Test shortcut' }];
    renderHook(() => useKeyboardShortcuts(shortcuts));

    act(() => {
      fireEvent.keyDown(document, { key: 'b' });
    });

    expect(action).not.toHaveBeenCalled();
  });

  it('should trigger action with modifier keys', () => {
    const action = jest.fn();
    const shortcuts = [{ key: 's', ctrlKey: true, action, description: 'Save' }];
    renderHook(() => useKeyboardShortcuts(shortcuts));

    act(() => {
      fireEvent.keyDown(document, { key: 's', ctrlKey: true });
    });

    expect(action).toHaveBeenCalled();
  });

  it('should not trigger action if modifier key is missing', () => {
    const action = jest.fn();
    const shortcuts = [{ key: 's', ctrlKey: true, action, description: 'Save' }];
    renderHook(() => useKeyboardShortcuts(shortcuts));

    act(() => {
      fireEvent.keyDown(document, { key: 's' });
    });

    expect(action).not.toHaveBeenCalled();
  });

  it('should trigger action with multiple modifier keys', () => {
    const action = jest.fn();
    const shortcuts = [{ key: 'p', ctrlKey: true, shiftKey: true, action, description: 'Print' }];
    renderHook(() => useKeyboardShortcuts(shortcuts));

    act(() => {
      fireEvent.keyDown(document, { key: 'p', ctrlKey: true, shiftKey: true });
    });

    expect(action).toHaveBeenCalled();
  });

  it('should ignore shortcuts when typing in input fields', () => {
    const action = jest.fn();
    const shortcuts = [{ key: 'a', action, description: 'Test shortcut' }];
    renderHook(() => useKeyboardShortcuts(shortcuts));

    const input = document.createElement('input');
    document.body.appendChild(input);
    input.focus();

    act(() => {
      fireEvent.keyDown(input, { key: 'a', bubbles: true });
    });

    expect(action).not.toHaveBeenCalled();
  });

  it('should ignore shortcuts when typing in textarea', () => {
    const action = jest.fn();
    const shortcuts = [{ key: 'a', action, description: 'Test shortcut' }];
    renderHook(() => useKeyboardShortcuts(shortcuts));

    const textarea = document.createElement('textarea');
    document.body.appendChild(textarea);
    textarea.focus();

    act(() => {
      fireEvent.keyDown(textarea, { key: 'a', bubbles: true });
    });

    expect(action).not.toHaveBeenCalled();
  });

  it('should ignore shortcuts when contentEditable is true', () => {
    const action = jest.fn();
    const shortcuts = [{ key: 'a', action, description: 'Test shortcut' }];
    renderHook(() => useKeyboardShortcuts(shortcuts));

    const div = document.createElement('div');
    div.contentEditable = 'true';
    document.body.appendChild(div);
    div.focus();

    act(() => {
      fireEvent.keyDown(div, { key: 'a', bubbles: true });
    });

    expect(action).not.toHaveBeenCalled();
  });

  it('should call preventDefault and stopPropagation', () => {
    const action = jest.fn();
    const shortcuts = [{ key: 'a', action, description: 'Test shortcut' }];
    renderHook(() => useKeyboardShortcuts(shortcuts));

    const preventDefault = jest.fn();
    const stopPropagation = jest.fn();

    // Use a custom event to spy on preventDefault/stopPropagation
    const event = new KeyboardEvent('keydown', { key: 'a', bubbles: true });
    Object.defineProperty(event, 'preventDefault', { value: preventDefault });
    Object.defineProperty(event, 'stopPropagation', { value: stopPropagation });

    act(() => {
      document.dispatchEvent(event);
    });

    expect(action).toHaveBeenCalled();
    expect(preventDefault).toHaveBeenCalled();
    expect(stopPropagation).toHaveBeenCalled();
  });

  it('should cleanup event listener on unmount', () => {
    const action = jest.fn();
    const shortcuts = [{ key: 'a', action, description: 'Test shortcut' }];
    const { unmount } = renderHook(() => useKeyboardShortcuts(shortcuts));

    unmount();

    act(() => {
      fireEvent.keyDown(document, { key: 'a' });
    });

    expect(action).not.toHaveBeenCalled();
  });
});
