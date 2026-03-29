import React from 'react';
import Tooltip from './DaisyUI/Tooltip';
import Kbd from './DaisyUI/Kbd';
import type { Shortcut } from '../hooks/useKeyboardShortcuts';
import { formatShortcutKeys, isMac } from '../utils/keyboardShortcutUtils';

interface KeyboardShortcutIndicatorProps {
  /** The keyboard shortcut keys (e.g., ['Ctrl', 'N'] or ['?']) */
  keys?: string[];
  /** Alternative: provide a Shortcut object */
  shortcut?: Shortcut;
  /** The tooltip description */
  description: string;
  /** The button or element to wrap */
  children: React.ReactElement;
  /** Tooltip position */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Additional className for the tooltip */
  className?: string;
  /** Show only shortcut without description in tooltip */
  shortcutOnly?: boolean;
}

/**
 * Wraps a button or element with a tooltip showing its keyboard shortcut.
 *
 * @example
 * ```tsx
 * // With keys array
 * <KeyboardShortcutIndicator keys={['Ctrl', 'N']} description="Create new bot">
 *   <button>New Bot</button>
 * </KeyboardShortcutIndicator>
 *
 * // With shortcut object
 * <KeyboardShortcutIndicator shortcut={myShortcut} description="Save">
 *   <button>Save</button>
 * </KeyboardShortcutIndicator>
 * ```
 */
const KeyboardShortcutIndicator: React.FC<KeyboardShortcutIndicatorProps> = ({
  keys,
  shortcut,
  description,
  children,
  position = 'top',
  className = '',
  shortcutOnly = false,
}) => {
  // Determine keys to display
  const displayKeys = shortcut ? formatShortcutKeys(shortcut) : keys || [];

  // Normalize keys for Mac users
  const normalizedKeys = displayKeys.map(key => {
    if (isMac() && key.toLowerCase() === 'ctrl') {
      return 'Cmd';
    }
    if (isMac() && key.toLowerCase() === 'alt') {
      return 'Opt';
    }
    return key;
  });

  // Build tooltip content with keyboard shortcut
  const tooltipContent = shortcutOnly ? (
    <span className="flex items-center gap-0.5">
      {normalizedKeys.map((key, i) => (
        <React.Fragment key={i}>
          {i > 0 && <span className="text-xs opacity-70">+</span>}
          <Kbd size="xs">{key}</Kbd>
        </React.Fragment>
      ))}
    </span>
  ) : (
    <span className="flex items-center gap-2">
      <span>{description}</span>
      {normalizedKeys.length > 0 && (
        <span className="flex items-center gap-0.5">
          {normalizedKeys.map((key, i) => (
            <React.Fragment key={i}>
              {i > 0 && <span className="text-xs opacity-70">+</span>}
              <Kbd size="xs">{key}</Kbd>
            </React.Fragment>
          ))}
        </span>
      )}
    </span>
  );

  return (
    <Tooltip
      content={tooltipContent}
      position={position}
      className={className}
    >
      {children}
    </Tooltip>
  );
};

export default KeyboardShortcutIndicator;
