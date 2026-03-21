## 2025-02-28 - ARIA Labels for Icon-Only Buttons
**Learning:** Found a widespread pattern across multiple administrative and dashboard components (`MCPServerManager.tsx`, `EnterpriseManager.tsx`, `Dashboard.tsx`, etc.) where toast notification and alert close buttons used a plain `✕` character without an `aria-label`. This makes it impossible for screen reader users to understand the purpose of these buttons.
**Action:** Always ensure icon-only buttons (`✕`, `⚙️`, etc.) are accompanied by an `aria-label` describing their action (e.g., `aria-label="Close message"`).
