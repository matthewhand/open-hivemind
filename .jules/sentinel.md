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
## 2025-05-18 - Math.random() insecure ID generation
**Vulnerability:** React components/hooks were using `Math.random().toString(36).substr(2, 9)` to generate unique IDs (e.g., for Bot instances and providers). This is cryptographically weak and predictable, which can lead to ID collisions and potential security risks.
**Learning:** `Math.random()` should never be used for ID generation in a secure context. The `uuid` package should be used instead for dynamic client-side generation, and `React.useId()` for stable render IDs.
**Prevention:** Use `v4 as uuidv4` from the `uuid` package to generate random IDs dynamically in frontend hooks and contexts.
