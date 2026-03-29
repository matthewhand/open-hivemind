/**
 * Utilities for working with keyboard shortcuts
 */

import type { Shortcut } from '../hooks/useKeyboardShortcuts';

/**
 * Detects if the user is on a Mac/iOS device
 */
export const isMac = (): boolean => {
  return typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
};

/**
 * Returns the platform-appropriate modifier key name
 * @param modifier - The modifier key ('ctrl', 'alt', 'shift', 'meta')
 */
export const getModifierKeyName = (modifier: string): string => {
  const modifierMap: Record<string, { mac: string; other: string }> = {
    ctrl: { mac: 'Cmd', other: 'Ctrl' },
    ctrlKey: { mac: 'Cmd', other: 'Ctrl' },
    meta: { mac: 'Cmd', other: 'Win' },
    metaKey: { mac: 'Cmd', other: 'Win' },
    alt: { mac: 'Opt', other: 'Alt' },
    altKey: { mac: 'Opt', other: 'Alt' },
    shift: { mac: 'Shift', other: 'Shift' },
    shiftKey: { mac: 'Shift', other: 'Shift' },
  };

  const key = modifier.toLowerCase();
  const mapping = modifierMap[key];

  if (!mapping) return modifier;

  return isMac() ? mapping.mac : mapping.other;
};

/**
 * Formats a shortcut object into an array of key names for display
 * @param shortcut - The shortcut configuration
 * @returns Array of key names (e.g., ['Ctrl', 'Shift', 'S'])
 */
export const formatShortcutKeys = (shortcut: Shortcut): string[] => {
  const keys: string[] = [];

  if (shortcut.ctrlKey) {
    keys.push(getModifierKeyName('ctrl'));
  }
  if (shortcut.shiftKey) {
    keys.push('Shift');
  }
  if (shortcut.altKey) {
    keys.push(getModifierKeyName('alt'));
  }

  // Map special key names to display labels
  const keyLabels: Record<string, string> = {
    escape: 'Esc',
    arrowup: '↑',
    arrowdown: '↓',
    arrowleft: '←',
    arrowright: '→',
    ' ': 'Space',
    enter: 'Enter',
    tab: 'Tab',
    backspace: 'Backspace',
    delete: 'Del',
  };

  const displayKey = keyLabels[shortcut.key.toLowerCase()] ?? shortcut.key.toUpperCase();
  keys.push(displayKey);

  return keys;
};

/**
 * Formats a shortcut into a human-readable string (e.g., "Ctrl+Shift+S")
 * @param shortcut - The shortcut configuration
 * @param separator - The separator between keys (default: '+')
 */
export const formatShortcutString = (shortcut: Shortcut, separator: string = '+'): string => {
  return formatShortcutKeys(shortcut).join(separator);
};

/**
 * Checks if a keyboard event matches a shortcut configuration
 * @param event - The keyboard event
 * @param shortcut - The shortcut configuration
 */
export const matchesShortcut = (event: KeyboardEvent, shortcut: Shortcut): boolean => {
  const pressedKey = event.key.toLowerCase();
  const keyMatch = shortcut.key.toLowerCase() === pressedKey;

  const ctrlMatch = shortcut.ctrlKey
    ? event.ctrlKey || event.metaKey
    : !event.ctrlKey && !event.metaKey;

  const shiftMatch = shortcut.shiftKey ? event.shiftKey : !event.shiftKey;
  const altMatch = shortcut.altKey ? event.altKey : !event.altKey;

  return keyMatch && ctrlMatch && shiftMatch && altMatch;
};

/**
 * Checks if the target element is an input-like element where shortcuts should be disabled
 * @param target - The event target element
 */
export const isInputElement = (target: EventTarget | null): boolean => {
  if (!(target instanceof HTMLElement)) return false;

  return (
    target.tagName === 'INPUT' ||
    target.tagName === 'TEXTAREA' ||
    target.tagName === 'SELECT' ||
    target.contentEditable === 'true'
  );
};

/**
 * Creates a unique ID for a shortcut based on its configuration
 * @param shortcut - The shortcut configuration
 */
export const getShortcutId = (shortcut: Shortcut): string => {
  const parts = [];
  if (shortcut.ctrlKey) parts.push('ctrl');
  if (shortcut.shiftKey) parts.push('shift');
  if (shortcut.altKey) parts.push('alt');
  parts.push(shortcut.key.toLowerCase());
  return parts.join('+');
};

/**
 * Keyboard shortcut symbols for Mac
 */
export const MAC_SYMBOLS = {
  cmd: '⌘',
  ctrl: '⌃',
  shift: '⇧',
  alt: '⌥',
  opt: '⌥',
  enter: '↵',
  backspace: '⌫',
  delete: '⌦',
  escape: '⎋',
  tab: '⇥',
  up: '↑',
  down: '↓',
  left: '←',
  right: '→',
} as const;

/**
 * Formats a shortcut using Mac symbols (e.g., "⌘⇧S")
 * @param shortcut - The shortcut configuration
 */
export const formatShortcutWithSymbols = (shortcut: Shortcut): string => {
  if (!isMac()) {
    return formatShortcutString(shortcut);
  }

  const symbols: string[] = [];

  if (shortcut.ctrlKey) {
    symbols.push(MAC_SYMBOLS.cmd);
  }
  if (shortcut.shiftKey) {
    symbols.push(MAC_SYMBOLS.shift);
  }
  if (shortcut.altKey) {
    symbols.push(MAC_SYMBOLS.alt);
  }

  const key = shortcut.key.toLowerCase();
  const symbol = MAC_SYMBOLS[key as keyof typeof MAC_SYMBOLS];
  symbols.push(symbol || shortcut.key.toUpperCase());

  return symbols.join('');
};
