## 2024-05-20 - Memoizing list component items
**Learning:** In large grids like the AgentGrid, mapping over an array of agents and rendering `AgentCard` directly without React.memo causes unnecessary re-renders of all cards whenever the parent updates or an unrelated state changes.
**Action:** When a parent component renders a list of children that don't depend on frequent parent state changes, wrap the child components in `React.memo()`. Modern React 18+ types recommend wrapping at the export instead of assigning to `const Component: React.FC = memo(...)`.
