## 2025-03-19 - Parallelize independent API fetch calls in loadOptions

**Learning:** Component initialization sequences often contain sequential API calls that don't depend on each other's responses. Waiting for `botDataProvider.getProviders()`, `botDataProvider.getPersonas()`, and `botDataProvider.getMCPServers()` to finish in parallel before fetching `/api/admin/guard-profiles` adds unnecessary wait time to the total network latency.

**Action:** Ensure all independent data fetching promises are grouped together in a single `Promise.all` invocation at the start of a component's lifecycle data load function.
