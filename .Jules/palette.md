## 2025-03-07 - Add ARIA Labels to Icon-Only Buttons
**Learning:** This application heavily utilizes custom DaisyUI wrapper components, often creating `<button>` elements that only contain HeroIcons or Lucide React icons. By default, these icon-only buttons are invisible to screen readers, causing accessibility issues where users cannot determine the button's purpose (e.g., delete, edit, close, expand).
**Action:** When implementing new UI elements or refactoring existing ones, always ensure that any `<button>` lacking visible, descriptive text content includes an `aria-label` attribute describing its function. When a button toggles state (like expanding a section), use `aria-expanded` in conjunction with a dynamic `aria-label`.

## 2025-03-17 - Prevent Input Blur on Inline Button Clicks
**Learning:** When building custom input components with inline action buttons (e.g., clear, undo, or remove tags in `CommaSeparatedInput`) or visibility toggles on password inputs, clicking these buttons naturally causes the input field to lose focus. This interrupts the user's flow, as they may just want to peek at their typed password before continuing to type, and can prematurely trigger `onBlur` events.
**Action:** Always add `onMouseDown={(e) => e.preventDefault()}` to inline buttons inside or adjacent to inputs. This prevents focus from leaving the input field when the button is clicked, retaining the cursor position and ensuring a smooth user experience.

## 2025-03-20 - Add Accessible Loading States to Buttons
**Learning:** Buttons throughout the application often include loading spinners (e.g., from `DaisyUI`) but lack semantic attributes to indicate their busy state to assistive technologies. Additionally, the spinners themselves are not hidden from screen readers, causing unnecessary noise.
**Action:** When a button is in a loading state, add the `aria-busy={true}` attribute to the `<button>`. Furthermore, ensure that any loading spinner elements (like `<span className="loading loading-spinner"></span>`) have `aria-hidden="true"` to prevent screen readers from announcing them as content.
