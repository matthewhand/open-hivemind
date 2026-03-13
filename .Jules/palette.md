## 2026-03-13 - Added ARIA labels to Icon-only Buttons
**Learning:** Icon-only buttons without `aria-label` attributes are invisible to screen readers, making critical actions inaccessible. Ensure that buttons like close notifications ('✕') or visual indicators (like a lock icon) provide context.
**Action:** Always add an `aria-label` string for state-toggling buttons and icon-only buttons indicating purpose.
