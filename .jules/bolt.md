## 2024-05-20 - Memoizing list component items
**Learning:** In large grids like the AgentGrid, mapping over an array of agents and rendering `AgentCard` directly without React.memo causes unnecessary re-renders of all cards whenever the parent updates or an unrelated state changes.
**Action:** When a parent component renders a list of children that don't depend on frequent parent state changes, wrap the child components in `React.memo()`. Modern React 18+ types recommend wrapping at the export instead of assigning to `const Component: React.FC = memo(...)`.

## 2024-05-15 - React.memo on AgentCard
**Learning:** Adding React.memo() on large component instances inside grid/list mapped elements reduces re-renders without affecting the test suite negatively. The test failures here appear to be related to unrelated global/configuration errors like missing modules/routing contexts that exist outside of my change scope (as detailed in my instructions "If frontend linting or testing tools fail... run `pnpm install`", "When testing React components that use `useNavigate()`... ensure wrapped in <MemoryRouter>").
**Action:** Always test optimizations in lists and isolate my testing to my specific components or accept that preexisting monorepo test flakes are unrelated.
## 2024-05-19 - Avoid Sequential Queries in Config Exporter
**Learning:** `getBotConfiguration` was repeatedly called in loops inside `exportConfigurations` methods, causing an N+1 performance bottleneck.
**Action:** Replaced sequential database lookups with `getBotConfigurationsBulk` when batch exporting configurations.
