import React, { useEffect } from 'react';
import { useDynamicShortcuts } from '../hooks/useKeyboardShortcuts';
import KeyboardShortcutIndicator from './KeyboardShortcutIndicator';
import { useSuccessToast } from './DaisyUI/ToastNotification';

/**
 * Demo component showcasing the keyboard shortcuts system.
 * This demonstrates:
 * - Using the useDynamicShortcuts hook
 * - Registering and unregistering shortcuts dynamically
 * - Adding keyboard shortcut indicators to buttons
 */
const KeyboardShortcutsDemo: React.FC = () => {
  const { registerShortcut, unregisterShortcut } = useDynamicShortcuts();
  const showSuccess = useSuccessToast();

  // Register demo shortcuts when component mounts
  useEffect(() => {
    // Register Ctrl+S shortcut
    registerShortcut('demo-save', {
      key: 's',
      ctrlKey: true,
      action: () => showSuccess('Save shortcut triggered!'),
      description: 'Save (demo)',
      category: 'Demo Actions',
    });

    // Register Ctrl+Shift+D shortcut
    registerShortcut('demo-delete', {
      key: 'd',
      ctrlKey: true,
      shiftKey: true,
      action: () => showSuccess('Delete shortcut triggered!'),
      description: 'Delete (demo)',
      category: 'Demo Actions',
    });

    // Cleanup: unregister when component unmounts
    return () => {
      unregisterShortcut('demo-save');
      unregisterShortcut('demo-delete');
    };
  }, [registerShortcut, unregisterShortcut, showSuccess]);

  const handleSave = () => {
    showSuccess('Save button clicked!');
  };

  const handleDelete = () => {
    showSuccess('Delete button clicked!');
  };

  const handleRefresh = () => {
    showSuccess('Refresh button clicked!');
  };

  return (
    <div className="p-6 space-y-6">
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Keyboard Shortcuts Demo</h2>
          <p className="text-base-content/70">
            This page demonstrates the keyboard shortcuts system. Try pressing the keyboard shortcuts or hover over buttons to see their shortcuts.
          </p>

          <div className="divider">Button Examples</div>

          <div className="flex flex-wrap gap-3">
            {/* Save button with Ctrl+S shortcut */}
            <KeyboardShortcutIndicator keys={['Ctrl', 'S']} description="Save changes">
              <button className="btn btn-primary" onClick={handleSave}>
                Save
              </button>
            </KeyboardShortcutIndicator>

            {/* Delete button with Ctrl+Shift+D shortcut */}
            <KeyboardShortcutIndicator keys={['Ctrl', 'Shift', 'D']} description="Delete item">
              <button className="btn btn-error" onClick={handleDelete}>
                Delete
              </button>
            </KeyboardShortcutIndicator>

            {/* Refresh button without shortcut */}
            <button className="btn btn-secondary" onClick={handleRefresh}>
              Refresh
            </button>
          </div>

          <div className="divider">Global Shortcuts</div>

          <div className="space-y-2">
            <div className="alert alert-info">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" className="stroke-current shrink-0 w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <div>
                <h3 className="font-bold">Available Global Shortcuts</h3>
                <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                  <li><kbd className="kbd kbd-sm">Ctrl</kbd> + <kbd className="kbd kbd-sm">K</kbd> - Open command palette</li>
                  <li><kbd className="kbd kbd-sm">/</kbd> - Focus search</li>
                  <li><kbd className="kbd kbd-sm">?</kbd> - Show keyboard shortcuts help</li>
                  <li><kbd className="kbd kbd-sm">Esc</kbd> - Close modal/overlay</li>
                  <li><kbd className="kbd kbd-sm">Ctrl</kbd> + <kbd className="kbd kbd-sm">N</kbd> - Create new bot</li>
                </ul>
              </div>
            </div>

            <div className="alert alert-warning">
              <svg xmlns="http://www.w3.org/2000/svg" className="stroke-current shrink-0 h-6 w-6" fill="none" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <h3 className="font-bold">Navigation Shortcuts</h3>
                <ul className="list-disc list-inside mt-2 text-sm space-y-1">
                  <li><kbd className="kbd kbd-sm">H</kbd> - Go to overview</li>
                  <li><kbd className="kbd kbd-sm">B</kbd> - Go to bots</li>
                  <li><kbd className="kbd kbd-sm">M</kbd> - Go to monitoring</li>
                  <li><kbd className="kbd kbd-sm">Shift</kbd> + <kbd className="kbd kbd-sm">G</kbd> - Go to settings</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="divider">Implementation Notes</div>

          <div className="prose max-w-none">
            <h3 className="text-lg font-semibold">How to Use</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>
                <strong>For static shortcuts:</strong> Use the <code className="badge badge-sm">useKeyboardShortcuts</code> hook with a predefined list of shortcuts.
              </li>
              <li>
                <strong>For dynamic shortcuts:</strong> Use the <code className="badge badge-sm">useDynamicShortcuts</code> hook to register/unregister shortcuts at runtime.
              </li>
              <li>
                <strong>For button tooltips:</strong> Wrap your button with the <code className="badge badge-sm">KeyboardShortcutIndicator</code> component.
              </li>
              <li>
                <strong>Global shortcuts:</strong> Are already configured in <code className="badge badge-sm">useDefaultShortcuts</code> hook.
              </li>
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
};

export default KeyboardShortcutsDemo;
