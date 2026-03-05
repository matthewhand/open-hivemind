import { useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

interface Shortcut {
  key: string;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  altKey?: boolean;
  action: () => void;
  description: string;
}

export const useKeyboardShortcuts = (shortcuts: Shortcut[]) => {

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    // Don't trigger shortcuts when user is typing in input fields
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.contentEditable === 'true'
    ) {
      return;
    }

    const pressedKey = event.key.toLowerCase();
    
    for (const shortcut of shortcuts) {
      const keyMatch = shortcut.key.toLowerCase() === pressedKey;
      const ctrlMatch = shortcut.ctrlKey ? event.ctrlKey || event.metaKey : !event.ctrlKey && !event.metaKey;
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

export const useDefaultShortcuts = () => {
  const navigate = useNavigate();

  const shortcuts: Shortcut[] = [
    {
      key: 'n',
      ctrlKey: true,
      action: () => navigate('/admin/bots/create'),
      description: 'Create new bot',
    },
    {
      key: '/',
      action: () => {
        // Focus search input if available
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="search" i]') as HTMLInputElement;
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
    {
      key: 'Escape',
      action: () => {
        // Close any open modals or drawers
        const activeElement = document.activeElement as HTMLElement;
        if (activeElement && activeElement.blur) {
          activeElement.blur();
        }
        
        // Trigger close for any drawer or modal
        const closeButtons = document.querySelectorAll('[aria-label*="close" i], .drawer-toggle:checked');
        closeButtons.forEach(button => {
          if (button instanceof HTMLInputElement) {
            button.checked = false;
          } else if (button instanceof HTMLElement) {
            button.click();
          }
        });
      },
      description: 'Close modal/drawer',
    },
  ];

  useKeyboardShortcuts(shortcuts);
  return shortcuts;
};