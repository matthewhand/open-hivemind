## 2025-03-07 - Add ARIA Labels to Icon-Only Buttons
**Learning:** This application heavily utilizes custom DaisyUI wrapper components, often creating `<button>` elements that only contain HeroIcons or Lucide React icons. By default, these icon-only buttons are invisible to screen readers, causing accessibility issues where users cannot determine the button's purpose (e.g., delete, edit, close, expand).
**Action:** When implementing new UI elements or refactoring existing ones, always ensure that any `<button>` lacking visible, descriptive text content includes an `aria-label` attribute describing its function. When a button toggles state (like expanding a section), use `aria-expanded` in conjunction with a dynamic `aria-label`.

## 2025-03-17 - Prevent Input Blur on Inline Button Clicks
**Learning:** When building custom input components with inline action buttons (e.g., clear, undo, or remove tags in `CommaSeparatedInput`), clicking these buttons naturally causes the input field to lose focus. This interrupts the user's flow and can prematurely trigger `onBlur` events.
**Action:** Always add `onMouseDown={(e) => e.preventDefault()}` to inline buttons inside or adjacent to inputs. This prevents focus from leaving the input field when the button is clicked, retaining the cursor position and ensuring a smooth user experience.

## 2024-05-23 - Screen reader accessibility of icon-only buttons
**Learning:** Icon-only buttons with just a `title` attribute are often not sufficiently announced by screen readers depending on the configuration and user agent.
**Action:** Always provide an explicit `aria-label` attribute on icon-only buttons, even if a `title` attribute is present. The `title` acts as a visual tooltip, while `aria-label` ensures a consistent accessible name.
