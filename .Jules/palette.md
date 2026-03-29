## 2025-03-07 - Add ARIA Labels to Icon-Only Buttons
**Learning:** This application heavily utilizes custom DaisyUI wrapper components, often creating `<button>` elements that only contain HeroIcons or Lucide React icons. By default, these icon-only buttons are invisible to screen readers, causing accessibility issues where users cannot determine the button's purpose (e.g., delete, edit, close, expand).
**Action:** When implementing new UI elements or refactoring existing ones, always ensure that any `<button>` lacking visible, descriptive text content includes an `aria-label` attribute describing its function. When a button toggles state (like expanding a section), use `aria-expanded` in conjunction with a dynamic `aria-label`.

## 2025-03-17 - Prevent Input Blur on Inline Button Clicks
**Learning:** When building custom input components with inline action buttons (e.g., clear, undo, or remove tags in `CommaSeparatedInput`), clicking these buttons naturally causes the input field to lose focus. This interrupts the user's flow and can prematurely trigger `onBlur` events.
**Action:** Always add `onMouseDown={(e) => e.preventDefault()}` to inline buttons inside or adjacent to inputs. This prevents focus from leaving the input field when the button is clicked, retaining the cursor position and ensuring a smooth user experience.

## 2025-03-21 - Add ARIA Labels to List Actions
**Learning:** This application renders many lists of entities (e.g., integrations, metrics) with repetitive action buttons like "Configure" or "Test". For screen reader users, hearing "Configure, Test, Configure, Test" without context is confusing.
**Action:** When mapping over lists to render action buttons, always use dynamic `aria-label`s that include the entity's name (e.g., `aria-label={"Configure " + integration.name}`) to provide clear context for screen readers.

## 2024-05-15 - Fixed Form Control Labels in EnterpriseManager Modal
**Learning:** Found that multiple `input` and `select` fields in custom modals (like "Add Integration" and "Add Cloud Provider" in `EnterpriseManager.tsx`) were wrapped in `<label>` elements but lacked proper `id` and `htmlFor` associations, causing screen readers to miss the label text completely.
**Action:** Always ensure that form controls within custom DaisyUI/Tailwind modal dialogs explicitly use `htmlFor` on labels mapped to matching `id` attributes on the input fields, rather than relying on structural nesting, to guarantee robust keyboard and screen-reader accessibility.

## 2024-03-28 - [Modal Action Button Loading State]
**Learning:** In newer versions of the DaisyUI library (v3/v4), the `.loading` utility class on a `.btn` element was deprecated in favor of an explicit `<span className="loading loading-spinner"></span>` element. Older class-only usage results in no visual feedback for async actions.
**Action:** Always use an explicit `<span className="loading loading-spinner" aria-hidden="true"></span>` element inside the button for loading states to ensure compatibility and accessibility.
