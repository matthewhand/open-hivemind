## 2026-05-04 - Optimize MCP Server Enrichment in Admin Routes
**Learning:** Found an $O(N \times M)$ operation in `GET /mcp-servers` endpoints (`mcpServers.ts` and `maintenance.ts`) where `connectedServers.map` was running a `storedMcps.find` internally for enrichment. This pattern of finding within a map loop can be a hidden bottleneck for scaling when both arrays grow.
**Action:** Always refactor nested `.find()` inside `.map()` array operations into a dictionary/Map pre-computation ($O(N+M)$) to ensure predictable and scalable performance across unbounded backend list integrations.
