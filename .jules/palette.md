## 2024-05-20 - Icon-only Submit Button Accessibility
**Learning:** Icon-only submit buttons (like the `➤` chat send button) require explicit `aria-label` attributes to ensure screen readers convey their action accurately, avoiding confusion over raw icon interpretations.
**Action:** Always verify `type="submit"` buttons containing only icons or unreadable characters implement a descriptive `aria-label`.
