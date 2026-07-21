# Hone's Architectural Journal

## 2024-06-25 | [Architectural Audit] | Insight: Pseudo-Button Proliferation | Protocol: Strict Semantic Buttons
- **The Discovery**: Numerous high-traffic interactive components (Theme switchers, nav dropdowns, chat actions) were using `<div tabIndex={0} role="button">` wrappers. This pattern creates brittle keyboard operability, requiring manual `onKeyDown` handlers for Space and Enter, and fails native screen reader expectations for button activation.
- **The Prevention Strategy**: Enforce the use of native `<button type="button">` elements globally for standalone actions. Exclude `<button>` only when nesting inside another `<button>` or `<a>` (where invalid HTML would occur).

## 2024-06-25 | [Architectural Audit] | Insight: Event Bubbling in Nested Interactives | Protocol: Defensive Stop Propagation
- **The Discovery**: The mobile card view of `DataTable` implements an interactive row via `<div role="button">` (which is necessary due to nested edit/delete buttons, as `<button>` cannot contain `<button>`). However, nested actions lacked `onKeyDown` stop propagation, causing row selection to fire erroneously when a user activated an inner button via keyboard.
- **The Prevention Strategy**: Explicitly bind both `onClick` and `onKeyDown` handlers with `e.stopPropagation()` on all nested interactive elements within custom role="button" wrappers to preserve component boundaries.

## 2024-06-25 | [Architectural Audit] | Insight: Scroll Lock Resource Leaks | Protocol: Deterministic Overflow Restoration
- **The Discovery**: Custom modal and drawer overlays (`DetailDrawer`, `CommandPalette`, `KeyboardShortcutsHelp`, and the base `Modal` effect hook) were indiscriminately setting `document.body.style.overflow = ''` on unmount or close. This destroys the previous overflow state, introducing severe scroll-lock regressions when multiple nested overlays unmount sequentially.
- **The Prevention Strategy**: Every component that overrides body scroll must cache the previous `document.body.style.overflow` value on mount, and restore *that specific value* in the cleanup function.
