## 2024-03-08 - Path Traversal in File Operations
**Vulnerability:** A path traversal vulnerability existed in `src/server/routes/specs.ts` where unvalidated user inputs (`id` and `version`) were directly passed to `path.join` to determine file system paths for both creating directories/files and reading directories.
**Learning:** `z.string()` in Zod does not protect against directory traversal payloads (like `../`). It strictly validates type, not content semantics. Furthermore, constructing file paths from user inputs without subsequent `path.resolve` boundary verification breaks defense-in-depth, allowing an attacker to escape the intended directory.
**Prevention:**
1. Always apply strict regex patterns (e.g., `/^[a-zA-Z0-9_-]+$/`) to any user input that will be used as a filename or path segment.
2. After constructing a path with `path.join`, always resolve it and verify it starts with the resolved expected base directory (`resolvedPath.startsWith(resolvedBase + path.sep)`).
## 2025-02-26 - Add SSRF Protection to Outbound Requests
**Vulnerability:** External APIs calls to configurable or dynamic endpoints were made via `axios` without validating the URL, potentially leading to Server-Side Request Forgery (SSRF).
**Learning:** Although primary parameters like `baseUrl` come from server configurations, the absence of verification for out-bound requests exposes the internal network if configuration falls back to external payloads or is manipulated. Defense in depth matters.
**Prevention:** Every outbound request (using `axios` or similar) must validate its target destination by running it through the custom `isSafeUrl` function to check for valid protocols and ensure no routing to private/loopback IPs.
## 2025-03-09 - Client-Level SSRF Bypass via Axios Redirects and Method Invocation
**Vulnerability:** A static SSRF check at initialization or within a `connect` method is insufficient for Axios clients configured with a user-supplied server URL. Attackers can bypass the check by invoking other API methods directly or by providing an external domain that redirects to an internal/loopback IP address.
**Learning:** Checking the base URL only covers the first request's initial destination. Because Axios automatically follows redirects (up to 5 by default), subsequent hops can route to unsafe internal network locations.
**Prevention:** Rather than checking the base URL statically, implement an Axios request interceptor (`axios.interceptors.request.use()`) that intercepts every outbound request, constructs the full URL (`reqConfig.baseURL + reqConfig.url`), and validates it against `isSafeUrl()`. This guarantees all API interactions are protected, including redirect flows and direct method invocations.
## 2025-03-10 - Missing SSRF Guard in Axios Instantiation
**Vulnerability:** The `MattermostClient` created an Axios instance with a user-provided `serverUrl` without using the existing `isSafeUrl` protection guard.
**Learning:** The rest of the codebase has a standard pattern of wrapping out-bound API calls with `isSafeUrl` from `@src/utils/ssrfGuard`. A newly introduced client or one missed during a previous audit can expose the server to SSRF if the configuration is altered.
**Prevention:** Apply the `isSafeUrl` verification check during the initial connection or before making HTTP calls with configured URLs.
## 2026-03-11 - SSRF Prevention in LLM Packages
**Vulnerability:** Multiple LLM provider packages (e.g., openwebui, flowise, openswarm, openai) were vulnerable to Server-Side Request Forgery (SSRF) because they used configured or dynamically generated URLs for `axios` requests without validating if those URLs pointed to private or reserved IP ranges.
**Learning:** Security utilities like `isSafeUrl` must be placed in globally accessible workspace packages (e.g., `@hivemind/shared-types` or a dedicated `utils` package) rather than main `src/` directories so that all child packages can access them without creating dependency cycles or relative import nightmares.
**Prevention:** Always wrap dynamically generated external HTTP requests (via axios, fetch) with `isSafeUrl` validation checks. Enforce this via a custom ESLint rule if possible.
## 2025-03-12 - Missing Rate Limiting on Authentication Endpoints
**Vulnerability:** The application's core authentication endpoints (`/login`, `/register`, `/refresh`) were protected only by global API rate limits, exposing them to brute-force and credential-stuffing attacks.
**Learning:** Global rate limits (e.g., 100 requests per 15 minutes) are too permissive for high-sensitivity endpoints like authentication. Dedicated stricter limiters (e.g., `authLimiter` allowing 5 requests per minute) must be explicitly applied at the route level.
**Prevention:** Always apply stricter, endpoint-specific rate limiters (`authLimiter`) to routes handling authentication, credential verification, and token regeneration before any complex validation or database logic is executed.