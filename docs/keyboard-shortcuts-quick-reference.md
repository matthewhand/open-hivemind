# Keyboard Shortcuts Quick Reference

## For Users

### Global Shortcuts

Press these keys anywhere in the application:

| Shortcut | Action |
|----------|--------|
| `?` | Show this help |
| `Ctrl+K` (or `Cmd+K` on Mac) | Open command palette |
| `/` | Focus search |
| `Esc` | Close modal or overlay |
| `Ctrl+N` (or `Cmd+N` on Mac) | Create new bot |
| `H` | Go to overview page |
| `B` | Go to bots page |
| `M` | Go to monitoring page |
| `Shift+G` | Go to settings page |

## For Developers

### Quick Start

#### 1. Add Static Shortcuts to a Component

```tsx
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';

const MyComponent = () => {
  useKeyboardShortcuts([
    {
      key: 's',
      ctrlKey: true,
      action: handleSave,
      description: 'Save',
      category: 'Actions',
    },
  ]);
};
```

#### 2. Add Dynamic Shortcuts (Register/Unregister)

```tsx
import { useDynamicShortcuts } from '../hooks/useKeyboardShortcuts';

const MyModal = ({ isOpen }) => {
  const { registerShortcut, unregisterShortcut } = useDynamicShortcuts();

  useEffect(() => {
    if (isOpen) {
      registerShortcut('submit', {
        key: 'Enter',
        ctrlKey: true,
        action: handleSubmit,
        description: 'Submit form',
      });
    }
    return () => unregisterShortcut('submit');
  }, [isOpen]);
};
```

#### 3. Add Tooltip with Keyboard Shortcut to Button

```tsx
import KeyboardShortcutIndicator from '../components/KeyboardShortcutIndicator';

<KeyboardShortcutIndicator keys={['Ctrl', 'S']} description="Save">
  <button onClick={handleSave}>Save</button>
</KeyboardShortcutIndicator>
```

### Shortcut Configuration

```typescript
interface Shortcut {
  key: string;              // 's', 'Enter', 'Escape', '?'
  ctrlKey?: boolean;        // Require Ctrl/Cmd
  shiftKey?: boolean;       // Require Shift
  altKey?: boolean;         // Require Alt/Option
  action: () => void;       // Function to execute
  description: string;      // For help modal
  global?: boolean;         // Works in input fields if true
  category?: string;        // 'General', 'Navigation', 'Actions'
}
```

### Available Categories

- `General` - Common actions (help, search, etc.)
- `Navigation` - Page navigation
- `Actions` - Create, save, delete, etc.
- `Other` - Uncategorized

### Utility Functions

```tsx
import {
  isMac,
  formatShortcutKeys,
  formatShortcutString,
  getModifierKeyName,
} from '../utils/keyboardShortcutUtils';

// Platform detection
isMac(); // true on Mac, false elsewhere

// Format shortcut for display
formatShortcutKeys(shortcut); // ['Cmd', 'S'] on Mac

// String representation
formatShortcutString(shortcut); // 'Cmd+S' on Mac

// Get modifier name
getModifierKeyName('ctrl'); // 'Cmd' on Mac, 'Ctrl' elsewhere
```

### Common Patterns

#### Save Action
```tsx
{ key: 's', ctrlKey: true, action: handleSave, description: 'Save' }
```

#### Delete Action
```tsx
{ key: 'd', ctrlKey: true, shiftKey: true, action: handleDelete, description: 'Delete' }
```

#### Cancel/Close Action
```tsx
{ key: 'Escape', global: true, action: handleClose, description: 'Close' }
```

#### Submit Action
```tsx
{ key: 'Enter', ctrlKey: true, action: handleSubmit, description: 'Submit' }
```

#### Navigation
```tsx
{ key: 'h', action: () => navigate('/home'), description: 'Go home' }
```

### Testing

1. Press `Shift+?` to open help modal
2. Verify your shortcuts appear
3. Test on Mac and Windows
4. Check tooltips show correct keys

### Files

- Hook: `src/client/src/hooks/useKeyboardShortcuts.ts`
- Help Modal: `src/client/src/components/KeyboardShortcutsHelp.tsx`
- Indicator: `src/client/src/components/KeyboardShortcutIndicator.tsx`
- Utils: `src/client/src/utils/keyboardShortcutUtils.ts`

### Full Documentation

See `docs/keyboard-shortcuts-guide.md` for complete documentation.
