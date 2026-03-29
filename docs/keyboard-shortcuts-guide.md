# Keyboard Shortcuts System Guide

This guide explains how to use and extend the keyboard shortcuts system in the application.

## Overview

The keyboard shortcuts system provides:
- Global keyboard shortcuts for common actions
- Command palette (Ctrl+K) for quick navigation
- Dynamic shortcut registration for components
- Visual indicators (tooltips) showing keyboard shortcuts on buttons
- Help modal (Shift+?) displaying all available shortcuts
- Platform-aware key display (Cmd on Mac, Ctrl on Windows/Linux)

## Architecture

### Core Files

- **`src/client/src/hooks/useKeyboardShortcuts.ts`**: Core hooks for keyboard shortcuts
  - `useKeyboardShortcuts()`: Low-level hook for registering shortcuts
  - `useDynamicShortcuts()`: Hook with dynamic registration/unregistration
  - `useDefaultShortcuts()`: Global application shortcuts

- **`src/client/src/components/KeyboardShortcutsHelp.tsx`**: Help modal component displaying all shortcuts

- **`src/client/src/components/KeyboardShortcutIndicator.tsx`**: Wrapper component for adding tooltips with keyboard shortcuts to buttons

- **`src/client/src/components/KeyboardShortcutsProvider.tsx`**: Provider component that activates global shortcuts

- **`src/client/src/utils/keyboardShortcutUtils.ts`**: Utility functions for formatting and matching shortcuts

## Default Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+K` | Open command palette |
| `/` | Focus search |
| `?` | Show keyboard shortcuts help |
| `Esc` | Close modal/overlay |
| `Ctrl+N` | Create new bot |
| `H` | Go to overview |
| `B` | Go to bots |
| `M` | Go to monitoring |
| `Shift+G` | Go to settings |

## Usage Examples

### 1. Static Shortcuts in a Component

Use `useKeyboardShortcuts()` for predefined shortcuts:

```tsx
import { useKeyboardShortcuts, Shortcut } from '../hooks/useKeyboardShortcuts';

const MyComponent = () => {
  const shortcuts: Shortcut[] = [
    {
      key: 's',
      ctrlKey: true,
      action: () => handleSave(),
      description: 'Save changes',
      category: 'Actions',
    },
    {
      key: 'Delete',
      action: () => handleDelete(),
      description: 'Delete item',
      category: 'Actions',
    },
  ];

  useKeyboardShortcuts(shortcuts);

  return <div>My Component</div>;
};
```

### 2. Dynamic Shortcuts

Use `useDynamicShortcuts()` for runtime registration:

```tsx
import { useDynamicShortcuts } from '../hooks/useKeyboardShortcuts';

const MyComponent = () => {
  const { registerShortcut, unregisterShortcut } = useDynamicShortcuts();

  useEffect(() => {
    // Register shortcut
    registerShortcut('save', {
      key: 's',
      ctrlKey: true,
      action: () => handleSave(),
      description: 'Save changes',
      category: 'Actions',
    });

    // Cleanup on unmount
    return () => unregisterShortcut('save');
  }, [registerShortcut, unregisterShortcut]);

  return <div>My Component</div>;
};
```

### 3. Adding Keyboard Shortcut Tooltips to Buttons

Wrap buttons with `KeyboardShortcutIndicator`:

```tsx
import KeyboardShortcutIndicator from '../components/KeyboardShortcutIndicator';

// With keys array
<KeyboardShortcutIndicator
  keys={['Ctrl', 'S']}
  description="Save changes"
  position="top"
>
  <button onClick={handleSave}>Save</button>
</KeyboardShortcutIndicator>

// With shortcut object
<KeyboardShortcutIndicator
  shortcut={saveShortcut}
  description="Save changes"
>
  <button onClick={handleSave}>Save</button>
</KeyboardShortcutIndicator>

// Shortcut only (no description)
<KeyboardShortcutIndicator
  keys={['Ctrl', 'N']}
  description="Create"
  shortcutOnly
>
  <button>New</button>
</KeyboardShortcutIndicator>
```

### 4. Adding Shortcuts to the Help Modal

Shortcuts are automatically grouped by category in the help modal. To add your shortcuts to the global help modal, register them with categories:

```tsx
const shortcuts: Shortcut[] = [
  {
    key: 's',
    ctrlKey: true,
    action: () => handleSave(),
    description: 'Save changes',
    category: 'Actions',  // Groups shortcuts in help modal
  },
];
```

Available categories:
- `General`: Common actions (search, help, etc.)
- `Navigation`: Page navigation shortcuts
- `Actions`: Create, save, delete actions
- `Other`: Uncategorized shortcuts

## Shortcut Configuration

The `Shortcut` interface:

```typescript
interface Shortcut {
  key: string;              // Key to press (e.g., 's', 'Enter', 'Escape')
  ctrlKey?: boolean;        // Require Ctrl/Cmd key
  shiftKey?: boolean;       // Require Shift key
  altKey?: boolean;         // Require Alt/Option key
  action: () => void;       // Function to execute
  description: string;      // Human-readable description
  global?: boolean;         // If true, works even in input fields
  category?: string;        // Category for grouping in help modal
}
```

## Platform Awareness

The system automatically adapts to the user's platform:
- **Mac**: Shows `Cmd` instead of `Ctrl`, `Opt` instead of `Alt`
- **Windows/Linux**: Shows `Ctrl`, `Alt`

Use the utility functions in `keyboardShortcutUtils.ts`:

```typescript
import { isMac, getModifierKeyName, formatShortcutKeys } from '../utils/keyboardShortcutUtils';

// Check platform
if (isMac()) {
  console.log('Running on Mac');
}

// Get platform-appropriate modifier name
getModifierKeyName('ctrl'); // Returns 'Cmd' on Mac, 'Ctrl' elsewhere

// Format shortcut for display
const keys = formatShortcutKeys(shortcut); // Returns ['Cmd', 'S'] on Mac
```

## Best Practices

1. **Use consistent shortcuts**: Follow common conventions (Ctrl+S for save, Ctrl+N for new, etc.)

2. **Provide tooltips**: Always add `KeyboardShortcutIndicator` to buttons with shortcuts

3. **Category shortcuts**: Use categories to organize shortcuts in the help modal

4. **Avoid conflicts**: Check existing shortcuts before adding new ones

5. **Document shortcuts**: Add new global shortcuts to this guide

6. **Clean up**: Always unregister dynamic shortcuts in cleanup functions

7. **Test on both platforms**: Verify shortcuts work on both Mac and Windows/Linux

## Adding New Global Shortcuts

To add a new global shortcut:

1. Open `src/client/src/hooks/useKeyboardShortcuts.ts`
2. Add the shortcut to the `useDefaultShortcuts()` hook:

```typescript
{
  key: 'p',
  ctrlKey: true,
  action: () => navigate('/admin/personas'),
  description: 'Go to personas',
  category: 'Navigation',
}
```

3. Update this documentation
4. Add the shortcut indicator to relevant buttons in the UI

## Troubleshooting

### Shortcut Not Working

1. Check if it conflicts with browser shortcuts
2. Verify the shortcut is registered (check help modal with `Shift+?`)
3. Ensure the component is mounted
4. Check if `global: true` is needed for input fields

### Shortcut Not Showing in Help Modal

1. Verify the shortcut has a `description`
2. Check that `useDefaultShortcuts()` or `useDynamicShortcuts()` is being used
3. Ensure `KeyboardShortcutsProvider` is mounted in the app

### Tooltip Not Showing

1. Verify `KeyboardShortcutIndicator` is wrapping the button correctly
2. Check that the child element can receive tooltips (must be a valid React element)
3. Ensure DaisyUI tooltip styles are loaded

## Testing

To test keyboard shortcuts:

1. Navigate to `/admin/showcase` (or create a test page)
2. Press `Shift+?` to view all shortcuts
3. Test each shortcut individually
4. Verify platform-specific display (test on Mac and Windows/Linux)
5. Check tooltip display on hover
6. Verify shortcuts work in different contexts (modals, inputs, etc.)

## Future Enhancements

Potential improvements:
- [ ] Keyboard shortcut recorder for custom shortcuts
- [ ] User-configurable shortcuts
- [ ] Shortcut conflict detection
- [ ] Visual on-screen keyboard shortcut hints
- [ ] Keyboard shortcut analytics
