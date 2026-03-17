## 2025-02-26 - Add SSRF Protection to Outbound Requests

<<<<<<< HEAD
## 2026-03-11 - Predictable Random ID Generation
**Vulnerability:** Multiple critical backend services (Audit Logger, Hot Reload Manager, Agent routing) used `Math.random().toString(36)` coupled with `Date.now()` to generate supposedly unique IDs. `Math.random()` is a pseudo-random number generator that is cryptographically insecure and predictable, weakening audit trails and security-sensitive ID contexts.
**Learning:** Using `Math.random()` for any non-trivial ID generation introduces collision risks and predictability. It is completely unsuitable for generating audit log IDs or any identifiers that require non-repudiation guarantees.
**Prevention:** Always use the built-in `crypto.randomUUID()` module for generating robust, cryptographically secure UUIDs in backend Node.js environments. Enforce checks against insecure ID generation patterns using static analysis.

## 2024-05-24 - Predictable Random ID Generation
**Vulnerability:** Several places in the codebase were using the pattern `Math.random().toString(36).substr(2, 9)` to generate unique identifiers (e.g., in `src/server/routes/agents.ts` for Agent IDs). `Math.random()` generates pseudo-random numbers that are predictable and cryptographically insecure, leading to potential collision risks or predictable ID generation.
**Learning:** `Math.random()` should never be used for backend ID generation, especially in environments where non-repudiation or uniqueness guarantees are important. It is a common source of predictability vulnerabilities.
**Prevention:** Always use the built-in `crypto.randomUUID()` or `crypto.randomBytes(N).toString('hex')` for generating robust, cryptographically secure IDs in Node.js backend environments.
=======
**Vulnerability:** External APIs calls to configurable or dynamic endpoints were made via `axios` without validating the URL, potentially leading to Server-Side Request Forgery (SSRF).
**Learning:** Although primary parameters like `baseUrl` come from server configurations, the absence of verification for out-bound requests exposes the internal network if configuration falls back to external payloads or is manipulated. Defense in depth matters.
**Prevention:** Every outbound request (using `axios` or similar) must validate its target destination by running it through the custom `isSafeUrl` function to check for valid protocols and ensure no routing to private/loopback IPs.
## 2024-03-08 - Path Traversal in File Operations
**Vulnerability:** A path traversal vulnerability existed in `src/server/routes/specs.ts` where unvalidated user inputs (`id` and `version`) were directly passed to `path.join` to determine file system paths for both creating directories/files and reading directories.
**Learning:** `z.string()` in Zod does not protect against directory traversal payloads (like `../`). It strictly validates type, not content semantics. Furthermore, constructing file paths from user inputs without subsequent `path.resolve` boundary verification breaks defense-in-depth, allowing an attacker to escape the intended directory.
**Prevention:**
1. Always apply strict regex patterns (e.g., `/^[a-zA-Z0-9_-]+$/`) to any user input that will be used as a filename or path segment.
2. After constructing a path with `path.join`, always resolve it and verify it starts with the resolved expected base directory (`resolvedPath.startsWith(resolvedBase + path.sep)`).
## 2025-03-09 - Client-Level SSRF Bypass via Axios Redirects and Method Invocation
**Vulnerability:** A static SSRF check at initialization or within a `connect` method is insufficient for Axios clients configured with a user-supplied server URL. Attackers can bypass the check by invoking other API methods directly or by providing an external domain that redirects to an internal/loopback IP address.
**Learning:** Checking the base URL only covers the first request's initial destination. Because Axios automatically follows redirects (up to 5 by default), subsequent hops can route to unsafe internal network locations.
**Prevention:** Rather than checking the base URL statically, implement an Axios request interceptor (`axios.interceptors.request.use()`) that intercepts every outbound request, constructs the full URL (`reqConfig.baseURL + reqConfig.url`), and validates it against `isSafeUrl()`. This guarantees all API interactions are protected, including redirect flows and direct method invocations.
>>>>>>> origin/jules-responsive-layout-consistency-5760872167389438897
