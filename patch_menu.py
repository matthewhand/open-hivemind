import re

with open('src/client/src/components/DaisyUI/Menu.tsx', 'r') as f:
    content = f.read()

# Update the MenuProps and state to keep track of focused item if needed,
# or just add onKeyDown for the ul level,
# or use standard DOM traversal on key down.

# Let's add onKeyDown to the Menu component ul
menu_ul = r'(<ul\n\s*className=\{getMenuClasses\(\)\}\n\s*role="menu"\n\s*aria-label="Navigation menu"\n\s*>)'

# Wait, a better approach for simple keyboard nav:
# Find all role="menuitem" in the menu and navigate using arrow keys.
keyboard_nav_script = """
  const handleKeyDown = (e: React.KeyboardEvent<HTMLUListElement>) => {
    const focusableItems = Array.from(
      e.currentTarget.querySelectorAll('[role="menuitem"]:not([aria-disabled="true"])')
    ) as HTMLElement[];

    if (!focusableItems.length) return;

    const currentIndex = focusableItems.indexOf(document.activeElement as HTMLElement);

    let nextIndex = currentIndex;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      nextIndex = (currentIndex + 1) % focusableItems.length;
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      nextIndex = (currentIndex - 1 + focusableItems.length) % focusableItems.length;
    } else if (e.key === 'Home') {
      e.preventDefault();
      nextIndex = 0;
    } else if (e.key === 'End') {
      e.preventDefault();
      nextIndex = focusableItems.length - 1;
    }

    if (nextIndex !== currentIndex && focusableItems[nextIndex]) {
      focusableItems[nextIndex].focus();
    }
  };
"""

content = content.replace(
    'const toggleExpanded = useCallback((itemId: string) => {',
    keyboard_nav_script + '\n  const toggleExpanded = useCallback((itemId: string) => {'
)

# Apply onKeyDown to the root ul
content = content.replace(
    '<ul\n      className={getMenuClasses()}\n      role="menu"\n      aria-label="Navigation menu"\n    >',
    '<ul\n      className={getMenuClasses()}\n      role="menu"\n      aria-label="Navigation menu"\n      onKeyDown={handleKeyDown}\n    >'
)

# Fix the tabIndex. By standard roving tabIndex, only the first item or active item should have 0, others -1.
# To keep it simple, we can leave tabIndex={0} on all for now since DaisyUI relies on standard tabbing too,
# but the prompt specifically asked to "manage tabIndex so that only the active/focused item receives a tabIndex={0} while others get -1."
# To do true roving tabIndex in a functional component without complex state, we can use a small trick:
# the first item gets 0, rest -1, and onFocus updates it.
# Alternatively, since we just need to satisfy the criteria, we can just say `tabIndex={item.active ? 0 : -1}`
# but what if none are active? Then the first one should be 0. Let's use `tabIndex={item.active || depth === 0 && !item.disabled ? 0 : -1}` - wait, no, that's not exactly roving.
# Let's just keep the state `const [focusedId, setFocusedId] = useState<string | null>(null);`

state_focused = "const [focusedId, setFocusedId] = useState<string | null>(null);"
content = content.replace(
    'const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());',
    'const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());\n  ' + state_focused
)

# And in handleKeyDown, we update focus. But since standard ARIA pattern says `onFocus` updates the roving index, we can just add `onFocus={() => setFocusedId(item.id)}`.

roving_tab_index = "tabIndex={item.disabled ? -1 : (focusedId === item.id || (!focusedId && items.length > 0 && items[0].id === item.id) ? 0 : -1)}"

content = content.replace(
    'tabIndex={item.disabled ? -1 : 0}',
    roving_tab_index + '\n          onFocus={() => setFocusedId(item.id)}'
)

# Replace 'none' role on li with 'presentation'
content = content.replace(
    'role="none"',
    'role="presentation"'
)

with open('src/client/src/components/DaisyUI/Menu.tsx', 'w') as f:
    f.write(content)
