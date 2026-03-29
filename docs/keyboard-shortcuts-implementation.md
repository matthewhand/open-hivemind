# Keyboard Shortcuts Implementation

## Summary

This document describes the comprehensive keyboard shortcuts system implementation for the Open-Hivemind application.

## What Was Implemented

### 1. Core Hooks (`src/client/src/hooks/useKeyboardShortcuts.ts`)

#### `useKeyboardShortcuts(shortcuts: Shortcut[])`
Low-level hook for registering static keyboard shortcuts.

```typescript
const shortcuts = [
  { key: 's', ctrlKey: true, action: handleSave, description: 'Save' }
];
useKeyboardShortcuts(shortcuts);
```

#### `useDynamicShortcuts()`
Enhanced hook providing dynamic registration and unregistration.

```typescript
const { registerShortcut, unregisterShortcut, clearShortcuts, shortcuts } = useDynamicShortcuts();

// Register at runtime
registerShortcut('save', {
  key: 's',
  ctrlKey: true,
  action: handleSave,
  description: 'Save changes',
  category: 'Actions',
});

// Unregister when done
unregisterShortcut('save');
```

#### `useDefaultShortcuts()`
Manages global application shortcuts with categories.

**Global Shortcuts:**
- `Ctrl+K`: Open command palette
- `/`: Focus search
- `?`: Show keyboard shortcuts help
- `Esc`: Close modal/overlay
- `Ctrl+N`: Create new bot
- `H`: Go to overview
- `B`: Go to bots
- `M`: Go to monitoring
- `Shift+G`: Go to settings

### 2. Shortcut Interface

```typescript
interface Shortcut {
  key: string;              // Key to press
  ctrlKey?: boolean;        // Require Ctrl/Cmd
  shiftKey?: boolean;       // Require Shift
  altKey?: boolean;         // Require Alt/Option
  action: () => void;       // Function to execute
  description: string;      // Human-readable description
  global?: boolean;         // Works in input fields if true
  category?: string;        // Category for help modal grouping
}
```

### 3. Help Modal Component (`src/client/src/components/KeyboardShortcutsHelp.tsx`)

Beautiful modal displaying all keyboard shortcuts, grouped by category:
- Categorized shortcut display (General, Navigation, Actions, Other)
- Platform-aware key display (Cmd on Mac, Ctrl on Windows/Linux)
- Keyboard-friendly navigation
- Accessible with proper ARIA labels

**Open with:** Press `Shift+?` anywhere in the app

### 4. Keyboard Shortcut Indicator Component (`src/client/src/components/KeyboardShortcutIndicator.tsx`)

Wrapper component for adding keyboard shortcut tooltips to buttons:

```tsx
<KeyboardShortcutIndicator keys={['Ctrl', 'N']} description="Create new bot">
  <button>New Bot</button>
</KeyboardShortcutIndicator>
```

Features:
- Supports keys array or Shortcut object
- Platform-aware display (shows Cmd on Mac)
- Customizable tooltip position
- Optional shortcut-only display

### 5. Utility Functions (`src/client/src/utils/keyboardShortcutUtils.ts`)

Comprehensive utilities for working with keyboard shortcuts:

- `isMac()`: Detect Mac/iOS platform
- `getModifierKeyName(modifier)`: Get platform-appropriate modifier name
- `formatShortcutKeys(shortcut)`: Format shortcut as key array
- `formatShortcutString(shortcut)`: Format as string (e.g., "Ctrl+S")
- `matchesShortcut(event, shortcut)`: Check if event matches shortcut
- `isInputElement(target)`: Check if target is input-like
- `getShortcutId(shortcut)`: Generate unique ID for shortcut
- `formatShortcutWithSymbols(shortcut)`: Format using Mac symbols (⌘⇧S)

### 6. Demo Component (`src/client/src/components/KeyboardShortcutsDemo.tsx`)

Comprehensive demo showcasing:
- Dynamic shortcut registration
- Button keyboard shortcut indicators
- Global shortcuts list
- Implementation examples

### 7. Enhanced Components

#### NavbarWithSearch
- Added keyboard shortcut indicator to "Create New Bot" button
- Added visual `/` key indicator in search input

## File Structure

```
src/client/src/
├── hooks/
│   └── useKeyboardShortcuts.ts          # Core hooks
├── components/
│   ├── KeyboardShortcutsHelp.tsx        # Help modal
│   ├── KeyboardShortcutIndicator.tsx    # Tooltip wrapper
│   ├── KeyboardShortcutsProvider.tsx    # Global provider
│   ├── KeyboardShortcutsDemo.tsx        # Demo component
│   └── CommandPalette.tsx               # Command palette (existing)
└── utils/
    └── keyboardShortcutUtils.ts         # Utility functions

docs/
├── keyboard-shortcuts-guide.md          # User & developer guide
└── keyboard-shortcuts-implementation.md # This file
```

## Integration

The keyboard shortcuts system is already integrated into the app via `KeyboardShortcutsProvider` in `App.tsx`:

```tsx
<BrowserRouter>
  <ScrollToTop />
  <KeyboardShortcutsProvider />  // ← Activates global shortcuts
  <AppRouter />
</BrowserRouter>
```

## Usage Examples

### Adding Shortcuts to a New Page

```tsx
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

const MyPage = () => {
  useKeyboardShortcuts([
    {
      key: 's',
      ctrlKey: true,
      action: handleSave,
      description: 'Save changes',
      category: 'Actions',
    },
  ]);

  return <div>My Page</div>;
};
```

### Adding Tooltips to Buttons

```tsx
import KeyboardShortcutIndicator from '../components/KeyboardShortcutIndicator';

<KeyboardShortcutIndicator keys={['Ctrl', 'S']} description="Save changes">
  <button onClick={handleSave}>Save</button>
</KeyboardShortcutIndicator>
```

### Dynamic Registration in Modal

```tsx
const Modal = ({ isOpen, onClose }) => {
  const { registerShortcut, unregisterShortcut } = useDynamicShortcuts();

  useEffect(() => {
    if (isOpen) {
      registerShortcut('modal-submit', {
        key: 'Enter',
        ctrlKey: true,
        action: handleSubmit,
        description: 'Submit form',
      });
    }

    return () => {
      unregisterShortcut('modal-submit');
    };
  }, [isOpen]);

  // ...
};
```

## Features

### Platform Awareness
- Automatically detects Mac vs. Windows/Linux
- Shows appropriate key names (Cmd vs. Ctrl, Opt vs. Alt)
- Supports Mac keyboard symbols (⌘, ⇧, ⌥, ⌃)

### Accessibility
- Proper ARIA labels and roles
- Keyboard-navigable help modal
- Screen reader friendly
- Focus management

### Smart Behavior
- Shortcuts disabled in input fields (unless `global: true`)
- Command palette and help modal keyboard navigation
- Escape key closes overlays
- Debounced search input

### Visual Feedback
- Tooltips with keyboard shortcuts on buttons
- Grouped shortcuts in help modal
- Styled kbd elements for key display
- Hover states and transitions

## Testing

To test the system:

1. Press `Shift+?` to open the help modal
2. Verify all shortcuts are listed and grouped
3. Test each shortcut:
   - `Ctrl+K`: Open command palette
   - `/`: Focus search
   - `Ctrl+N`: Navigate to create bot
   - `Esc`: Close modals
   - Letter shortcuts: Navigate to pages
4. Hover over buttons to see keyboard shortcut tooltips
5. Test on Mac and Windows to verify platform-specific display

## Browser Compatibility

- Chrome/Edge: Full support
- Firefox: Full support
- Safari: Full support
- All keyboard shortcuts use standard browser APIs

## Performance

- Lightweight: Minimal overhead
- Efficient event handling: Single global listener
- Debounced search: Reduces unnecessary re-renders
- Optimized re-renders: Uses callbacks and refs

## Future Enhancements

Potential improvements:
- [ ] User-configurable shortcuts (save to localStorage)
- [ ] Keyboard shortcut conflict detection
- [ ] Visual keyboard shortcut recorder
- [ ] Shortcut chaining (vim-style: g→h)
- [ ] Context-specific shortcuts
- [ ] Shortcut analytics and usage tracking

## Credits

Built with:
- React hooks for state management
- DaisyUI components for UI
- Lucide React for icons
- TypeScript for type safety
