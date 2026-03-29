# Keyboard Shortcuts System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         App.tsx                                  │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │          KeyboardShortcutsProvider                        │  │
│  │  ┌─────────────────────────────────────────────────────┐  │  │
│  │  │  useDefaultShortcuts()                              │  │  │
│  │  │  - Global shortcuts (Ctrl+K, /, ?, Esc, Ctrl+N)    │  │  │
│  │  │  - Navigation (H, B, M, Shift+G)                   │  │  │
│  │  └─────────────────────────────────────────────────────┘  │  │
│  │  ┌─────────────────┐  ┌───────────────────────────────┐  │  │
│  │  │ CommandPalette  │  │ KeyboardShortcutsHelp         │  │  │
│  │  │ (Ctrl+K)       │  │ (Shift+?)                     │  │  │
│  │  └─────────────────┘  └───────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                      Your Component                              │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  Option 1: Static Shortcuts                            │     │
│  │  useKeyboardShortcuts([...shortcuts])                  │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  Option 2: Dynamic Shortcuts                           │     │
│  │  const { registerShortcut, unregisterShortcut }       │     │
│  │    = useDynamicShortcuts()                             │     │
│  └────────────────────────────────────────────────────────┘     │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐     │
│  │  Option 3: Visual Indicators                           │     │
│  │  <KeyboardShortcutIndicator>                          │     │
│  │    <button>Action</button>                             │     │
│  │  </KeyboardShortcutIndicator>                         │     │
│  └────────────────────────────────────────────────────────┘     │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

```
┌──────────────┐
│ User presses │
│   keyboard   │
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│ useKeyboardShortcuts hook                            │
│ - Listens for keydown events                         │
│ - Checks if target is input (unless global: true)    │
│ - Matches pressed keys against registered shortcuts  │
└──────┬───────────────────────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────────────────────┐
│ Shortcut matched?                                     │
└──┬───────────────────────────────────────────────┬───┘
   │ YES                                           │ NO
   │                                               │
   ▼                                               ▼
┌──────────────────────┐                  ┌────────────┐
│ Prevent default      │                  │ Do nothing │
│ Stop propagation     │                  └────────────┘
│ Execute action()     │
└──────────────────────┘
```

## Hook Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│           useKeyboardShortcuts.ts (Core Module)                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌───────────────────────────────────────────────────────┐      │
│  │ useKeyboardShortcuts(shortcuts: Shortcut[])           │      │
│  │ - Low-level hook                                      │      │
│  │ - Registers global keydown listener                   │      │
│  │ - Matches events against shortcuts                    │      │
│  │ - Executes action on match                            │      │
│  └───────────────────────────────────────────────────────┘      │
│                          ▲                                       │
│                          │ uses                                  │
│  ┌───────────────────────┴───────────────────────────────┐      │
│  │ useDynamicShortcuts()                                 │      │
│  │ - Higher-level hook                                   │      │
│  │ - Manages Map<id, Shortcut>                           │      │
│  │ - Provides registerShortcut(id, shortcut)             │      │
│  │ - Provides unregisterShortcut(id)                     │      │
│  │ - Provides clearShortcuts()                           │      │
│  └───────────────────────────────────────────────────────┘      │
│                          ▲                                       │
│                          │ uses                                  │
│  ┌───────────────────────┴───────────────────────────────┐      │
│  │ useDefaultShortcuts()                                 │      │
│  │ - Application-level hook                              │      │
│  │ - Defines global shortcuts                            │      │
│  │ - Manages command palette state                       │      │
│  │ - Manages shortcuts help state                        │      │
│  └───────────────────────────────────────────────────────┘      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 KeyboardShortcutIndicator                        │
│  ┌───────────────────────────────────────────────────────┐      │
│  │ Props: keys[], shortcut, description, position        │      │
│  └────────────┬──────────────────────────────────────────┘      │
│               │                                                  │
│               ▼                                                  │
│  ┌───────────────────────────────────────────────────────┐      │
│  │ Uses: keyboardShortcutUtils                           │      │
│  │ - formatShortcutKeys()                                │      │
│  │ - isMac()                                             │      │
│  │ - getModifierKeyName()                                │      │
│  └────────────┬──────────────────────────────────────────┘      │
│               │                                                  │
│               ▼                                                  │
│  ┌───────────────────────────────────────────────────────┐      │
│  │ Renders: Tooltip + Kbd components                     │      │
│  │ <Tooltip content={description + keys}>               │      │
│  │   {children}                                          │      │
│  │ </Tooltip>                                            │      │
│  └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  KeyboardShortcutsHelp                           │
│  ┌───────────────────────────────────────────────────────┐      │
│  │ Props: isOpen, onClose, shortcuts[]                   │      │
│  └────────────┬──────────────────────────────────────────┘      │
│               │                                                  │
│               ▼                                                  │
│  ┌───────────────────────────────────────────────────────┐      │
│  │ Groups shortcuts by category                          │      │
│  │ - General, Navigation, Actions, Other                 │      │
│  └────────────┬──────────────────────────────────────────┘      │
│               │                                                  │
│               ▼                                                  │
│  ┌───────────────────────────────────────────────────────┐      │
│  │ Renders modal with categorized shortcuts              │      │
│  │ <Modal>                                               │      │
│  │   {categories.map(cat => (                            │      │
│  │     <Category title={cat}>                            │      │
│  │       {shortcuts.map(s => (                           │      │
│  │         <Row>{s.description} {formatKeys(s)}</Row>    │      │
│  │       ))}                                             │      │
│  │     </Category>                                       │      │
│  │   ))}                                                 │      │
│  │ </Modal>                                              │      │
│  └───────────────────────────────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

## Utility Layer

```
┌─────────────────────────────────────────────────────────────────┐
│              keyboardShortcutUtils.ts                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Platform Detection                                              │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ isMac() → boolean                                    │        │
│  │ - Detects Mac/iOS platform                           │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                   │
│  Key Formatting                                                  │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ getModifierKeyName(modifier) → string                │        │
│  │ - Returns 'Cmd' on Mac, 'Ctrl' on others             │        │
│  │                                                       │        │
│  │ formatShortcutKeys(shortcut) → string[]              │        │
│  │ - Returns ['Cmd', 'S'] or ['Ctrl', 'S']              │        │
│  │                                                       │        │
│  │ formatShortcutString(shortcut) → string              │        │
│  │ - Returns 'Cmd+S' or 'Ctrl+S'                        │        │
│  │                                                       │        │
│  │ formatShortcutWithSymbols(shortcut) → string         │        │
│  │ - Returns '⌘S' on Mac, 'Ctrl+S' elsewhere            │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                   │
│  Matching & Validation                                           │
│  ┌─────────────────────────────────────────────────────┐        │
│  │ matchesShortcut(event, shortcut) → boolean           │        │
│  │ - Checks if KeyboardEvent matches Shortcut           │        │
│  │                                                       │        │
│  │ isInputElement(target) → boolean                     │        │
│  │ - Checks if target is input/textarea/contentEditable │        │
│  │                                                       │        │
│  │ getShortcutId(shortcut) → string                     │        │
│  │ - Generates unique ID like 'ctrl+shift+s'            │        │
│  └─────────────────────────────────────────────────────┘        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

## Integration Points

```
┌────────────────────┐     ┌────────────────────┐
│   App.tsx          │────▶│ KeyboardShortcuts  │
│                    │     │ Provider           │
└────────────────────┘     └─────────┬──────────┘
                                     │
                     ┌───────────────┼───────────────┐
                     │               │               │
                     ▼               ▼               ▼
         ┌────────────────┐ ┌────────────┐ ┌────────────────┐
         │ Command        │ │ Shortcuts  │ │ Global         │
         │ Palette        │ │ Help Modal │ │ Shortcuts      │
         │ (Ctrl+K)       │ │ (Shift+?)  │ │ (/, Esc, etc.) │
         └────────────────┘ └────────────┘ └────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                      Any Component                              │
├────────────────────────────────────────────────────────────────┤
│  Can use:                                                       │
│  - useKeyboardShortcuts()   (static shortcuts)                 │
│  - useDynamicShortcuts()    (dynamic registration)             │
│  - KeyboardShortcutIndicator (visual tooltips)                 │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                      Examples                                   │
├────────────────────────────────────────────────────────────────┤
│  - BotsPage        → Ctrl+N creates new bot                    │
│  - NavbarWithSearch → / focuses search                         │
│  - Modals          → Esc closes modal                          │
│  - Forms           → Ctrl+S saves form                         │
│  - Tables          → Arrow keys navigate                       │
└────────────────────────────────────────────────────────────────┘
```

## Event Flow Diagram

```
User Interaction
      │
      ▼
┌─────────────────────┐
│ Keyboard Press      │
│ (e.g., Ctrl+S)      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Browser KeyboardEvent                    │
│ - key: 's'                               │
│ - ctrlKey: true                          │
│ - target: HTMLElement                    │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ useKeyboardShortcuts handleKeyDown()    │
│ 1. Get target element                   │
│ 2. Check if typing in input             │
│ 3. Loop through registered shortcuts    │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Shortcut Matching                        │
│ - keyMatch: 's' === 's' ✓               │
│ - ctrlMatch: true === true ✓            │
│ - shiftMatch: false === false ✓         │
│ - altMatch: false === false ✓           │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Action Execution                         │
│ 1. event.preventDefault()               │
│ 2. event.stopPropagation()              │
│ 3. shortcut.action()                    │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Component Update                         │
│ (e.g., handleSave() called)             │
└─────────────────────────────────────────┘
```

## State Management

```
┌────────────────────────────────────────────────────────────┐
│ useDefaultShortcuts                                         │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  State:                                                      │
│  ┌──────────────────────────────────────────────┐          │
│  │ isCommandPaletteOpen: boolean                │          │
│  │ isShortcutsHelpOpen: boolean                 │          │
│  └──────────────────────────────────────────────┘          │
│                                                              │
│  Effects:                                                    │
│  ┌──────────────────────────────────────────────┐          │
│  │ useKeyboardShortcuts([...shortcuts])         │          │
│  │ - Registers global event listener            │          │
│  │ - Cleanup on unmount                          │          │
│  └──────────────────────────────────────────────┘          │
│                                                              │
└────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────┐
│ useDynamicShortcuts                                         │
├────────────────────────────────────────────────────────────┤
│                                                              │
│  State:                                                      │
│  ┌──────────────────────────────────────────────┐          │
│  │ shortcuts: Shortcut[]                        │          │
│  │ shortcutsRef: Map<string, Shortcut>         │          │
│  └──────────────────────────────────────────────┘          │
│                                                              │
│  Actions:                                                    │
│  ┌──────────────────────────────────────────────┐          │
│  │ registerShortcut(id, shortcut)               │          │
│  │ - Add to Map                                  │          │
│  │ - Update shortcuts array                     │          │
│  │                                               │          │
│  │ unregisterShortcut(id)                       │          │
│  │ - Remove from Map                             │          │
│  │ - Update shortcuts array                     │          │
│  │                                               │          │
│  │ clearShortcuts()                             │          │
│  │ - Clear Map                                   │          │
│  │ - Reset shortcuts array                      │          │
│  └──────────────────────────────────────────────┘          │
│                                                              │
└────────────────────────────────────────────────────────────┘
```

## Summary

The keyboard shortcuts system is built on three layers:

1. **Low-level**: `useKeyboardShortcuts()` - Event handling and matching
2. **Mid-level**: `useDynamicShortcuts()` - Dynamic registration
3. **High-level**: `useDefaultShortcuts()` - Global application shortcuts

Components can use any of these layers depending on their needs, and the `KeyboardShortcutIndicator` provides visual feedback to users about available shortcuts.
