import React from 'react';
import type { Shortcut } from '../hooks/useKeyboardShortcuts';

interface KeyboardShortcutsHelpProps {
  isOpen: boolean;
  onClose: () => void;
  shortcuts: Shortcut[];
}

/** Render a human-friendly key combo label */
function formatKey(shortcut: Shortcut): string {
  const parts: string[] = [];
  if (shortcut.ctrlKey) {
    // Show platform-appropriate modifier
    const isMac =
      typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.userAgent);
    parts.push(isMac ? 'Cmd' : 'Ctrl');
  }
  if (shortcut.shiftKey) parts.push('Shift');
  if (shortcut.altKey) parts.push('Alt');

  // Map special key names to display labels
  const keyLabels: Record<string, string> = {
    escape: 'Esc',
    arrowup: 'Up',
    arrowdown: 'Down',
    arrowleft: 'Left',
    arrowright: 'Right',
    ' ': 'Space',
  };
  const displayKey = keyLabels[shortcut.key.toLowerCase()] ?? shortcut.key.toUpperCase();
  parts.push(displayKey);
  return parts.join(' + ');
}

const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  isOpen,
  onClose,
  shortcuts,
}) => {
  if (!isOpen) return null;

  // Group shortcuts by category
  const groupedShortcuts = shortcuts.reduce((acc, shortcut) => {
    const category = shortcut.category || 'Other';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(shortcut);
    return acc;
  }, {} as Record<string, Shortcut[]>);

  // Define category order
  const categoryOrder = ['General', 'Navigation', 'Actions', 'Other'];
  const sortedCategories = categoryOrder.filter(cat => groupedShortcuts[cat]);

  // Add any remaining categories not in the order
  Object.keys(groupedShortcuts).forEach(cat => {
    if (!sortedCategories.includes(cat)) {
      sortedCategories.push(cat);
    }
  });

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Dialog */}
      <div
        className="relative w-full max-w-2xl bg-base-100 rounded-xl shadow-2xl border border-base-300 overflow-hidden"
        role="dialog"
        aria-label="Keyboard shortcuts"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-base-300">
          <h2 className="text-lg font-bold">Keyboard Shortcuts</h2>
          <button
            className="btn btn-sm btn-circle btn-ghost"
            onClick={onClose}
            aria-label="Close shortcuts help"
          >
            &#x2715;
          </button>
        </div>

        {/* Shortcut list */}
        <div className="max-h-[60vh] overflow-y-auto py-2">
          {sortedCategories.map(category => (
            <div key={category} className="mb-4">
              <h3 className="text-xs font-semibold text-base-content/70 uppercase tracking-wide px-5 py-2 bg-base-200/50">
                {category}
              </h3>
              <table className="table table-sm w-full">
                <tbody>
                  {groupedShortcuts[category].map((s, idx) => (
                    <tr key={idx} className="hover">
                      <td className="text-base-content/80 py-2 pl-5">{s.description}</td>
                      <td className="text-right py-2 pr-5">
                        {formatKey(s).split(' + ').map((part, i) => (
                          <React.Fragment key={i}>
                            {i > 0 && <span className="text-base-content/40 mx-0.5">+</span>}
                            <kbd className="kbd kbd-sm">{part}</kbd>
                          </React.Fragment>
                        ))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-base-300 text-xs text-base-content/50 text-center">
          Press <kbd className="kbd kbd-xs">Esc</kbd> or <kbd className="kbd kbd-xs">?</kbd> to close
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsHelp;
