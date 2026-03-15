## 2026-03-11 - SSRF Prevention in LLM Packages
**Vulnerability:** Multiple LLM provider packages (e.g., openwebui, flowise, openswarm, openai) were vulnerable to Server-Side Request Forgery (SSRF) because they used configured or dynamically generated URLs for `axios` requests without validating if those URLs pointed to private or reserved IP ranges.
**Learning:** Security utilities like `isSafeUrl` must be placed in globally accessible workspace packages (e.g., `@hivemind/shared-types` or a dedicated `utils` package) rather than main `src/` directories so that all child packages can access them without creating dependency cycles or relative import nightmares.
**Prevention:** Always wrap dynamically generated external HTTP requests (via axios, fetch) with `isSafeUrl` validation checks. Enforce this via a custom ESLint rule if possible.

## 2026-03-11 - Predictable Random ID Generation
**Vulnerability:** Multiple critical backend services (Audit Logger, Hot Reload Manager, Agent routing) used `Math.random().toString(36)` coupled with `Date.now()` to generate supposedly unique IDs. `Math.random()` is a pseudo-random number generator that is cryptographically insecure and predictable, weakening audit trails and security-sensitive ID contexts.
**Learning:** Using `Math.random()` for any non-trivial ID generation introduces collision risks and predictability. It is completely unsuitable for generating audit log IDs or any identifiers that require non-repudiation guarantees.
**Prevention:** Always use the built-in `crypto.randomUUID()` module for generating robust, cryptographically secure UUIDs in backend Node.js environments. Enforce checks against insecure ID generation patterns using static analysis.
