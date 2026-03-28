import React from 'react';
import { useDefaultShortcuts } from '../hooks/useKeyboardShortcuts';
import CommandPalette from './CommandPalette';
import KeyboardShortcutsHelp from './KeyboardShortcutsHelp';

/**
 * Drop this component anywhere inside a <BrowserRouter> to activate global
 * keyboard shortcuts, the command palette (Ctrl+K), and the shortcuts help
 * overlay (Shift+?).
 *
 * It renders no visible children of its own aside from the overlays.
 */
const KeyboardShortcutsProvider: React.FC = () => {
  const {
    shortcuts,
    isCommandPaletteOpen,
    setCommandPaletteOpen,
    isShortcutsHelpOpen,
    setShortcutsHelpOpen,
  } = useDefaultShortcuts();

  return (
    <>
      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setCommandPaletteOpen(false)}
      />
      <KeyboardShortcutsHelp
        isOpen={isShortcutsHelpOpen}
        onClose={() => setShortcutsHelpOpen(false)}
        shortcuts={shortcuts}
      />
    </>
  );
};

export default KeyboardShortcutsProvider;
