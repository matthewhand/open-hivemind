## 2025-02-12 - O(N*M) lookups in frontend hooks

**Learning:** When dealing with multiple related data structures in React hooks (like iterating over server tools and checking their usage against a `recentlyUsed` array), it is a common anti-pattern to call `.find()` or `.includes()` inside loops like `.forEach()` or `.filter()`, resulting in O(N*M) time complexity.

**Action:** Pre-compute `Map` (for lookups by ID) or `Set` (for existence checks) structures outside the iteration block. This reduces time complexity to O(N+M) and prevents unnecessary array traversals on every execution of the hook. This is especially crucial in dependencies of `useMemo` or `useEffect` where performance regressions can trigger cascading re-renders.
