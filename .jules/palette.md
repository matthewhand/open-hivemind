## 2024-05-21 - [Tooltip Custom Component Replacement]
**Learning:** Found that the app uses a custom `DaisyUI/Tooltip` component for rich tooltips, but several key areas (like action buttons in `DashboardBotCard`) were still using the native browser `title` attribute, which causes inconsistent and delayed hover feedback.
**Action:** When working on UX for icon-only buttons in this app, check if they are wrapped in the custom `Tooltip` component instead of relying on the native `title` attribute for better and more consistent accessibility/UX feedback.
