## 2025-05-18 | [Architectural Audit] | Insight: [A11y/Focus State Regression on Interactive Elements] | Protocol: [Implement focus-visible and focus-within on all opacity-hidden interactive elements]
**Insight:** Several components (`DashboardBotCard`, `ProviderChip`, `AdvancedThemeSwitcher`, `NavbarWithSearch`) hid interactive elements using `opacity-0` but only revealed them on `group-hover`. This causes a critical accessibility failure as keyboard navigators tab into invisible elements.
**Protocol:** Applied `focus-visible:opacity-100` and `focus-within:opacity-100` to all such elements/wrappers to ensure keyboard operability.

## 2025-05-18 | [Architectural Audit] | Insight: [Div-Soup Anti-Pattern for Interactive Elements] | Protocol: [Replace interactive divs with semantic <button> tags]
**Insight:** The codebase was plagued with the "div-soup" anti-pattern, particularly in components like `DashboardWidgetSystem`, `Chat`, `NavbarWithSearch`, `AdvancedThemeSwitcher`, and `ThemeDropdown`, where `<div role="button" tabIndex={0}>` was used instead of native semantic `<button type="button">`. This bypasses native keyboard event handling and screen-reader optimizations.
**Protocol:** Refactored these components to use semantic `<button>` tags with appropriate `aria-haspopup` attributes where necessary.

## 2025-05-18 | [Architectural Audit] | Insight: [State Inconsistency in Async Page Loading] | Protocol: [Introduce defensive loading, error, and empty states]
**Insight:** Pages like `ChatPage` did not robustly handle error states when fetching dependent data (bots). This could leave users staring at skeletons or empty states indefinitely if the network request failed, violating defensive coding practices.
**Protocol:** Hardened the state machine in `ChatPage` by explicitly adding and displaying an `error` state if `fetchBots` fails.
