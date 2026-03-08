## 2025-02-26 - Add SSRF Protection to Outbound Requests

**Vulnerability:** External APIs calls to configurable or dynamic endpoints were made via `axios` without validating the URL, potentially leading to Server-Side Request Forgery (SSRF).
**Learning:** Although primary parameters like `baseUrl` come from server configurations, the absence of verification for out-bound requests exposes the internal network if configuration falls back to external payloads or is manipulated. Defense in depth matters.
**Prevention:** Every outbound request (using `axios` or similar) must validate its target destination by running it through the custom `isSafeUrl` function to check for valid protocols and ensure no routing to private/loopback IPs.
## 2024-03-08 - Path Traversal in File Operations
**Vulnerability:** A path traversal vulnerability existed in `src/server/routes/specs.ts` where unvalidated user inputs (`id` and `version`) were directly passed to `path.join` to determine file system paths for both creating directories/files and reading directories.
**Learning:** `z.string()` in Zod does not protect against directory traversal payloads (like `../`). It strictly validates type, not content semantics. Furthermore, constructing file paths from user inputs without subsequent `path.resolve` boundary verification breaks defense-in-depth, allowing an attacker to escape the intended directory.
**Prevention:**
1. Always apply strict regex patterns (e.g., `/^[a-zA-Z0-9_-]+$/`) to any user input that will be used as a filename or path segment.
2. After constructing a path with `path.join`, always resolve it and verify it starts with the resolved expected base directory (`resolvedPath.startsWith(resolvedBase + path.sep)`).

## 2026-03-08 - Letta API Proxy SSRF Vulnerability
**Vulnerability:** The Letta API proxy routes (`/agents` and `/agents/:id`) directly passed an external, unvalidated `apiUrl` provided via user input (query param or header) to `axios.get`.
**Learning:** This constitutes a critical Server-Side Request Forgery (SSRF) vulnerability, allowing an attacker to force the backend server to make requests to internal or protected endpoints on the network. The existing `isSafeUrl` guard was omitted in this new endpoint.
**Prevention:** Always wrap arbitrary external URL inputs bound for backend HTTP clients in the project's SSRF protection mechanism (`isSafeUrl`) before performing the request.
