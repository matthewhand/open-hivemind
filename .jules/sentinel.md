## 2026-03-11 - SSRF Prevention in LLM Packages
**Vulnerability:** Multiple LLM provider packages (e.g., openwebui, flowise, openswarm, openai) were vulnerable to Server-Side Request Forgery (SSRF) because they used configured or dynamically generated URLs for `axios` requests without validating if those URLs pointed to private or reserved IP ranges.
**Learning:** Security utilities like `isSafeUrl` must be placed in globally accessible workspace packages (e.g., `@hivemind/shared-types` or a dedicated `utils` package) rather than main `src/` directories so that all child packages can access them without creating dependency cycles or relative import nightmares.
**Prevention:** Always wrap dynamically generated external HTTP requests (via axios, fetch) with `isSafeUrl` validation checks. Enforce this via a custom ESLint rule if possible.
## 2024-03-24 - Replace Insecure Math.random() for ID Generation
**Vulnerability:** Found multiple instances where `Math.random()` and `Date.now()` were combined to generate unique identifiers across various backend services (e.g., `WebSocketService`, `DemoModeService`, `AnomalyDetectionService`).
**Learning:** This is a predictable pattern that can lead to ID collisions and potential enumeration attacks, especially in high-throughput or concurrent systems.
**Prevention:** Use native, cryptographically secure `crypto.randomUUID()` for generating unique identifiers to ensure randomness and collision resistance.
