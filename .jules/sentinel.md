## 2025-02-26 - Add SSRF Protection to Outbound Requests

## 2026-03-11 - Predictable Random ID Generation
**Vulnerability:** Multiple critical backend services (Audit Logger, Hot Reload Manager, Agent routing) used `Math.random().toString(36)` coupled with `Date.now()` to generate supposedly unique IDs. `Math.random()` is a pseudo-random number generator that is cryptographically insecure and predictable, weakening audit trails and security-sensitive ID contexts.
**Learning:** Using `Math.random()` for any non-trivial ID generation introduces collision risks and predictability. It is completely unsuitable for generating audit log IDs or any identifiers that require non-repudiation guarantees.
**Prevention:** Always use the built-in `crypto.randomUUID()` module for generating robust, cryptographically secure UUIDs in backend Node.js environments. Enforce checks against insecure ID generation patterns using static analysis.

## 2024-05-24 - Predictable Random ID Generation
**Vulnerability:** Several places in the codebase were using the pattern `Math.random().toString(36).substr(2, 9)` to generate unique identifiers (e.g., in `src/server/routes/agents.ts` for Agent IDs). `Math.random()` generates pseudo-random numbers that are predictable and cryptographically insecure, leading to potential collision risks or predictable ID generation.
**Learning:** `Math.random()` should never be used for backend ID generation, especially in environments where non-repudiation or uniqueness guarantees are important. It is a common source of predictability vulnerabilities.
**Prevention:** Always use the built-in `crypto.randomUUID()` or `crypto.randomBytes(N).toString('hex')` for generating robust, cryptographically secure IDs in Node.js backend environments.
