## $(date +%Y-%m-%d) | Architectural Audit | Insight: "Div-soup" and StopPropagation Anti-patterns | Protocol: Implement semantic layouts and robust state machines

**Insight:**
- The codebase suffered from "div-soup" in cards (`BotConfigCard`, `MCPServerCard`, `PersonaList`), which hurt screen-reader structure.
- `stopPropagation` was improperly attached to non-interactive generic `<div>` wrapper elements instead of the distinct `<button>` instances, which is an accessibility anti-pattern.
- Asynchronous connection tests relied on simple boolean `isTesting` flags rather than explicit state machines, risking race conditions.
- `DetailDrawer` lacked proper implementation of `useFocusTrap`, reducing keyboard accessibility for master-detail views.

**Protocol:**
- **Semantic Data Representation:** Use `<article>` for cards, and structural `<dl>`, `<dt>`, `<dd>` elements for key-value pair grids. Convert mapped elements to `<ul>` and `<li>`.
- **Event Propagation:** Remove `e.stopPropagation()` from container `div`s. It must exist solely on the interactive trigger elements (e.g. `<Button>`).
- **Defensive States:** Replace boolean test loading variables with deterministic `'idle' | 'testing' | 'success' | 'error'` state unions for connection testing and asynchronous feedback actions to enforce strict UI responses.
- **Focus Management:** Standardize `useFocusTrap(isOpen, containerRef, closeBtnRef)` on all overlay instances to trap Tab sequences correctly within active panels.
