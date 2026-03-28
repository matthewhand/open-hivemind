import { useEffect, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
  /** If true, this shortcut fires even when the user is focused on an input/textarea */
  global?: boolean;
}

/**
 * Low-level hook: registers global keydown listeners for a list of shortcuts.
 */
export const useKeyboardShortcuts = (shortcuts: Shortcut[]) => {
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    const target = event.target as HTMLElement;
    const isTyping =
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true';

    const pressedKey = event.key.toLowerCase();

    for (const shortcut of shortcuts) {
      // Skip non-global shortcuts when the user is typing in an input
      if (isTyping && !shortcut.global) {
        continue;
      }

      const keyMatch = shortcut.key.toLowerCase() === pressedKey;
      const ctrlMatch = shortcut.ctrlKey
        ? event.ctrlKey || event.metaKey
        : !event.ctrlKey && !event.metaKey;
      const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
      const altMatch = shortcut.altKey ? event.altKey : !event.altKey;

      if (keyMatch && ctrlMatch && shiftMatch && altMatch) {
        event.preventDefault();
        event.stopPropagation();
        shortcut.action();
        break;
      }
    }
  }, [shortcuts]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);
};

/**
 * High-level hook: wires up all default keyboard shortcuts and manages
 * the open/closed state of the command palette and shortcuts help overlay.
 */
export const useDefaultShortcuts = () => {
  const navigate = useNavigate();
  const [isCommandPaletteOpen, setCommandPaletteOpen] = useState(false);
  const [isShortcutsHelpOpen, setShortcutsHelpOpen] = useState(false);

  const shortcuts: Shortcut[] = [
    {
      key: 'k',
      ctrlKey: true,
      global: true,
      action: () => setCommandPaletteOpen(prev => !prev),
      description: 'Open command palette',
    },
    {
      key: 'Escape',
      global: true,
      action: () => {
        if (isCommandPaletteOpen) {
          setCommandPaletteOpen(false);
          return;
        }
        if (isShortcutsHelpOpen) {
          setShortcutsHelpOpen(false);
          return;
        }
        // Fallback: close any open modals or drawers via DOM
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.blur) {
          activeElement.blur();
        }
        const closeButtons = document.querySelectorAll(
          '[aria-label*="close" i], .drawer-toggle:checked'
        );
        closeButtons.forEach(button => {
          if (button instanceof HTMLInputElement) {
            button.checked = false;
          } else if (button instanceof HTMLElement) {
            button.click();
          }
        });
      },
      description: 'Close modal / overlay',
    },
    {
      key: 'n',
      ctrlKey: true,
      action: () => navigate('/admin/bots/create'),
      description: 'Create new bot',
    },
    {
      key: '?',
      shiftKey: true,
      action: () => setShortcutsHelpOpen(prev => !prev),
      description: 'Show keyboard shortcuts',
    },
    {
      key: '/',
      action: () => {
        const searchInput = document.querySelector(
          'input[type="search"], input[placeholder*="search" i]'
        ) as HTMLInputElement;
        if (searchInput) {
          searchInput.focus();
        }
      },
      description: 'Focus search',
    },
    {
      key: 'g',
      shiftKey: true,
      action: () => navigate('/admin/settings'),
      description: 'Go to settings',
    },
    {
      key: 'h',
      action: () => navigate('/admin/overview'),
      description: 'Go to overview',
    },
    {
      key: 'b',
      action: () => navigate('/admin/bots'),
      description: 'Go to bots',
    },
    {
      key: 'm',
      action: () => navigate('/admin/monitoring'),
      description: 'Go to monitoring',
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return {
    shortcuts,
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    isShortcutsHelpOpen,
    setShortcutsHelpOpen,
  };
};
