## 2025-03-07 - Add ARIA Labels to Icon-Only Buttons
**Learning:** This application heavily utilizes custom DaisyUI wrapper components, often creating `<button>` elements that only contain HeroIcons or Lucide React icons. By default, these icon-only buttons are invisible to screen readers, causing accessibility issues where users cannot determine the button's purpose (e.g., delete, edit, close, expand).
**Action:** When implementing new UI elements or refactoring existing ones, always ensure that any `<button>` lacking visible, descriptive text content includes an `aria-label` attribute describing its function. When a button toggles state (like expanding a section), use `aria-expanded` in conjunction with a dynamic `aria-label`.

## 2025-03-17 - Prevent Input Blur on Inline Button Clicks
**Learning:** When building custom input components with inline action buttons (e.g., clear, undo, or remove tags in `CommaSeparatedInput`), clicking these buttons naturally causes the input field to lose focus. This interrupts the user's flow and can prematurely trigger `onBlur` events.
**Action:** Always add `onMouseDown={(e) => e.preventDefault()}` to inline buttons inside or adjacent to inputs. This prevents focus from leaving the input field when the button is clicked, retaining the cursor position and ensuring a smooth user experience.

## 2025-03-24 - Accessible Loading States in Buttons
**Learning:** When a button enters a loading state, adding a visual spinner is insufficient for screen reader users. Without proper ARIA attributes, screen readers may read the spinner as unexpected characters or fail to announce that the action is currently processing.
**Action:** When a button is in a loading state, always add `aria-busy={true}` (or `aria-busy={loading}`) to the `<button>` element to announce its processing state. Additionally, always add `aria-hidden="true"` to any purely visual loading spinner elements (e.g., `<span className="loading loading-spinner"></span>`) to prevent screen readers from reading them as redundant or confusing characters.
